"""
求解管理器，管理多个IMO代理的并行执行
"""
import asyncio
import json
import time
import os
from datetime import datetime
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
import logging

from .imo_agent import IMOAgent, AgentStatus
from .openrouter_adapter import OpenRouterAdapter

logger = logging.getLogger(__name__)

@dataclass
class SolverTask:
    """求解任务"""
    task_id: str
    problem_statement: str
    num_agents: int
    model: str
    api_key: str
    other_prompts: List[str] = field(default_factory=list)
    timeout: Optional[int] = None
    max_iterations: int = 30
    agents: Dict[int, IMOAgent] = field(default_factory=dict)
    start_time: float = 0
    end_time: float = 0
    solution_found: bool = False
    solution_agent_id: Optional[int] = None
    solution: Optional[str] = None

class SolverManager:
    """求解管理器"""
    
    def __init__(self):
        self.tasks: Dict[str, SolverTask] = {}
        self.running_tasks: set = set()
        self.completed_tasks: set = set()
        self.websocket_callbacks: Dict[str, Callable] = {}
    
    def register_websocket_callback(self, client_id: str, callback: Callable):
        """注册WebSocket回调函数"""
        self.websocket_callbacks[client_id] = callback
    
    def unregister_websocket_callback(self, client_id: str):
        """注销WebSocket回调函数"""
        if client_id in self.websocket_callbacks:
            del self.websocket_callbacks[client_id]
    
    async def create_task(
        self,
        task_id: str,
        problem_statement: str,
        num_agents: int,
        model: str,
        api_key: str,
        other_prompts: List[str] = None,
        timeout: int = None,
        max_iterations: int = 30
    ) -> SolverTask:
        """创建新的求解任务"""
        task = SolverTask(
            task_id=task_id,
            problem_statement=problem_statement,
            num_agents=num_agents,
            model=model,
            api_key=api_key,
            other_prompts=other_prompts or [],
            timeout=timeout,
            max_iterations=max_iterations
        )
        
        self.tasks[task_id] = task
        logger.info(f"Created task {task_id} with {num_agents} agents using model {model}")
        
        return task
    
    async def agent_websocket_callback(self, task_id: str, message: Dict):
        """代理的WebSocket回调"""
        if task_id in self.websocket_callbacks:
            callback = self.websocket_callbacks[task_id]
            await callback(message)
    
    async def run_single_agent(
        self,
        task: SolverTask,
        agent_id: int,
        websocket_callback: Optional[Callable] = None
    ) -> Optional[str]:
        """运行单个代理"""
        try:
            # 创建API适配器
            api_adapter = OpenRouterAdapter(
                api_key=task.api_key,
                model=task.model
            )
            
            # 创建代理
            agent = IMOAgent(
                agent_id=agent_id,
                api_adapter=api_adapter,
                websocket_callback=websocket_callback
            )
            
            task.agents[agent_id] = agent
            
            # 运行求解
            logger.info(f"Starting agent {agent_id} for task {task.task_id}")
            
            if task.timeout:
                # 带超时运行
                solution = await asyncio.wait_for(
                    agent.solve(
                        problem_statement=task.problem_statement,
                        other_prompts=task.other_prompts,
                        max_iterations=task.max_iterations
                    ),
                    timeout=task.timeout
                )
            else:
                # 无超时运行
                solution = await agent.solve(
                    problem_statement=task.problem_statement,
                    other_prompts=task.other_prompts,
                    max_iterations=task.max_iterations
                )
            
            if solution:
                logger.info(f"Agent {agent_id} found a solution for task {task.task_id}")
                return solution
            else:
                logger.info(f"Agent {agent_id} failed to find a solution for task {task.task_id}")
                return None
                
        except asyncio.TimeoutError:
            logger.warning(f"Agent {agent_id} timed out for task {task.task_id}")
            if websocket_callback:
                await websocket_callback({
                    "type": "agent_update",
                    "agent_id": agent_id,
                    "status": "failed",
                    "data": {"error": "Timeout"}
                })
            return None
        except Exception as e:
            logger.error(f"Agent {agent_id} error for task {task.task_id}: {e}")
            if websocket_callback:
                await websocket_callback({
                    "type": "agent_update",
                    "agent_id": agent_id,
                    "status": "failed",
                    "data": {"error": str(e)}
                })
            return None
    
    async def run_task(self, task_id: str) -> Dict:
        """运行求解任务"""
        if task_id not in self.tasks:
            raise ValueError(f"Task {task_id} not found")
        
        task = self.tasks[task_id]
        task.start_time = time.time()
        self.running_tasks.add(task_id)
        
        logger.info(f"Starting task {task_id} with {task.num_agents} agents")
        
        # 创建WebSocket回调
        async def task_websocket_callback(message):
            await self.agent_websocket_callback(task_id, message)
        
        # 创建所有代理任务
        agent_tasks = []
        for agent_id in range(task.num_agents):
            agent_task = asyncio.create_task(
                self.run_single_agent(
                    task=task,
                    agent_id=agent_id,
                    websocket_callback=task_websocket_callback if task_id in self.websocket_callbacks else None
                )
            )
            agent_tasks.append((agent_id, agent_task))
        
        # 等待所有代理完成或找到解答
        completed_agents = []
        successful_agents = []
        failed_agents = []
        
        try:
            # 使用 as_completed 来处理先完成的任务
            for agent_id, agent_task in agent_tasks:
                try:
                    solution = await agent_task
                    completed_agents.append(agent_id)
                    
                    if solution:
                        successful_agents.append(agent_id)
                        if not task.solution_found:
                            task.solution_found = True
                            task.solution_agent_id = agent_id
                            task.solution = solution
                            
                            # 保存解决方案到文件
                            await self.save_solution_to_file(task_id, agent_id, solution)
                            
                            # 通知找到解答
                            if task_id in self.websocket_callbacks:
                                await self.agent_websocket_callback(task_id, {
                                    "type": "solution_found",
                                    "agent_id": agent_id,
                                    "solution": solution
                                })
                    else:
                        failed_agents.append(agent_id)
                        
                except Exception as e:
                    logger.error(f"Agent {agent_id} failed: {e}")
                    failed_agents.append(agent_id)
                    completed_agents.append(agent_id)
        
        finally:
            # 确保所有任务都被取消（如果还在运行）
            for agent_id, agent_task in agent_tasks:
                if not agent_task.done():
                    agent_task.cancel()
        
        task.end_time = time.time()
        self.running_tasks.discard(task_id)
        self.completed_tasks.add(task_id)
        
        # 计算统计信息
        stats = {
            "task_id": task_id,
            "total_agents": task.num_agents,
            "completed_agents": len(completed_agents),
            "successful_agents": len(successful_agents),
            "failed_agents": len(failed_agents),
            "solution_found": task.solution_found,
            "solution_agent_id": task.solution_agent_id,
            "execution_time": task.end_time - task.start_time,
            "success_rate": len(successful_agents) / task.num_agents * 100 if task.num_agents > 0 else 0
        }
        
        # 发送任务完成通知
        if task_id in self.websocket_callbacks:
            await self.agent_websocket_callback(task_id, {
                "type": "task_complete",
                "stats": stats
            })
        
        logger.info(f"Task {task_id} completed. Stats: {json.dumps(stats)}")
        
        return stats
    
    def get_task_status(self, task_id: str) -> Optional[Dict]:
        """获取任务状态"""
        if task_id not in self.tasks:
            return None
        
        task = self.tasks[task_id]
        
        # 收集代理状态
        agents_status = []
        for agent_id, agent in task.agents.items():
            agents_status.append({
                "agent_id": agent_id,
                "status": agent.state.status.value,
                "current_step": agent.state.current_step,
                "iteration": agent.state.iteration,
                "correct_count": agent.state.correct_count,
                "error_count": agent.state.error_count
            })
        
        return {
            "task_id": task_id,
            "status": "running" if task_id in self.running_tasks else "completed" if task_id in self.completed_tasks else "pending",
            "num_agents": task.num_agents,
            "model": task.model,
            "solution_found": task.solution_found,
            "solution_agent_id": task.solution_agent_id,
            "agents": agents_status,
            "start_time": task.start_time,
            "elapsed_time": time.time() - task.start_time if task.start_time > 0 else 0
        }
    
    def get_running_agents_count(self) -> int:
        """获取正在运行的代理数量"""
        count = 0
        for task_id in self.running_tasks:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                for agent in task.agents.values():
                    if agent.state.status == AgentStatus.RUNNING:
                        count += 1
        return count
    
    def get_completed_tasks_count(self) -> int:
        """获取已完成的任务数量"""
        return len(self.completed_tasks)
    
    async def save_solution_to_file(self, task_id: str, agent_id: int, solution: str):
        """保存解决方案到文件"""
        try:
            # 创建solutions目录（如果不存在）
            solutions_dir = "solutions"
            os.makedirs(solutions_dir, exist_ok=True)
            
            # 生成文件名：task_id_agent_id_timestamp.txt
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{solutions_dir}/solution_{task_id[:8]}_agent{agent_id}_{timestamp}.txt"
            
            # 保存解决方案
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"Task ID: {task_id}\n")
                f.write(f"Agent ID: {agent_id}\n")
                f.write(f"Timestamp: {datetime.now().isoformat()}\n")
                f.write("="*60 + "\n\n")
                f.write(solution)
            
            logger.info(f"Solution saved to {filename}")
            
            # 同时保存一个latest.txt文件，方便查看最新的解答
            latest_filename = f"{solutions_dir}/latest_solution.txt"
            with open(latest_filename, 'w', encoding='utf-8') as f:
                f.write(f"Task ID: {task_id}\n")
                f.write(f"Agent ID: {agent_id}\n")
                f.write(f"Timestamp: {datetime.now().isoformat()}\n")
                f.write(f"File: {filename}\n")
                f.write("="*60 + "\n\n")
                f.write(solution)
            
            logger.info(f"Latest solution saved to {latest_filename}")
            
        except Exception as e:
            logger.error(f"Failed to save solution to file: {e}")
    
    def cleanup_task(self, task_id: str):
        """清理任务数据"""
        if task_id in self.tasks:
            del self.tasks[task_id]
        self.running_tasks.discard(task_id)
        self.completed_tasks.discard(task_id)
        if task_id in self.websocket_callbacks:
            del self.websocket_callbacks[task_id]