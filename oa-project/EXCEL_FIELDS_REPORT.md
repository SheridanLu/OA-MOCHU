# Excel模板字段对比报告

## 一、实体项目立项信息录入表

### 用户表格字段（14个）
```
合同名称、项目别名、项目地点、合同含税金额（万元）、不含税金额（万元）、
税率、税金、甲方单位名称、甲方银行信息、合同类型、开始时间、结束时间、
付款批次、每批次计划付款比例
```

### 需求对比

| 字段 | 用户表格 | PPT需求 | 系统已有 | 状态 |
|------|---------|---------|---------|------|
| 合同名称 | ✅ | ✅ | ✅ name | OK |
| 项目别名 | ✅ | ✅ | ✅ alias | OK |
| 项目地点 | ✅ | ✅ | ✅ location | OK |
| 合同含税金额 | ✅ | ✅ | ✅ contract_amount | OK |
| 不含税金额 | ✅ | ✅ | ✅ amount_no_tax | OK |
| 税率 | ✅ | ✅ | ✅ tax_rate | OK |
| 税金 | ✅ | ✅ | ✅ tax_amount | OK |
| 甲方单位名称 | ✅ | ✅ | ✅ party_a | OK |
| 甲方银行信息 | ✅ | ✅ | ❌ | **需补充** |
| 合同类型 | ✅ | ✅ | ✅ contract_type | OK |
| 开始时间 | ✅ | ✅ | ✅ start_date | OK |
| 结束时间 | ✅ | ✅ | ✅ end_date | OK |
| 付款批次 | ✅ | ✅ | ✅ payment_plans表 | OK |
| 每批次计划付款比例 | ✅ | ⚠️ | ❌ | **需补充** |
| 保修期 | ❌ | ✅ | ✅ warranty_period | **用户漏填** |
| 回款计划时间 | ❌ | ✅ | ❌ | **需补充** |
| 回款计划金额 | ❌ | ✅ | ❌ | **需补充** |

---

## 二、虚拟项目立项信息录入表

### 用户表格字段（6个）
```
虚拟合同名称、合同地点、合同含税金额（万元）、甲方单位名称、
合同类型、拟投入项目金额限额
```

### 需求对比

| 字段 | 用户表格 | PPT需求 | 系统已有 | 状态 |
|------|---------|---------|---------|------|
| 虚拟合同名称 | ✅ | ✅ | ✅ name | OK |
| 合同地点 | ✅ | ✅ | ✅ location | OK |
| 合同含税金额 | ✅ | ✅ | ✅ contract_amount | OK |
| 甲方单位名称 | ✅ | ✅ | ✅ party_a | OK |
| 合同类型 | ✅ | ✅ | ✅ contract_type | OK |
| 拟投入项目金额限额 | ✅ | ✅ | ✅ virtual_limit | OK |

**结论：虚拟项目100%匹配 ✅**

---

## 三、虚拟项目中止信息录入表

### 用户表格字段（8个）
```
虚拟合同名称、合同地点、合同含税金额（万元）、甲方单位名称、合同类型、
拟投入项目金额限额、是否项目中止、虚拟项目发生成本归集位置
```

### 需求对比

| 字段 | 用户表格 | PPT需求 | 系统已有 | 状态 |
|------|---------|---------|---------|------|
| 前6个字段 | ✅ | 自动调出 | ✅ | OK（只读显示） |
| 是否项目中止 | ✅ | ✅ | ✅ status='suspended' | OK |
| 成本归集位置 | ✅ | ✅ | ✅ suspend_to_project | OK |

**结论：中止表100%匹配 ✅**

---

## 四、需要补充的字段

### 4.1 实体项目表需补充

```sql
ALTER TABLE projects ADD COLUMN party_a_bank TEXT;  -- 甲方银行信息
ALTER TABLE projects ADD COLUMN return_plan_time DATE;  -- 回款计划时间
ALTER TABLE projects ADD COLUMN return_plan_amount DECIMAL(14,2);  -- 回款计划金额
```

### 4.2 付款计划表需补充

```sql
ALTER TABLE payment_plans ADD COLUMN plan_ratio DECIMAL(5,2);  -- 计划付款比例（%）
```

---

## 五、系统自动生成的隐藏字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| code | TEXT | 项目编号（自动生成） |
| type | TEXT | entity/virtual |
| status | TEXT | pending/active/suspended |
| progress_percent | DECIMAL | 项目进度百分比 |
| created_by | INTEGER | 创建人ID |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |
| converted_from | INTEGER | 虚拟转实体来源 |
| suspend_to_project | INTEGER | 中止时成本下挂项目 |

---

*报告生成时间: 2026-03-04*
