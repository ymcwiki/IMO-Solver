# IMO Solver Web - 可视化IMO问题求解系统

一个现代化的Web界面，用于可视化展示IMO（国际数学奥林匹克）问题的AI求解过程，支持多个AI代理并行求解，实时展示工作流程。

## 特性

- 🚀 **并行求解** - 支持多达50个AI代理同时工作
- 🎯 **多模型支持** - 集成OpenRouter
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
