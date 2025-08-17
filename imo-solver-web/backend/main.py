"""
FastAPI主应用文件
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import asyncio
import logging
from typing import Dict, List
import uvicorn

from api.solver import router as solver_router
from api.config import router as config_router
from websocket.connection_manager import manager
from core.solver_manager import SolverManager

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 全局求解器管理器
solver_manager = SolverManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    logger.info("Starting IMO Solver Web Service...")
    yield
    # 关闭时执行
    logger.info("Shutting down IMO Solver Web Service...")
    await manager.disconnect_all()

# 创建FastAPI应用
app = FastAPI(
    title="IMO Solver Web API",
    description="Web interface for IMO problem solving with visualization",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(solver_router, prefix="/api/solver", tags=["solver"])
app.include_router(config_router, prefix="/api/config", tags=["config"])

# WebSocket端点
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket连接端点，用于实时更新"""
    await manager.connect(websocket, client_id)
    try:
        while True:
            # 保持连接活跃
            data = await websocket.receive_text()
            
            # 处理来自客户端的消息
            if data == "ping":
                await manager.send_personal_message("pong", client_id)
            else:
                # 处理其他消息类型
                logger.info(f"Received message from {client_id}: {data}")
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
        manager.disconnect(client_id)

# 健康检查端点
@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "IMO Solver Web API",
        "active_connections": len(manager.active_connections)
    }

# 获取当前运行状态
@app.get("/api/status")
async def get_status():
    """获取系统状态"""
    return {
        "running_agents": solver_manager.get_running_agents_count(),
        "completed_tasks": solver_manager.get_completed_tasks_count(),
        "active_connections": len(manager.active_connections)
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )