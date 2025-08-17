"""
WebSocket连接管理器
"""
from typing import Dict, List
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        # 存储活跃的WebSocket连接
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """接受新的WebSocket连接"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")
        
        # 发送连接成功消息
        await self.send_personal_message(
            json.dumps({
                "type": "connection",
                "status": "connected",
                "client_id": client_id
            }),
            client_id
        )
    
    def disconnect(self, client_id: str):
        """断开WebSocket连接"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected. Remaining connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, client_id: str):
        """向特定客户端发送消息"""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast(self, message: str, exclude: List[str] = None):
        """向所有连接的客户端广播消息"""
        if exclude is None:
            exclude = []
        
        disconnected_clients = []
        for client_id, websocket in self.active_connections.items():
            if client_id not in exclude:
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {client_id}: {e}")
                    disconnected_clients.append(client_id)
        
        # 清理断开的连接
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    async def send_agent_update(self, client_id: str, agent_id: int, status: str, data: dict = None):
        """发送代理状态更新"""
        message = {
            "type": "agent_update",
            "agent_id": agent_id,
            "status": status,
            "data": data or {}
        }
        await self.send_personal_message(json.dumps(message), client_id)
    
    async def send_log(self, client_id: str, agent_id: int, level: str, message: str):
        """发送日志消息"""
        log_message = {
            "type": "log",
            "agent_id": agent_id,
            "level": level,
            "message": message,
            "timestamp": None  # 将在前端添加时间戳
        }
        await self.send_personal_message(json.dumps(log_message), client_id)
    
    async def send_solution_found(self, client_id: str, agent_id: int, solution: str):
        """发送找到解答的通知"""
        message = {
            "type": "solution_found",
            "agent_id": agent_id,
            "solution": solution
        }
        await self.send_personal_message(json.dumps(message), client_id)
    
    async def send_task_complete(self, client_id: str, stats: dict):
        """发送任务完成通知"""
        message = {
            "type": "task_complete",
            "stats": stats
        }
        await self.send_personal_message(json.dumps(message), client_id)
    
    async def disconnect_all(self):
        """断开所有连接"""
        for client_id in list(self.active_connections.keys()):
            await self.send_personal_message(
                json.dumps({"type": "server_shutdown"}),
                client_id
            )
            self.disconnect(client_id)

# 创建全局管理器实例
manager = ConnectionManager()