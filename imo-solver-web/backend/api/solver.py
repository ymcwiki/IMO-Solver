"""
求解器API路由
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
import json
import logging

from core.solver_manager import SolverManager

logger = logging.getLogger(__name__)

router = APIRouter()

# 全局求解管理器实例（应该从main.py导入）
solver_manager = SolverManager()

class SolveRequest(BaseModel):
    """求解请求模型"""
    problem_statement: str = Field(..., description="问题陈述")
    num_agents: int = Field(10, ge=1, le=50, description="代理数量")
    model: str = Field("claude-3.5-sonnet", description="使用的模型")
    api_key: str = Field(..., description="OpenRouter API密钥")
    other_prompts: List[str] = Field(default_factory=list, description="额外提示词")
    timeout: Optional[int] = Field(None, ge=60, le=3600, description="超时时间（秒）")
    max_iterations: int = Field(30, ge=1, le=100, description="最大迭代次数")
    client_id: str = Field(..., description="WebSocket客户端ID")

class SolveResponse(BaseModel):
    """求解响应模型"""
    task_id: str
    message: str
    status: str

@router.post("/solve", response_model=SolveResponse)
async def start_solve(request: SolveRequest, background_tasks: BackgroundTasks):
    """
    启动求解任务
    """
    try:
        # 生成任务ID
        task_id = str(uuid.uuid4())
        
        # 创建求解任务
        task = await solver_manager.create_task(
            task_id=task_id,
            problem_statement=request.problem_statement,
            num_agents=request.num_agents,
            model=request.model,
            api_key=request.api_key,
            other_prompts=request.other_prompts,
            timeout=request.timeout,
            max_iterations=request.max_iterations
        )
        
        # 注册WebSocket回调（如果提供了client_id）
        if request.client_id:
            from websocket.connection_manager import manager
            
            # 创建WebSocket回调函数
            async def websocket_callback(message):
                # 发送消息到特定客户端
                logger.info(f"Sending WebSocket message to {request.client_id}: {message.get('type')}")
                await manager.send_personal_message(
                    json.dumps(message),
                    request.client_id
                )
            
            # 注册回调
            solver_manager.register_websocket_callback(task_id, websocket_callback)
        
        # 在后台运行任务
        background_tasks.add_task(solver_manager.run_task, task_id)
        
        logger.info(f"Started solve task {task_id}")
        
        return SolveResponse(
            task_id=task_id,
            message=f"Started solving with {request.num_agents} agents",
            status="started"
        )
        
    except Exception as e:
        logger.error(f"Error starting solve task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}/status")
async def get_task_status(task_id: str):
    """
    获取任务状态
    """
    status = solver_manager.get_task_status(task_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return status

@router.get("/task/{task_id}/solution")
async def get_task_solution(task_id: str):
    """
    获取任务的解决方案
    """
    if task_id not in solver_manager.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = solver_manager.tasks[task_id]
    if not task.solution_found:
        return {"solution_found": False, "message": "No solution found yet"}
    
    return {
        "solution_found": True,
        "solution_agent_id": task.solution_agent_id,
        "solution": task.solution,
        "execution_time": task.end_time - task.start_time if task.end_time > 0 else None
    }

@router.post("/task/{task_id}/cancel")
async def cancel_task(task_id: str):
    """
    取消任务
    """
    # TODO: 实现任务取消逻辑
    return {"message": "Task cancellation not yet implemented"}

@router.get("/tasks")
async def list_tasks():
    """
    列出所有任务
    """
    tasks = []
    for task_id in solver_manager.tasks:
        status = solver_manager.get_task_status(task_id)
        if status:
            tasks.append(status)
    return {"tasks": tasks}

@router.delete("/task/{task_id}")
async def delete_task(task_id: str):
    """
    删除任务数据
    """
    if task_id not in solver_manager.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task_id in solver_manager.running_tasks:
        raise HTTPException(status_code=400, detail="Cannot delete running task")
    
    solver_manager.cleanup_task(task_id)
    return {"message": f"Task {task_id} deleted"}

@router.get("/models")
async def get_available_models():
    """
    获取可用的模型列表
    """
    from core.openrouter_adapter import MODEL_CONFIGS
    
    models = []
    for model_name, config in MODEL_CONFIGS.items():
        models.append({
            "name": model_name,
            "provider": config.provider,
            "max_tokens": config.max_tokens,
            "supports_thinking": config.supports_thinking
        })
    
    return {"models": models}