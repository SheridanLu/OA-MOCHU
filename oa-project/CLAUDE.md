# CLAUDE.md - AI 协作工作指南 (V2.0)

> 基于 2026-03-04 终版需求说明书重构
> 严格遵循 6 步标准流程

---

## 🎯 核心原则

1. **一次只做一个任务**：从 tasks.md 领取 → 完成 → 标记 → 提交
2. **保持可运行状态**：每次提交后系统必须能正常启动
3. **详细记录日志**：让下一个 AI 能无缝接手
4. **测试驱动开发**：功能必须测试通过才能标记完成

---

## 📋 标准工作流程 (6步)

### Step 1: 初始化环境
```bash
cd /root/.openclaw/workspace/oa-project
./scripts/init.sh
```
确认：数据库、依赖、服务状态

### Step 2: 领取任务
1. 读取 `tasks.md`
2. 找到第一个 `[ ]` 任务
3. 改为 `[->]` (进行中)
4. 在 `progress.txt` 记录开始

### Step 3: 开始开发
- 理解需求（参考需求文档）
- 编写代码
- 添加注释

### Step 4: 测试验证
```bash
# 重启服务
systemctl restart oa-backend oa-frontend

# 测试 API
curl http://localhost:3001/api/health
curl http://localhost:3001/api/xxx
```

### Step 5: 更新文档
- tasks.md: `[->]` → `[x]` 或 `[!]`
- progress.txt: 记录完成/失败

### Step 6: 提交代码
```bash
git add -A
git commit -m "feat(TASK-XXX): 功能描述"
git push origin main
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

## 🚨 遇到困难时

### 可自行解决
- 代码错误
- 简单 bug
- 文档查找

### 必须求助人工（超过30分钟）
- 数据库重大变更
- 不确定的需求
- 外部 API 问题
- 权限问题

求助格式：
```
🆘 需要人工介入

任务: TASK-XXX
问题: [详细描述]
已尝试: [列出方法]
建议: [你的建议]
```

---

## 📁 关键文件

| 文件 | 用途 |
|------|------|
| tasks.md | 任务列表（本文件） |
| progress.txt | 工作日志（AI沟通） |
| CLAUDE.md | AI 工作指南 |
| data/oa.db | SQLite 数据库 |

---

## 🔧 技术栈

- **后端**: Node.js + Express + SQLite + better-sqlite3
- **前端**: React + Ant Design + Vite
- **认证**: JWT
- **服务**: systemd (oa-backend, oa-frontend)

---

## 🌐 访问地址

- 前端: http://43.153.149.71:3000
- 后端: http://43.153.149.71:3001
- 测试账号: admin / admin123

---

## 📞 紧急联系

在 progress.txt 添加：
```
🚨 紧急: [问题]
时间: YYYY-MM-DD HH:mm
AI: [名称]
```

---

*版本: 2.0.0*
*最后更新: 2026-03-04*
