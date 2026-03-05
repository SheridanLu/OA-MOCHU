# 报表系统开发任务列表

> 基于2026-03-05 16:52 完成
> 目标：实现5个核心业务报表

---

## Phase 10: 报表系统开发 ✅

### TASK-090: 报表数据准备 [x]
**描述**：准备报表所需的数据库视图和统计函数
**详情**：
- [x] 创建报表统计视图
- [x] 添加汇总函数
- [x] 优化查询性能

### TASK-091: 当月单项目产值占合同总价百分比报表 [x]
**描述**：实现产值占比统计
**公式**：(当月产值 / 合同总价) × 100%
**数据来源**：
- 工程对账单（当月产值）
- 收入合同（合同总价)
**API**: `GET /api/reports/value-ratio`

### TASK-092: 单项目已采购量占采购计划百分比报表 [x]
**描述**：实现采购进度统计
**公式**：(已采购量 / 计划采购量) × 100%
**数据来源**：
- 物资入库记录(已采购量)
- 项目采购清单(计划量)
**API**: `GET /api/reports/purchase-ratio`

### TASK-093: 项目收支统计报表 [x]
**描述**：统计收入、支出、应收、应付
**内容**：
- 收入合同金额汇总
- 支出合同金额汇总
- 已收款金额
- 已付款金额
- 应收余额
- 应付余额
**API**: `GET /api/reports/finance`

### TASK-094: 采购合同支付进度报表 [x]
**描述**：已采购合同金额 vs 已支付金额
**内容**：
- 合同总额
- 已支付金额
- 未支付金额
- 支付比例
**API**: `GET /api/reports/payment-progress`

### TASK-095: 综合报表页面 [x]
**描述**：前端报表展示页面
**功能**：
- 图表展示
- 数据表格
- 权限控制
- 导出功能
**页面**: `src/frontend/src/pages/ReportPage.jsx`

### TASK-096: 报表权限控制 [x]
**描述**：实现报表可见人设置
**功能**：
- 指定可见人
- 角色权限
- 数据隔离
**API**: 
- `POST /api/reports/save`
- `GET /api/reports/custom`
- `PUT /api/reports/:id/visibility`
- `DELETE /api/reports/:id`

---

## 📊 进度统计

| 任务 | 状态 |
|------|------|
| TASK-090 报表数据准备 | ✅ |
| TASK-091 产值占比报表 | ✅ |
| TASK-092 采购进度报表 | ✅ |
| TASK-093 收支统计报表 | ✅ |
| TASK-094 支付进度报表 | ✅ |
| TASK-095 综合报表页面 | ✅ |
| TASK-096 报表权限控制 | ✅ |
| **总计** | **7/7 (100%)** |

---

## 🎯 报表功能总结

### 1. 当月产值占合同比
```sql
-- 公式
ROUND((当月产值 / 合同总价) * 100, 2) as value_ratio

-- 数据源
v_project_value_ratio视图
```

### 2. 采购进度
```sql
-- 公式
ROUND((已采购量 / 计划采购量) * 100, 2) as purchase_ratio

-- 数据源
v_project_purchase_ratio视图
```

### 3. 收支统计
```sql
-- 收入合同、支出合同、已收款、已付款
-- 应收 = 收入合同 - 已收款
-- 应付 = 支出合同 - 已付款

-- 数据源
v_project_finance视图
```

### 4. 支付进度
```sql
-- 合同总额、已支付、未支付
-- 支付比例 = (已支付 / 合同总额) * 100

-- 数据源
v_contract_payment_progress视图
```

### 5. 综合统计
```sql
-- 项目总数、合同总额
-- 收入/支出统计
-- 盈利率计算

-- 数据源
v_overall_statistics视图
```

### 6. 导出功能
- CSV格式导出
- Excel兼容(UTF-8 BOM)
- 按报表类型导出

---

## 📝 使用说明

### API访问
```bash
# 综合统计
curl http://localhost:3001/api/reports/overall

# 产值占比
curl http://localhost:3001/api/reports/value-ratio

# 采购进度
curl http://localhost:3001/api/reports/purchase-ratio

# 收支统计
curl http://localhost:3001/api/reports/finance

# 支付进度
curl http://localhost:3001/api/reports/payment-progress

# 导出CSV
curl http://localhost:3001/api/reports/export/value-ratio -o report.csv
```

### 匶权控制
- 报表可见人设置
- 角色权限管理
- 数据隔离

---

*完成时间: 2026-03-05 16:52*
*版本: 4.0.0 (报表阶段)*
