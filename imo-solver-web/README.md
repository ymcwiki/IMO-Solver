# IMO Solver Web - 可视化IMO问题求解系统

一个现代化的Web界面，用于可视化展示IMO（国际数学奥林匹克）问题的AI求解过程，支持多个AI代理并行求解，实时展示工作流程。

## 特性

- 🚀 **并行求解** - 支持多达50个AI代理同时工作
- 🎯 **多模型支持** - 集成OpenRouter API，支持Claude、GPT-4、Gemini等多种模型
- 📊 **实时可视化** - 动态展示每个代理的状态、进度和统计信息
- 📝 **LaTeX支持** - 完美渲染数学公式
- 🔄 **WebSocket通信** - 实时更新求解进度
- 📈 **详细日志** - 记录完整的求解过程
- 💾 **结果导出** - 支持导出解答和日志

## 系统架构

```
Frontend (React + TypeScript)
    ↓ HTTP/WebSocket
Backend (FastAPI + Python)
    ↓ API调用
OpenRouter API → 各种AI模型
```

## 安装要求

- Python 3.8+
- Node.js 16+
- Windows/macOS/Linux

## 快速开始

### Windows用户

直接运行启动脚本：
```bash
start.bat
```

### macOS/Linux用户

1. 安装后端依赖：
```bash
cd backend
pip install -r requirements.txt
```

2. 安装前端依赖：
```bash
cd frontend
npm install
```

3. 启动后端服务：
```bash
cd backend
python main.py
```

4. 启动前端服务（新终端）：
```bash
cd frontend
npm run dev
```

5. 打开浏览器访问：http://localhost:3000

## 使用指南

### 1. 配置API密钥

1. 访问 [OpenRouter](https://openrouter.ai/keys) 获取API密钥
2. 在Web界面中点击设置图标
3. 输入API密钥并测试连接

### 2. 选择模型

支持的模型包括：
- Claude 3.5 Sonnet（推荐）
- Claude 3 Opus
- GPT-4 Turbo
- GPT-4o
- Gemini Pro
- DeepSeek Chat
- Qwen 2.5

### 3. 输入问题

- 支持直接输入或上传txt文件
- 支持LaTeX数学公式（使用$...$或$$...$$）
- 提供示例问题快速测试

### 4. 开始求解

- 设置代理数量（建议10-20个）
- 设置超时时间（可选）
- 点击"Start Solving"开始

### 5. 查看结果

- **Visualization标签** - 查看代理状态和统计图表
- **Logs标签** - 查看详细日志
- 找到解答后会自动高亮显示

## API端点

- `GET /health` - 健康检查
- `POST /api/solver/solve` - 启动求解任务
- `GET /api/solver/task/{task_id}/status` - 获取任务状态
- `GET /api/solver/models` - 获取可用模型列表
- `WebSocket /ws/{client_id}` - 实时更新连接

## 项目结构

```
imo-solver-web/
├── backend/                 # FastAPI后端
│   ├── api/                # API路由
│   ├── core/              # 核心业务逻辑
│   │   ├── imo_agent.py   # IMO求解代理
│   │   ├── openrouter_adapter.py  # OpenRouter适配器
│   │   └── solver_manager.py      # 求解管理器
│   └── websocket/         # WebSocket处理
├── frontend/              # React前端
│   ├── src/
│   │   ├── components/    # UI组件
│   │   ├── hooks/        # React Hooks
│   │   └── stores/       # 状态管理
│   └── package.json
└── README.md
```

## 技术栈

### 后端
- FastAPI - 高性能Web框架
- WebSocket - 实时通信
- asyncio - 异步并发处理
- OpenRouter API - 多模型接入

### 前端
- React 18 - UI框架
- TypeScript - 类型安全
- Tailwind CSS - 样式框架
- Zustand - 状态管理
- Recharts - 数据可视化
- React Markdown - Markdown渲染
- KaTeX - LaTeX公式渲染

## 开发指南

### 添加新模型

1. 在 `backend/core/openrouter_adapter.py` 的 `MODEL_CONFIGS` 中添加模型配置
2. 测试API调用是否正常

### 自定义提示词

修改 `backend/core/prompts.py` 中的提示词模板

### 调试模式

后端自动启用热重载，修改代码后会自动重启

## 常见问题

### Q: 如何查看API文档？
A: 访问 http://localhost:8000/docs

### Q: WebSocket连接失败？
A: 检查防火墙设置，确保8000端口可访问

### Q: 求解速度慢？
A: 可以尝试：
- 减少代理数量
- 使用更快的模型（如GPT-4 Turbo）
- 设置合理的超时时间

## 成本估算

使用OpenRouter API会产生费用，不同模型价格不同：
- Claude 3.5 Sonnet: ~$3/1M输入tokens
- GPT-4 Turbo: ~$10/1M输入tokens
- Gemini Pro: ~$0.5/1M输入tokens

建议先用少量代理测试，评估成本后再增加代理数量。

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 致谢

- 原始IMO求解器项目作者
- OpenRouter提供的API服务
- 所有开源库的贡献者