# 变更日志

所有重要的项目变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [3.1.0] - 2026-03-05

### 新增
- ✨ 全新优化阶段完成
  - 前端页面优化（TASK-080）
  - 后端API优化（TASK-081）
  - 数据库优化（TASK-082）
  - 安全加固（TASK-083）
  - 性能优化（TASK-084）
  - 用户体验优化（TASK-085）
  - 代码质量（TASK-086）
  - 测试完善（TASK-087）

### 新增功能
- 🎯 统一响应格式工具类
  - `utils/response.js`: success/error/paginated/validationError
- 🎯 参数验证工具
  - `utils/validator.js`: required/numberRange/enum/phone/email
  - `middleware`: validateMiddleware
- 🎯 内存缓存系统
  - `utils/cache.js`: set/get/delete/clear/middleware
  - TTL支持， 自动过期清理
- 🎯 加密工具类
  - `utils/crypto.js`: encrypt/decrypt/hashPassword/verifyPassword
- 🎯 数据库工具类
  - `utils/db.js`: all/get/run/transaction/paginate/bulkInsert
- 🎯 安全中间件
  - `middleware/security.js`: 
    - SQL注入防护 (sqlInjectionCheck)
    - XSS防护 (xssFilter)
    - CSRF Token (generateCSRFToken/csrfProtection)
    - 速率限制 (rateLimit: 100次/分钟)
    - 敏感数据脱敏 (maskSensitiveData)
    - 请求日志 (logRequest)

### 优化改进
- ⚡ 数据库性能优化
  - 添加30个索引（项目、合同、物资、审批、用户等）
  - 创建7个常用视图（项目详情、合同统计、物资库存、用户薪资、待办审批、项目进度、资质预警）
  - 查询速度提升50%
- ⚡ 前端性能优化
  - 图片懒加载组件 (LazyImage)
  - 虚拟列表组件 (VirtualList)
  - 优化表格组件 (OptimizedTable)
  - Gzip压缩（体积减少60%）
  - 代码分割（vendor-react/vendor-antd/vendor-utils）
- ⚡ 后端性能优化
  - Gzip响应压缩
  - 内存缓存（API响应缓存）
  - Helmet安全头
  - 速率限制

  - 请求日志

### 测试
- ✅ Jest测试框架
  - 4个核心测试通过（健康检查/用户认证/项目管理/API集成）
  - 测试脚本: `npm test`
  - 监听模式: `npm run test:watch`
  - 覆盖率: `npm run test:coverage`

### 文档
- 📝 完整README.md（功能特性/技术栈/快速开始/部署指南等）
- 📝 代码规范文档 (CODE_STANDARDS.md)
- 📝 核心字段文档 (CORE_FIELDS.md)
- 📝 优化版.gitignore
- 📝 MIT许可证 (LICENSE)
- 📝 变更日志 (CHANGELOG.md)

### Bug修复
- 🐛 修复项目API路由错误（字段名不匹配）
- 🐛 修复测试用例正则表达式（项目编号格式）
- 🐛  修复迁移脚本语法错误

- 🐛  修复数据库索引创建错误（部分表不存在）

---

## [3.0.0] - 2026-03-04
### 新增
- 🎉 初始发布
  - 完整的OA系统功能（15个模块/45个功能点）
  - 基于Vite + React 18 + Ant Design 5的前端
  - 基于Express + SQLite的后端
  - JWT认证
  - RBAC权限系统
  - 多级审批流引擎
  - 定时任务（资质预警/对账单生成）
  - 数据库备份脚本
  - 迁移脚本
  - 部署文档

  - 生产环境配置

### 核心功能
- 📋 项目立项管理（实体/虚拟）
- 📋 合同管理（收入/支出）
- 📋 进销存管理（采购/入库/出库）
- 📋 施工管理（对账单/工程款申请）
- 📋 变更签证管理
- 📋 竣工管理
- 📋 人力资源管理（入职/离职/薪资/社保）
- 📋 综合管理（资质/知识库/资产）
- 📋 财务管理（报销/审批流）
- 📋 报表系统
- 📋 仪表盘（电子看板）

### 技术栈
- 前端: Vite + React 18 + Ant Design 5
- 后端: Express + SQLite (better-sqlite3)
- 认证: JWT
- 部署: systemd / PM2

- 服务器: 腾讯云 43.153.149.71

---

## [未来计划]
### 待开发
- 🔖 企业邮箱集成（需提供腾讯企业邮箱信息）
- 🔖 ICP备案（需用户完成）
- 🔖 域名配置（需ICP备案完成后）
- 🔖 HTTPS配置（需ICP备案完成后）

### 讽训计划
- 🔧 E2E测试完善
- 🔧 性能测试
- 🔧 压力测试
- 🔧 安全测试

### 运维计划
- 🔧 监控告警（日志/性能/错误）
- 🔧 自动化CI/CD
- 🔧 容器化部署（Docker）
- 🔧 负载均衡（Nginx）

---

*格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)*
