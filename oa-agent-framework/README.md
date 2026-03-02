# OA Builder Framework

基于 Anthropic "Effective harnesses for long-running agents" 论文构建的小型办公 OA 系统开发框架。

## 快速开始

### 1. 初始化项目

将 Initializer Agent 的 prompt 发送给 AI，让它搭建初始环境：

```
请阅读 ./prompts/initializer.md 并执行其中的任务
```

### 2. 开发功能

每个 session 开始时，发送 Coder Agent 的 prompt：

```
请阅读 ./prompts/coder.md 并执行其中的任务
```

## 目录说明

```
oa-agent-framework/
├── SKILL.md                    # 技能说明
├── README.md                   # 本文件
├── prompts/
│   ├── initializer.md          # Initializer Agent 提示词
│   └── coder.md                # Coding Agent 提示词
└── templates/
    ├── feature-list.json       # 功能清单（26 个功能）
    ├── progress.md             # 进度日志模板
    ├── init.sh                 # 启动脚本
    └── database/
        └── init.sql            # 数据库 Schema
```

## 功能清单概览

| 模块 | 功能数 | 优先级 |
|------|--------|--------|
| 用户认证 | 4 | Critical |
| 仪表盘 | 4 | High |
| 请假管理 | 6 | Critical |
| 报销管理 | 4 | Critical |
| 公告通知 | 3 | High |
| 通讯录 | 3 | Medium |
| 权限管理 | 3 | Critical |

**总计: 26 个功能**

## 技术栈

- **后端**: Node.js + Express + better-sqlite3 + jsonwebtoken
- **前端**: React + Ant Design + React Router
- **数据库**: SQLite（文件数据库，便于部署）
- **测试**: Playwright / Puppeteer（端到端测试）

## 核心原则

1. **一次一个功能** - 每个 session 只实现一个 feature
2. **端到端测试** - 用浏览器自动化验证，不用只跑单元测试
3. **保持干净状态** - 每次提交时代码可运行
4. **写好文档** - progress.md 记录所有决策和进度

## 扩展建议

完成基础 OA 后，可以继续添加：
- 考勤打卡
- 日程管理
- 文件共享
- 即时通讯
- 数据报表
- 移动端适配

---

🦞 by 全能大龙虾
