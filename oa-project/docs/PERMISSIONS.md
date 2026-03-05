# 权限系统说明

## 📋 权限清单（31个）

### 项目管理（5个）
- `project:view` - 查看项目
- `project:create` - 创建项目
- `project:edit` - 编辑项目
- `project:delete` - 删除项目
- `project:approve` - 审批项目

### 合同管理（5个）
- `contract:view` - 查看合同
- `contract:create` - 创建合同
- `contract:edit` - 编辑合同
- `contract:delete` - 删除合同
- `contract:approve` - 审批合同

### 物资管理（4个）
- `material:view` - 查看物资
- `material:purchase` - 采购物资
- `material:in` - 物资入库
- `material:out` - 物资出库

### 施工管理（3个）
- `construction:view` - 查看施工
- `construction:statement` - 创建对账单
- `construction:payment` - 申请工程款

### 人力资源（5个）
- `hr:view` - 查看员工
- `hr:create` - 添加员工
- `hr:edit` - 编辑员工
- `hr:salary` - 薪资管理
- `hr:approve` - 审批人事

### 财务管理（3个）
- `finance:view` - 查看财务
- `finance:expense` - 报销申请
- `finance:approve` - 审批报销

### 报表管理（2个）
- `report:view` - 查看报表
- `report:export` - 导出报表

### 系统管理（4个）
- `system:user` - 用户管理
- `system:role` - 角色管理
- `system:config` - 系统配置
- `system:approve` - 审批流配置

---

## 👥 角色权限分配

### 1. 总经理（31个权限）
**权限范围**：所有权限（超级管理员）

**可执行操作**：
- ✅ 所有项目的增删改查和审批
- ✅ 所有合同的增删改查和审批
- ✅ 所有物资的采购、入库、出库
- ✅ 所有施工管理和财务操作
- ✅ 人事管理、薪资管理
- ✅ 系统配置、用户管理、角色管理
- ✅ 所有报表查看和导出

---

### 2. 项目经理（14个权限）
**权限范围**：项目管理、合同管理、物资采购、施工管理、报表查看

**可执行操作**：
- ✅ 查看项目
- ✅ 创建项目
- ✅ 编辑项目
- ✅ 查看合同
- ✅ 创建合同
- ✅ 编辑合同
- ✅ 查看物资
- ✅ 采购物资
- ✅ 查看施工
- ✅ 创建对账单
- ✅ 申请工程款
- ✅ 查看员工
- ✅ 查看报表
- ✅ 导出报表

**不可执行**：
- ❌ 删除项目
- ❌ 审批项目
- ❌ 删除合同
- ❌ 审批合同
- ❌ 物资入库/出库
- ❌ 薪资管理
- ❌ 财务管理
- ❌ 系统管理

---

### 3. 财务人员（12个权限）
**权限范围**：财务管理、合同审批、施工管理、薪资管理、报表管理

**可执行操作**：
- ✅ 查看项目
- ✅ 查看合同
- ✅ 审批合同
- ✅ 查看物资
- ✅ 查看施工
- ✅ 申请工程款
- ✅ 薪资管理
- ✅ 查看财务
- ✅ 报销申请
- ✅ 审批报销
- ✅ 查看报表
- ✅ 导出报表

**不可执行**：
- ❌ 创建/编辑/删除项目
- ❌ 创建/编辑/删除合同
- ❌ 采购/入库/出库物资
- ❌ 创建对账单
- ❌ 人事管理
- ❌ 系统管理

---

### 4. 预算员（10个权限）
**权限范围**：项目管理、合同审批、对账单、报表查看

**可执行操作**：
- ✅ 查看项目
- ✅ 创建项目
- ✅ 编辑项目
- ✅ 查看合同
- ✅ 审批合同
- ✅ 查看物资
- ✅ 查看施工
- ✅ 创建对账单
- ✅ 查看报表
- ✅ 导出报表

**不可执行**：
- ❌ 删除项目
- ❌ 审批项目
- ❌ 创建/编辑/删除合同
- ❌ 采购/入库/出库物资
- ❌ 申请工程款
- ❌ 薪资管理
- ❌ 财务管理
- ❌ 系统管理

---

### 5. 采购员（10个权限）
**权限范围**：项目管理、合同创建、物资管理、施工查看、报表查看

**可执行操作**：
- ✅ 查看项目
- ✅ 创建项目
- ✅ 查看合同
- ✅ 创建合同
- ✅ 查看物资
- ✅ 采购物资
- ✅ 物资入库
- ✅ 物资出库
- ✅ 查看施工
- ✅ 查看报表

**不可执行**：
- ❌ 编辑/删除/审批项目
- ❌ 编辑/删除/审批合同
- ❌ 创建对账单
- ❌ 申请工程款
- ❌ 薪资管理
- ❌ 财务管理
- ❌ 系统管理

---

### 6. 资料员（5个权限）
**权限范围**：查看权限

**可执行操作**：
- ✅ 查看项目
- ✅ 查看合同
- ✅ 查看物资
- ✅ 查看施工
- ✅ 查看报表

**不可执行**：
- ❌ 所有创建/编辑/删除/审批操作
- ❌ 薪资管理
- ❌ 财务管理
- ❌ 系统管理

---

### 7. 普通员工（4个权限）
**权限范围**：基本查看和报销

**可执行操作**：
- ✅ 查看项目
- ✅ 查看物资
- ✅ 报销申请
- ✅ 查看报表

**不可执行**：
- ❌ 所有创建/编辑/删除/审批操作
- ❌ 薪资管理
- ❌ 系统管理

---

## 🔐 权限检查机制

### 前端权限控制
```javascript
// 检查权限
const hasPermission = (permissionCode) => {
  const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
  return permissions.some(p => p.code === permissionCode);
};

// 使用示例
if (hasPermission('project:create')) {
  // 显示创建按钮
}
```

### 后端权限中间件
```javascript
const { checkPermission } = require('./middleware/permission');

// 单个权限检查
router.post('/projects', checkPermission('project:create'), (req, res) => {
  // 创建项目逻辑
});

// 多个权限检查（满足任一即可）
router.get('/reports', checkAnyPermission(['report:view', 'report:export']), (req, res) => {
  // 查看报表逻辑
});
```

---

## 📊 权限统计

| 角色 | 权限数 | 权限范围 |
|------|--------|---------|
| 总经理 | 31 | 全部权限 |
| 项目经理 | 14 | 项目+合同+物资+施工+报表 |
| 财务人员 | 12 | 财务+合同审批+薪资+报表 |
| 预算员 | 10 | 项目+合同审批+对账+报表 |
| 采购员 | 10 | 项目+合同创建+物资+报表 |
| 资料员 | 5 | 查看权限 |
| 普通员工 | 4 | 基本查看+报销 |

---

## 🎯 权限使用示例

### 场景1：项目经理创建项目
```javascript
// 前端
<Button 
  onClick={createProject}
  disabled={!hasPermission('project:create')}
>
  创建项目
</Button>

// 后端
router.post('/api/projects', 
  checkPermission('project:create'),
  projectController.create
);
```

### 场景2：财务审批报销
```javascript
// 前端
<Button 
  onClick={approveExpense}
  disabled={!hasPermission('finance:approve')}
>
  审批报销
</Button>

// 后端
router.put('/api/expenses/:id/approve',
  checkPermission('finance:approve'),
  expenseController.approve
);
```

### 场景3：采购员采购物资
```javascript
// 前端
<Button 
  onClick={purchaseMaterial}
  disabled={!hasPermission('material:purchase')}
>
  采购物资
</Button>

// 后端
router.post('/api/materials/purchase',
  checkPermission('material:purchase'),
  materialController.purchase
);
```

---

## 🔄 权限管理API

### 获取当前用户权限
```http
GET /api/permissions/my
Authorization: Bearer <token>
```

### 获取所有角色
```http
GET /api/permissions/roles
Authorization: Bearer <token>
```

### 获取角色权限
```http
GET /api/permissions/roles/:id/permissions
Authorization: Bearer <token>
```

### 更新角色权限
```http
PUT /api/permissions/roles/:id/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "permissionIds": [1, 2, 3, 4, 5]
}
```

---

*最后更新: 2026-03-05*
*维护人: 全能大龙虾🦞*
