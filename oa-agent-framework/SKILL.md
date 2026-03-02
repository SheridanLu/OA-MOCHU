---
name: oa-builder
description: 长时运行 Agent 框架，用于构建小型办公 OA 系统。基于 Anthropic 的 effective harnesses 方法论。
version: 1.0.0
---

# OA Builder - 长时运行 Agent 框架

基于 Anthropic "Effective harnesses for long-running agents" 论文实现。

## 核心理念

1. **双 Agent 模式**：Initializer 负责搭建，Coder 负责增量开发
2. **Feature List 驱动**：所有功能预先规划，逐个击破
3. **干净状态原则**：每个 session 结束时代码可合并
4. **端到端测试**：用浏览器自动化验证功能

## 目录结构

```
project/
├── .oa/
│   ├── feature-list.json      # 功能清单（200+ 条）
│   ├── progress.md            # 进度日志
│   ├── test-results.json      # 测试结果记录
│   └── session-init.md        # 每个 session 的启动指令
├── init.sh                    # 一键启动开发环境
├── package.json
├── src/
│   ├── frontend/              # 前端代码
│   ├── backend/               # 后端代码
│   └── database/              # 数据库迁移
└── tests/
    ├── e2e/                   # 端到端测试
    └── unit/                  # 单元测试
```

## 工作流程

### Session 1: Initializer Agent
1. 分析需求，生成 feature-list.json
2. 初始化项目结构
3. 写 init.sh 启动脚本
4. 初始化 git 仓库
5. 创建 progress.md

### Session 2+: Coding Agent
每个 session 的标准流程：
1. `pwd` - 确认工作目录
2. 读取 progress.md 和 git log
3. 启动开发服务器（init.sh）
4. 运行基础功能测试，确保没坏
5. 从 feature-list.json 选一个未完成的功能
6. 实现功能
7. 端到端测试验证
8. 更新 feature-list.json 的 passes 字段
9. git commit + 更新 progress.md
