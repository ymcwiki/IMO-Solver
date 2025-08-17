"""
配置API路由
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Optional
import os
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# 配置文件路径
CONFIG_FILE = "config.json"

class ConfigModel(BaseModel):
    """配置模型"""
    default_model: str = Field("claude-3.5-sonnet", description="默认模型")
    default_num_agents: int = Field(10, description="默认代理数量")
    default_timeout: Optional[int] = Field(None, description="默认超时时间")
    default_max_iterations: int = Field(30, description="默认最大迭代次数")
    api_key_hint: Optional[str] = Field(None, description="API密钥提示（仅显示前后几位）")

def load_config() -> Dict:
    """加载配置"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading config: {e}")
    return {}

def save_config(config: Dict):
    """保存配置"""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving config: {e}")
        raise

@router.get("/", response_model=ConfigModel)
async def get_config():
    """获取配置"""
    config = load_config()
    
    # 如果有API密钥，只显示提示
    if "api_key" in config and config["api_key"]:
        key = config["api_key"]
        if len(key) > 8:
            config["api_key_hint"] = f"{key[:4]}...{key[-4:]}"
    
    return ConfigModel(**config)

@router.put("/")
async def update_config(config: ConfigModel):
    """更新配置"""
    try:
        config_dict = config.dict(exclude_none=True)
        
        # 不保存API密钥提示
        if "api_key_hint" in config_dict:
            del config_dict["api_key_hint"]
        
        save_config(config_dict)
        return {"message": "Configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-api-key")
async def validate_api_key(api_key: str, model: str = "openai/gpt-3.5-turbo"):
    """
    验证API密钥是否有效
    """
    from core.openrouter_adapter import OpenRouterAdapter
    
    try:
        adapter = OpenRouterAdapter(api_key=api_key, model=model)
        
        # 尝试一个简单的API调用
        response = adapter.call_api(
            system_prompt="You are a helpful assistant.",
            user_prompt="Say 'Hello' in one word.",
            max_tokens=10
        )
        
        if response:
            return {"valid": True, "message": "API key is valid"}
        else:
            return {"valid": False, "message": "API key validation failed"}
            
    except Exception as e:
        logger.error(f"API key validation error: {e}")
        return {"valid": False, "message": str(e)}

@router.get("/sample-problems")
async def get_sample_problems():
    """获取示例问题"""
    samples = [
        {
            "title": "IMO 2025 Problem 1",
            "problem": """A line in the plane is called *sunny* if it is not parallel to any of the $x$-axis, the $y$-axis, and the line $x+y=0$.

Let $n\\ge3$ be a given integer. Determine all nonnegative integers $k$ such that there exist $n$ distinct lines in the plane satisfying both the following:
*   for all positive integers $a$ and $b$ with $a+b\\le n+1$, the point $(a,b)$ is on at least one of the lines; and
*   exactly $k$ of the lines are sunny."""
        },
        {
            "title": "Simple Algebra Problem",
            "problem": "Find all real numbers $x$ such that $x^2 - 5x + 6 = 0$."
        },
        {
            "title": "Number Theory Problem",
            "problem": "Prove that for any positive integer $n$, the number $n^2 + n$ is always even."
        }
    ]
    
    return {"samples": samples}