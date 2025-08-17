"""
IMO问题求解代理（支持OpenRouter和WebSocket更新）
基于原agent.py改造
"""
import asyncio
import json
import logging
from typing import Optional, Dict, List, Callable
from dataclasses import dataclass, field
from enum import Enum

from .openrouter_adapter import OpenRouterAdapter
from .prompts import (
    STEP1_PROMPT,
    SELF_IMPROVEMENT_PROMPT,
    CORRECTION_PROMPT,
    VERIFICATION_SYSTEM_PROMPT,
    VERIFICATION_REMINDER
)

logger = logging.getLogger(__name__)

class AgentStatus(Enum):
    """代理状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    VERIFYING = "verifying"
    SUCCESS = "success"
    FAILED = "failed"

@dataclass
class AgentState:
    """代理状态"""
    agent_id: int
    status: AgentStatus = AgentStatus.PENDING
    current_step: str = ""
    iteration: int = 0
    correct_count: int = 0
    error_count: int = 0
    solution: Optional[str] = None
    logs: List[Dict] = field(default_factory=list)
    start_time: float = 0
    end_time: float = 0

class IMOAgent:
    """IMO问题求解代理"""
    
    def __init__(
        self,
        agent_id: int,
        api_adapter: OpenRouterAdapter,
        websocket_callback: Optional[Callable] = None
    ):
        self.agent_id = agent_id
        self.api = api_adapter
        self.websocket_callback = websocket_callback
        self.state = AgentState(agent_id=agent_id)
        self.conversation_history = []
    
    async def log(self, level: str, message: str):
        """记录日志并发送WebSocket更新"""
        logger.log(getattr(logging, level.upper()), f"[Agent {self.agent_id}] {message}")
        
        log_entry = {
            "level": level,
            "message": message,
            "timestamp": asyncio.get_event_loop().time()
        }
        self.state.logs.append(log_entry)
        
        if self.websocket_callback:
            await self.websocket_callback({
                "type": "log",
                "agent_id": self.agent_id,
                "level": level,
                "message": message
            })
    
    async def update_status(self, status: AgentStatus, current_step: str = ""):
        """更新代理状态"""
        self.state.status = status
        if current_step:
            self.state.current_step = current_step
        
        logger.info(f"[Agent {self.agent_id}] Status update: {status.value}, step: {current_step}, has_callback: {self.websocket_callback is not None}")
        
        if self.websocket_callback:
            await self.websocket_callback({
                "type": "agent_update",
                "agent_id": self.agent_id,
                "status": status.value,
                "data": {
                    "current_step": self.state.current_step,
                    "iteration": self.state.iteration,
                    "correct_count": self.state.correct_count,
                    "error_count": self.state.error_count
                }
            })
    
    def extract_detailed_solution(self, solution: str, marker: str = 'Detailed Solution', after: bool = True) -> str:
        """提取详细解答部分"""
        idx = solution.find(marker)
        if idx == -1:
            return ''
        if after:
            return solution[idx + len(marker):].strip()
        else:
            return solution[:idx].strip()
    
    async def verify_solution(self, problem_statement: str, solution: str) -> tuple:
        """验证解答的正确性"""
        await self.update_status(AgentStatus.VERIFYING, "验证解答正确性")
        await self.log("info", "开始验证解答")
        
        detailed_solution = self.extract_detailed_solution(solution)
        
        verification_prompt = f"""
======================================================================
### Problem ###

{problem_statement}

======================================================================
### Solution ###

{detailed_solution}

{VERIFICATION_REMINDER}
"""
        
        try:
            # 调用API进行验证
            response = self.api.call_api(
                system_prompt=VERIFICATION_SYSTEM_PROMPT,
                user_prompt=verification_prompt
            )
            verification_result = self.api.extract_response_text(response)
            
            await self.log("info", "验证完成，检查结果")
            
            # 检查验证是否通过
            check_prompt = f"""Response in "yes" or "no". Is the following statement saying the solution is correct, or does not contain critical error or a major justification gap?

{verification_result}"""
            
            check_response = self.api.call_api(
                system_prompt="",
                user_prompt=check_prompt
            )
            check_result = self.api.extract_response_text(check_response)
            
            is_correct = "yes" in check_result.lower()
            
            # 提取错误报告
            bug_report = ""
            if not is_correct:
                bug_report = self.extract_detailed_solution(
                    verification_result, 
                    "Detailed Verification", 
                    False
                )
            
            await self.log(
                "info" if is_correct else "warning",
                f"验证结果: {'通过' if is_correct else '未通过'}"
            )
            
            return bug_report, check_result
            
        except Exception as e:
            await self.log("error", f"验证过程出错: {e}")
            return str(e), "no"
    
    async def check_if_solution_complete(self, solution: str) -> bool:
        """检查解答是否声称完整"""
        check_prompt = f"""Is the following text claiming that the solution is complete?
==========================================================

{solution}

==========================================================

Response in exactly "yes" or "no". No other words."""
        
        try:
            response = self.api.call_api(
                system_prompt="",
                user_prompt=check_prompt
            )
            result = self.api.extract_response_text(response)
            return "yes" in result.lower()
        except Exception as e:
            await self.log("error", f"检查完整性出错: {e}")
            return False
    
    async def initial_exploration(self, problem_statement: str, other_prompts: List[str] = None) -> tuple:
        """初始探索阶段"""
        await self.log("info", "开始初始探索")
        
        # 构建初始提示
        user_prompts = [problem_statement]
        if other_prompts:
            user_prompts.extend(other_prompts)
        
        try:
            # 第一次尝试
            await self.update_status(AgentStatus.RUNNING, "生成初始解答")
            response1 = self.api.call_api(
                system_prompt=STEP1_PROMPT,
                user_prompt="\n\n".join(user_prompts)
            )
            output1 = self.api.extract_response_text(response1)
            
            await self.log("info", "初始解答生成完成")
            
            # 自我改进
            await self.update_status(AgentStatus.RUNNING, "自我改进")
            self.conversation_history = [
                {"role": "assistant", "content": output1},
                {"role": "user", "content": SELF_IMPROVEMENT_PROMPT}
            ]
            
            response2 = self.api.call_api(
                system_prompt=STEP1_PROMPT,
                user_prompt=SELF_IMPROVEMENT_PROMPT,
                conversation_history=[{"role": "assistant", "content": output1}]
            )
            solution = self.api.extract_response_text(response2)
            
            await self.log("info", "自我改进完成")
            
            # 检查完整性
            is_complete = await self.check_if_solution_complete(solution)
            if not is_complete:
                await self.log("warning", "解答不完整")
                return None, None, None, None
            
            # 验证解答
            verify, good_verify = await self.verify_solution(problem_statement, solution)
            
            return self.conversation_history, solution, verify, good_verify
            
        except Exception as e:
            await self.log("error", f"初始探索失败: {e}")
            return None, None, None, None
    
    async def solve(self, problem_statement: str, other_prompts: List[str] = None, max_iterations: int = 30) -> Optional[str]:
        """
        主求解函数
        
        Args:
            problem_statement: 问题陈述
            other_prompts: 额外提示词
            max_iterations: 最大迭代次数
        
        Returns:
            解答文本，如果失败则返回None
        """
        self.state.start_time = asyncio.get_event_loop().time()
        await self.update_status(AgentStatus.RUNNING, "开始求解")
        await self.log("info", f"开始求解IMO问题，最大迭代次数: {max_iterations}")
        
        # 初始探索
        history, solution, verify, good_verify = await self.initial_exploration(
            problem_statement, other_prompts
        )
        
        if solution is None:
            await self.log("error", "初始探索失败，未找到完整解答")
            await self.update_status(AgentStatus.FAILED, "初始探索失败")
            self.state.end_time = asyncio.get_event_loop().time()
            return None
        
        # 迭代改进
        for i in range(max_iterations):
            self.state.iteration = i + 1
            await self.log("info", f"迭代 {i+1}/{max_iterations}, 正确次数: {self.state.correct_count}, 错误次数: {self.state.error_count}")
            
            if "yes" not in good_verify.lower():
                # 验证未通过，需要修正
                self.state.correct_count = 0
                self.state.error_count += 1
                
                await self.update_status(AgentStatus.RUNNING, f"修正错误 (迭代 {i+1})")
                await self.log("warning", "验证未通过，开始修正")
                
                # 构建修正提示
                correction_messages = [
                    {"role": "assistant", "content": solution},
                    {"role": "user", "content": f"{CORRECTION_PROMPT}\n\n{verify}"}
                ]
                
                try:
                    response = self.api.call_api(
                        system_prompt=STEP1_PROMPT,
                        user_prompt=f"{CORRECTION_PROMPT}\n\n{verify}",
                        conversation_history=[{"role": "assistant", "content": solution}]
                    )
                    solution = self.api.extract_response_text(response)
                    
                    # 检查完整性
                    is_complete = await self.check_if_solution_complete(solution)
                    if not is_complete:
                        await self.log("warning", "修正后的解答不完整")
                        continue
                    
                except Exception as e:
                    await self.log("error", f"修正过程出错: {e}")
                    continue
            
            # 验证解答
            verify, good_verify = await self.verify_solution(problem_statement, solution)
            
            if "yes" in good_verify.lower():
                self.state.correct_count += 1
                self.state.error_count = 0
                await self.log("info", f"验证通过 ({self.state.correct_count}/5)")
                
                if self.state.correct_count >= 2:  # 降低到2次验证通过即可
                    # 成功找到解答
                    await self.log("info", "成功找到正确解答！")
                    await self.update_status(AgentStatus.SUCCESS, "找到正确解答")
                    self.state.solution = solution
                    self.state.end_time = asyncio.get_event_loop().time()
                    
                    if self.websocket_callback:
                        await self.websocket_callback({
                            "type": "solution_found",
                            "agent_id": self.agent_id,
                            "solution": solution
                        })
                    
                    return solution
            
            # 检查失败条件
            if self.state.error_count >= 10:
                await self.log("error", "连续错误次数过多，停止求解")
                break
        
        # 求解失败
        await self.log("error", "未能找到正确解答")
        await self.update_status(AgentStatus.FAILED, "求解失败")
        self.state.end_time = asyncio.get_event_loop().time()
        return None