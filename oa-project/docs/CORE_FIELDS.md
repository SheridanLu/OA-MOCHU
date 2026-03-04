# 核心字段设计规范

## 一、项目编号规则（project_code）

### 1.1 编号格式

| 项目类型 | 前缀 | 年份 | 序号 | 总长度 | 示例 |
|----------|------|------|------|--------|------|
| **实体项目** | P | YYYY | 6位 | **10位** | P2026000001 |
| **虚拟项目** | V | YYYY | 4位 | **8位** | V20260001 |

### 1.2 生成规则

```javascript
// 实体项目（10位）
function generateEntityCode() {
  const year = new Date().getFullYear();
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM projects 
    WHERE type = 'entity' AND strftime('%Y', created_at) = ?
  `).get(String(year));
  return `P${year}${String(count.count + 1).padStart(6, '0')}`;
}

// 虚拟项目（8位）
function generateVirtualCode() {
  const year = new Date().getFullYear();
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM projects 
    WHERE type = 'virtual' AND strftime('%Y', created_at) = ?
  `).get(String(year));
  return `V${year}${String(count.count + 1).padStart(4, '0')}`;
}
```

### 1.3 全局唯一性

```
project_code 是全系统的主键，用于关联：
├─ contracts 表 (合同)
├─ materials 表 (物资)
├─ statements 表 (对账单)
├─ payment_applications 表 (工程款申请)
├─ change_requests 表 (变更签证)
└─ completion_docs 表 (竣工文档)
```

---

## 二、流程状态（status）

### 2.1 状态枚举

```sql
-- 项目状态
CREATE TYPE project_status AS ENUM (
  'draft',        -- 草稿
  'pending',      -- 待审批
  'approved',     -- 立项完成
  'rejected',     -- 审批拒绝
  'suspended',    -- 已中止（虚拟项目）
  'converting',   -- 转换中（虚拟→实体）
  'completed'     -- 已竣工
);
```

### 2.2 状态流转图

```
虚拟项目流程：
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│  草稿   │ -> │ 待审批  │ -> │ 立项完成 │ -> │ 已中止  │
│ (draft) │    │(pending)│    │(approved)│    │(suspended)
└─────────┘    └─────────┘    └──────────┘    └─────────┘
                                    │
                                    v
                              ┌──────────┐
                              │ 转换中   │ -> 实体项目
                              │(converting)
                              └──────────┘

实体项目流程：
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│  草稿   │ -> │ 待审批  │ -> │ 立项完成 │ -> │ 已竣工  │
│ (draft) │    │(pending)│    │(approved)│    │(completed)
└─────────┘    └─────────┘    └──────────┘    └─────────┘
```

### 2.3 前端状态标签

```javascript
const statusMap = {
  draft:     { text: '草稿',     color: 'default' },
  pending:   { text: '待审批',   color: 'orange' },
  approved:  { text: '立项完成', color: 'green' },
  rejected:  { text: '审批拒绝', color: 'red' },
  suspended: { text: '已中止',   color: 'gray' },
  converting:{ text: '转换中',   color: 'blue' },
  completed: { text: '已竣工',   color: 'cyan' }
};
```

---

## 三、发起人外键（created_by）

### 3.1 字段定义

```sql
created_by INTEGER NOT NULL,
FOREIGN KEY (created_by) REFERENCES users(id)
```

### 3.2 关联查询

```sql
-- 查询项目发起人信息
SELECT 
  p.code,
  p.name,
  u.name as creator_name,
  u.username as creator_username,
  d.name as creator_department
FROM projects p
JOIN users u ON p.created_by = u.id
LEFT JOIN departments d ON u.department_id = d.id;
```

### 3.3 权限控制

```javascript
// 只有发起人或管理员可以编辑草稿
if (project.status === 'draft') {
  if (project.created_by !== currentUser.id && currentUser.role !== 'admin') {
    return res.status(403).json({ error: '无权编辑他人项目' });
  }
}
```

---

## 四、成本下挂外键（target_project_id）

### 4.1 字段定义

```sql
-- 虚拟项目中止时的成本下挂目标
target_project_id INTEGER,
target_project_code TEXT,  -- 冗余存储，方便查询
FOREIGN KEY (target_project_id) REFERENCES projects(id)
```

### 4.2 业务规则

```javascript
// 虚拟项目中止逻辑
async function suspendVirtualProject(projectId, targetProjectId) {
  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  
  // 验证
  if (project.type !== 'virtual') {
    throw new Error('只有虚拟项目可以中止');
  }
  
  if (targetProjectId) {
    const target = await db.prepare('SELECT * FROM projects WHERE id = ?').get(targetProjectId);
    if (!target || target.type !== 'entity') {
      throw new Error('成本下挂目标必须是实体项目');
    }
  }
  
  // 执行中止
  await db.transaction(() => {
    // 1. 更新项目状态
    db.prepare(`
      UPDATE projects 
      SET status = 'suspended', 
          target_project_id = ?,
          target_project_code = (SELECT code FROM projects WHERE id = ?)
      WHERE id = ?
    `).run(targetProjectId, targetProjectId, projectId);
    
    // 2. 转移成本（物资流水）
    db.prepare(`
      UPDATE material_transactions 
      SET project_id = ? 
      WHERE project_id = ?
    `).run(targetProjectId, projectId);
    
    // 3. 转移合同
    db.prepare(`
      UPDATE contracts 
      SET project_id = ? 
      WHERE project_id = ?
    `).run(targetProjectId, projectId);
  });
}
```

### 4.3 前端选择逻辑

```javascript
// 下拉框选项
const targetOptions = [
  { value: null, label: '公司综合成本' },
  ...entityProjects.map(p => ({
    value: p.id,
    label: `${p.code} - ${p.name}`,
    code: p.code  // 10位编号
  }))
];
```

---

## 五、完整表结构

```sql
CREATE TABLE projects (
  -- 主键
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,  -- 项目编号（8位或10位）
  
  -- 基本信息
  name TEXT NOT NULL,          -- 项目名称
  alias TEXT,                  -- 项目别名
  type TEXT NOT NULL,          -- entity/virtual
  location TEXT,               -- 项目地点
  
  -- 甲方信息
  party_a TEXT,                -- 甲方单位名称
  party_a_contact TEXT,        -- 甲方联系人
  party_a_phone TEXT,          -- 甲方电话
  party_a_bank TEXT,           -- 甲方银行信息
  party_a_address TEXT,        -- 甲方地址
  
  -- 金额信息
  contract_amount DECIMAL(14,2) DEFAULT 0,  -- 合同含税金额
  amount_no_tax DECIMAL(14,2) DEFAULT 0,    -- 不含税金额
  tax_rate DECIMAL(5,2) DEFAULT 0,          -- 税率
  tax_amount DECIMAL(14,2) DEFAULT 0,       -- 税金
  virtual_limit DECIMAL(14,2),              -- 虚拟项目限额
  
  -- 合同信息
  contract_type TEXT,          -- 合同类型
  start_date DATE,             -- 开始时间
  end_date DATE,               -- 结束时间
  warranty_period INTEGER DEFAULT 0,        -- 保修期（月）
  
  -- 回款计划
  return_plan_time DATE,       -- 回款计划时间
  return_plan_amount DECIMAL(14,2),         -- 回款计划金额
  
  -- 状态管理
  status TEXT DEFAULT 'draft', -- 流程状态
  progress_percent DECIMAL(5,2) DEFAULT 0,  -- 进度百分比
  
  -- 关联外键
  created_by INTEGER NOT NULL,             -- 发起人ID
  converted_from INTEGER,                  -- 虚拟转实体来源
  target_project_id INTEGER,               -- 成本下挂目标
  target_project_code TEXT,                -- 成本下挂目标编号（冗余）
  
  -- 审计字段
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (converted_from) REFERENCES projects(id),
  FOREIGN KEY (target_project_id) REFERENCES projects(id)
);

-- 索引
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_target ON projects(target_project_id);
```

---

## 六、API响应示例

### 6.1 创建实体项目响应

```json
{
  "id": 1,
  "code": "P2026000001",
  "name": "华为极目项目消防工程",
  "type": "entity",
  "status": "pending",
  "created_by": 1,
  "created_at": "2026-03-04T15:30:00Z",
  "message": "实体项目创建成功，等待审批"
}
```

### 6.2 虚拟项目中止响应

```json
{
  "id": 2,
  "code": "V20260001",
  "name": "测试虚拟项目",
  "type": "virtual",
  "status": "suspended",
  "target_project_id": 1,
  "target_project_code": "P2026000001",
  "message": "项目已中止，成本已划拨至 P2026000001"
}
```

---

*最后更新: 2026-03-04*
*版本: 1.0*
