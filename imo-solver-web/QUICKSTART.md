# 快速开始指南

## 1分钟快速启动

### Windows用户
```bash
# 双击运行
start.bat
```

### Mac/Linux用户
```bash
chmod +x start.sh
./start.sh
```

## 首次使用步骤

### 1. 获取OpenRouter API密钥
- 访问 https://openrouter.ai/keys
- 注册账号并创建API密钥
- 复制密钥（格式：sk-or-...）

### 2. 配置系统
- 打开 http://localhost:3000
- 点击右上角设置图标
- 粘贴API密钥
- 点击"Test"验证
- 保存配置

### 3. 测试示例问题
- 点击"Simple Algebra Problem"加载示例
- 设置代理数量为3（测试用）
- 点击"Start Solving"

### 4. 查看结果
- 切换到"Visualization"标签查看进度
- 切换到"Logs"标签查看详细日志
- 等待找到解答（绿色状态）

## 推荐配置

### 简单问题
- 模型：GPT-4 Turbo
- 代理数：3-5
- 超时：120秒

### 中等难度
- 模型：Claude 3.5 Sonnet
- 代理数：10-15
- 超时：300秒

### IMO难题
- 模型：Claude 3.5 Sonnet
- 代理数：20-30
- 超时：0（无限制）

## 费用估算

每个代理运行一次约消耗：
- Claude 3.5: $0.01-0.05
- GPT-4: $0.02-0.08
- Gemini Pro: $0.001-0.005

建议先小规模测试！

## 故障排除

### 端口被占用
修改端口：
- 后端：编辑 backend/main.py 中的 port=8000
- 前端：编辑 frontend/vite.config.ts 中的 port: 3000

### 依赖安装失败
手动安装：
```bash
# 后端
cd backend && pip install -r requirements.txt

# 前端
cd frontend && npm install
```

### WebSocket连接失败
- 检查防火墙设置
- 确保后端正在运行
- 刷新页面重试

## 需要帮助？

- 查看完整文档：README.md
- API文档：http://localhost:8000/docs
- 提交Issue：GitHub仓库