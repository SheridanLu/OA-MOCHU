# CLAUDE.md - AI 协作工作指南

> 本文件指导所有 AI 按照规范流程进行开发工作
> 基于 Anthropic "Effective harnesses for long-running agents" 论文和 feature-dev 插件

---

## 🎯 核心原则

1. **增量开发**: 每次只做一个任务
2. **保持干净状态**: 每次提交代码必须可运行
3. **留下清晰记录**: 让下一个 AI 能快速接手
4. **端到端测试**: 功能必须测试通过才能标记完成

---

## 📋 标准工作流程 (6步)

### Step 1: 初始化环境
```bash
./scripts/init.sh
```
确认数据库、依赖、服务都正常。

### Step 2: 领取任务
1. 读取 `tasks.md` 文件
2. 找到第一个 `[ ]` 标记的未完成任务
3. 将其改为 `[->]` 表示进行中
4. 在 `progress.txt` 记录: `YYYY-MM-DD HH:mm [AI名称] 开始任务: TASK-XXX`

### Step 3: 开始开发
1. 理解任务需求
2. 查看相关代码
3. 实现功能
4. 添加必要注释

### Step 4: 测试验证
1. 启动后端服务
2. 用 curl 测试 API
3. 验证功能完整性
4. 确保没有破坏现有功能

### Step 5: 更新文档
1. 将任务标记为 `[x]` 完成或 `[!]` 失败
2. 更新 `progress.txt` 记录结果
3. 更新 `CHANGELOG.md` (如有重大变更)

### Step 6: 提交代码
```bash
git add .
git commit -m "feat(TASK-XXX): 任务描述"
```

---

## 📝 文件说明

| 文件 | 用途 |
|------|------|
| `tasks.md` | 任务列表，所有待办任务 |
| `progress.txt` | 工作日志，AI 之间的沟通记录 |
| `CLAUDE.md` | 本文件，AI 工作指南 |
| `CHANGELOG.md` | 变更日志，重要更新记录 |

---

## 🚨 遇到困难时

### 可以自己解决
- 代码语法错误
- 简单的 bug
- 文档查找

### 必须求助人工
- 数据库结构重大变更
- 不确定的需求
- 外部 API 问题
- 权限问题
- 超过 30 分钟无法解决

求助格式：
```
🆘 需要人工介入

任务: TASK-XXX
问题: [详细描述]
已尝试: [列出已尝试的方法]
建议: [你的建议]
```

---

## 📊 任务状态标记

| 标记 | 含义 |
|------|------|
| `[ ]` | 未开始 |
| `[->]` | 进行中 |
| `[x]` | 已完成 |
| `[!]` | 失败/阻塞 |
| `[?]` | 需要确认 |

---

## 🔄 Git 提交规范

```
feat(TASK-XXX): 新功能
fix(TASK-XXX): 修复bug
docs(TASK-XXX): 文档更新
refactor(TASK-XXX): 重构
test(TASK-XXX): 测试
chore: 杂项
```

---

## 🏗️ 项目结构

```
oa-project/
├── CLAUDE.md              # AI 工作指南 (本文件)
├── tasks.md               # 任务列表
├── progress.txt           # 工作日志
├── CHANGELOG.md           # 变更日志
├── scripts/
│   └── init.sh            # 初始化脚本
├── src/
│   ├── backend/           # 后端代码
│   │   ├── index.js       # Express 入口
│   │   ├── config.js      # 配置
│   │   ├── init-db.js     # 数据库初始化
│   │   ├── middleware/    # 中间件
│   │   └── routes/        # API 路由
│   └── frontend/          # 前端代码
│       └── src/
│           ├── App.jsx
│           └── pages/
├── data/                  # SQLite 数据库
└── package.json
```

---

## 📞 紧急联系

如遇紧急情况，在 `progress.txt` 中添加：

```
🚨 紧急: [问题描述]
时间: YYYY-MM-DD HH:mm
AI: [你的名称]
状态: 等待人工处理
```

---

*版本: 1.0.0*
*最后更新: 2026-03-02*
*基于: Anthropic feature-dev 插件*
