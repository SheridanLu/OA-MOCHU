# 代码规范

## 一、命名规范

### 1.1 文件命名
- 组件文件：PascalCase（如 `UserList.jsx`）
- 工具文件：camelCase（如 `dateFormat.js`）
- 样式文件：kebab-case（如 `user-list.css`）

### 1.2 变量命名
- 常量：UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
- 变量/函数：camelCase（如 `getUserList`）
- 类/组件：PascalCase（如 `UserService`）
- 私有变量：_camelCase（如 `_privateMethod`）

### 1.3 数据库命名
- 表名：snake_case（如 `user_roles`）
- 字段名：snake_case（如 `created_at`）
- 索引：idx_表名_字段（如 `idx_users_username`）

---

## 二、代码风格

### 2.1 缩进
- 使用2空格缩进
- 不使用Tab

### 2.2 引号
- 优先使用单引号
- 字符串中包含引号时使用反引号

### 2.3 分号
- 语句结尾不加分号（可选）

### 2.4 空行
- 函数之间空一行
- 逻辑块之间空一行
- 文件末尾空一行

---

## 三、注释规范

### 3.1 文件头注释
```javascript
/**
 * 文件说明
 * @author 作者
 * @date 日期
 */
```

### 3.2 函数注释
```javascript
/**
 * 函数说明
 * @param {Type} paramName - 参数说明
 * @returns {Type} 返回值说明
 */
```

### 3.3 行内注释
- 简单逻辑：行尾注释
- 复杂逻辑：块注释

---

## 四、Git提交规范

### 4.1 Commit Message格式
```
<type>(<scope>): <subject>

<body>
```

### 4.2 Type类型
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试
- chore: 构建/工具

### 4.3 示例
```
feat(TASK-080): 前端页面优化完成

添加Excel模板字段对齐
优化表单验证提示
```

---

## 五、目录结构

```
oa-project/
├── src/
│   ├── backend/          # 后端代码
│   │   ├── routes/       # 路由
│   │   ├── middleware/   # 中间件
│   │   ├── utils/        # 工具
│   │   └── cron/         # 定时任务
│   └── frontend/         # 前端代码
│       ├── src/
│       │   ├── pages/    # 页面
│       │   ├── components/ # 组件
│       │   └── utils/    # 工具
│       └── public/
├── data/                 # 数据库
├── docs/                 # 文档
├── scripts/              # 脚本
└── tests/                # 测试
```

---

## 六、安全规范

### 6.1 密码处理
- 使用crypto.js加密
- 不明文存储密码
- 使用哈希+盐值

### 6.2 SQL查询
- 使用参数化查询
- 禁止字符串拼接SQL
- 使用ORM或预处理语句

### 6.3 敏感信息
- 不提交.env文件
- 使用.gitignore排除
- 文档中不写密钥

---

## 七、测试规范

### 7.1 单元测试
- 每个工具函数有测试
- 测试覆盖率 > 70%

### 7.2 集成测试
- API端点测试
- 数据库操作测试

---

*最后更新: 2026-03-05*
