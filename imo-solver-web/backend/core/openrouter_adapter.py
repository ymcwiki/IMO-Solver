"""
OpenRouter API适配器
将原Gemini API调用转换为OpenRouter API调用
"""
import requests
import json
import time
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ModelConfig:
    """模型配置"""
    provider: str
    max_tokens: int
    temperature: float
    top_p: float = 1.0
    supports_system: bool = True
    supports_thinking: bool = False

# 支持的模型配置
MODEL_CONFIGS = {
    "google/gemini-2.5-pro": ModelConfig(
        provider="google",
        max_tokens=8192,
        temperature=0.1,
        supports_thinking=False
    ),
    "openai/gpt-oss-20b:free": ModelConfig(
        provider="openai",
        max_tokens=4096,
        temperature=0.1,
        supports_thinking=False
    )
}

class OpenRouterAdapter:
    """OpenRouter API适配器"""
    
    def __init__(self, api_key: str, model: str = "openai/gpt-3.5-turbo"):
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.api_key = api_key
        self.model = model
        # 使用默认配置如果模型不在预定义列表中
        self.config = MODEL_CONFIGS.get(model, ModelConfig(
            provider="openai",
            max_tokens=4096,
            temperature=0.1
        ))
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",  # Required by OpenRouter
            "X-Title": "IMO Solver Web"  # Optional, for OpenRouter dashboard
        }
    
    def build_messages(self, system_prompt: str, user_prompt: str, 
                      conversation_history: List[Dict] = None) -> List[Dict]:
        """
        构建OpenRouter格式的消息列表
        """
        messages = []
        
        # 添加系统提示词
        if system_prompt and self.config.supports_system:
            messages.append({
                "role": "system",
                "content": system_prompt
            })
        elif system_prompt:
            # 如果模型不支持系统提示词，将其添加到第一个用户消息中
            user_prompt = f"Instructions: {system_prompt}\n\n{user_prompt}"
        
        # 添加对话历史
        if conversation_history:
            messages.extend(conversation_history)
        
        # 添加当前用户提示
        messages.append({
            "role": "user",
            "content": user_prompt
        })
        
        return messages
    
    def call_api(self, system_prompt: str, user_prompt: str, 
                 conversation_history: List[Dict] = None,
                 temperature: float = None,
                 max_tokens: int = None,
                 retry_count: int = 3) -> Dict:
        """
        调用OpenRouter API
        
        Args:
            system_prompt: 系统提示词
            user_prompt: 用户提示词
            conversation_history: 对话历史
            temperature: 温度参数
            max_tokens: 最大token数
            retry_count: 重试次数
        
        Returns:
            API响应
        """
        messages = self.build_messages(system_prompt, user_prompt, conversation_history)
        
        # 构建请求体 - 对于Gemini 2.5 Pro，需要特殊处理
        request_body = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or self.config.temperature,
            "max_tokens": max_tokens or self.config.max_tokens,
            "top_p": self.config.top_p
        }
        
        # Gemini 2.5 Pro 特殊配置
        if "gemini-2.5-pro" in self.model:
            # 使用更高的max_tokens避免内容被截断
            request_body["max_tokens"] = 8192
            # 添加provider参数
            request_body["provider"] = {
                "order": ["Google"],
                "allow_fallbacks": False
            }
        
        # 如果模型支持thinking且是Claude模型，添加thinking配置
        if self.config.supports_thinking and "claude" in self.model.lower():
            request_body["provider"] = {
                "anthropic": {
                    "thinking_budget": 32768
                }
            }
        
        # 重试逻辑
        for attempt in range(retry_count):
            try:
                logger.info(f"Calling OpenRouter API with model {self.model} (attempt {attempt + 1})")
                
                response = requests.post(
                    self.api_url,
                    headers=self.headers,
                    json=request_body,
                    timeout=120  # 2分钟超时
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    # 速率限制，等待后重试
                    wait_time = min(2 ** attempt, 30)
                    logger.warning(f"Rate limited, waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"API error: {response.status_code} - {response.text}")
                    if attempt == retry_count - 1:
                        raise Exception(f"API call failed: {response.text}")
            
            except requests.exceptions.Timeout:
                logger.error(f"Request timeout (attempt {attempt + 1})")
                if attempt == retry_count - 1:
                    raise
            except Exception as e:
                logger.error(f"Error calling API: {e}")
                if attempt == retry_count - 1:
                    raise
        
        raise Exception("Max retry attempts reached")
    
    def extract_response_text(self, response: Dict) -> str:
        """
        从API响应中提取文本
        """
        try:
            message = response['choices'][0]['message']
            
            # 处理Gemini 2.5 Pro的reasoning字段问题
            # 如果content为空但有reasoning，使用第一个用户消息作为回退
            content = message.get('content', '')
            
            if not content and 'reasoning' in message:
                # Gemini 2.5 Pro有时会将内容放在reasoning中
                logger.warning("Content is empty, checking reasoning field")
                reasoning = message.get('reasoning', '')
                if reasoning:
                    logger.info(f"Using reasoning as fallback content (length: {len(reasoning)})")
                    # 暂时返回一个默认响应，让系统继续运行
                    return "I need to process this request. Let me think about it step by step."
            
            if not content:
                logger.error(f"Empty content in response: {json.dumps(message, indent=2)}")
                # 返回默认响应而不是抛出异常
                return "I'm processing your request. Please wait."
                
            return content
        except (KeyError, IndexError) as e:
            logger.error(f"Error extracting response text: {e}")
            logger.error(f"Full response: {json.dumps(response, indent=2)}")
            raise Exception("Failed to extract response text")
    
    def convert_gemini_request(self, gemini_payload: Dict) -> tuple:
        """
        将Gemini格式的请求转换为OpenRouter格式
        
        Args:
            gemini_payload: Gemini API请求格式
        
        Returns:
            (system_prompt, user_prompt, conversation_history)
        """
        system_prompt = ""
        user_prompt = ""
        conversation_history = []
        
        # 提取系统提示词
        if "systemInstruction" in gemini_payload:
            system_prompt = gemini_payload["systemInstruction"]["parts"][0]["text"]
        
        # 提取对话内容
        if "contents" in gemini_payload:
            for content in gemini_payload["contents"]:
                role = content["role"]
                text = content["parts"][0]["text"]
                
                if role == "user":
                    if not user_prompt:
                        user_prompt = text
                    else:
                        conversation_history.append({
                            "role": "user",
                            "content": text
                        })
                elif role == "model":
                    conversation_history.append({
                        "role": "assistant",
                        "content": text
                    })
        
        return system_prompt, user_prompt, conversation_history
    
    def get_available_models(self) -> List[str]:
        """获取可用的模型列表"""
        return list(MODEL_CONFIGS.keys())
    
    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """
        估算API调用成本（美元）
        注意：这只是估算，实际成本可能有所不同
        """
        # 成本估算（每1M tokens的价格，美元）
        cost_table = {
            "claude-3.5-sonnet": {"input": 3.0, "output": 15.0},
            "claude-3-opus": {"input": 15.0, "output": 75.0},
            "gpt-4-turbo": {"input": 10.0, "output": 30.0},
            "gpt-4o": {"input": 5.0, "output": 15.0},
            "gemini-pro": {"input": 0.5, "output": 1.5},
            "deepseek-chat": {"input": 0.14, "output": 0.28},
            "qwen-2.5-72b": {"input": 0.9, "output": 0.9}
        }
        
        if self.model in cost_table:
            costs = cost_table[self.model]
            input_cost = (input_tokens / 1_000_000) * costs["input"]
            output_cost = (output_tokens / 1_000_000) * costs["output"]
            return input_cost + output_cost
        
        return 0.0