# 虚拟项目管理功能说明

## 📋 功能概述

系统已完整实现虚拟项目的全生命周期管理，包括：
1. ✅ 虚拟项目立项
2. ✅ 虚拟项目转实体项目
3. ✅ 虚拟项目中止

---

## 1️⃣ 虚拟项目立项

### 功能说明
- **编号规则**: V + 年份 + 4位序号（8位）
- **示例**: V20260001
- **必填信息**:
  - 虚拟合同名称
  - 项目地点
  - 虚拟合同含税金额
  - 甲方信息
  - 合同类型（采购/施工/劳务/技术服务）
  - 拟投入项目金额限额（万元）

### API端点
```
POST /api/projects
Content-Type: application/json

{
  "type": "virtual",
  "name": "XX项目",
  "location": "北京市",
  "amount": 1000000,
  "virtual_limit": 500000,
  ...
}
```

### 审批流程
```
采购员 → 财务人员 → 总经理
```

---

## 2️⃣ 虚拟项目转实体项目

### 功能说明
- **触发条件**: 取得项目中标
- **必需文件**: 《中标通知书》
- **编号变更**: 
  - 原编号: V20260001（8位虚拟编号）
  - 新编号: P2026000001（10位实体编号）
- **文件归集**: 虚拟项目编号下所有文件自动归集到实体项目下

### API端点
```
POST /api/projects/:id/convert
Content-Type: application/json

{
  "win_notice_attachment": "中标通知书.pdf"
}
```

### 审批流程
```
采购员 → 财务人员 → 总经理
```

### 实现逻辑
1. 验证项目类型必须为虚拟项目
2. 必须上传《中标通知书》
3. 生成新的10位实体项目编号
4. 更新项目类型和编号
5. 保留原虚拟编号在 `converted_from` 字段
6. 创建审批流程
7. 文件已在原项目下，无需迁移

### 响应示例
```json
{
  "id": 1,
  "old_code": "V20260001",
  "new_code": "P2026000001",
  "status": "converting",
  "message": "转换申请已提交，等待审批"
}
```

---

## 3️⃣ 虚拟项目中止

### 功能说明
- **适用范围**: 仅限虚拟项目
- **成本处理**: 
  - 下挂到指定实体项目
  - 或归入公司综合成本
- **状态冻结**: 项目信息和数据保留，页面冻结不能继续操作
- **编号保留**: 8位虚拟编号系统中保留

### API端点
```
POST /api/projects/:id/suspend
Content-Type: application/json

{
  "target_project_id": 5,  // 可选：成本下挂目标项目ID
  "reason": "项目未中标"
}
```

### 审批流程
```
采购员 → 财务人员 → 总经理
```

### 实现逻辑
1. 验证项目类型必须为虚拟项目
2. 验证项目未已中止
3. 如指定目标项目：
   - 验证目标项目存在且为实体项目
   - 转移物资流水到目标项目
   - 转移合同到目标项目
4. 更新项目状态为 `suspended`
5. 记录目标项目信息

### 响应示例
```json
{
  "id": 1,
  "code": "V20260001",
  "status": "suspended",
  "target_project_id": 5,
  "target_project_code": "P2026000001",
  "message": "项目已中止，成本已划拨至 P2026000001"
}
```

---

## 📊 数据库设计

### projects 表关键字段

```sql
-- 项目类型
type TEXT NOT NULL  -- 'entity' 或 'virtual'

-- 项目编号
code TEXT UNIQUE    -- 实体：P2026000001（10位），虚拟：V20260001（8位）

-- 虚拟项目专用字段
virtual_limit DECIMAL(14,2)  -- 拟投入金额限额
converted_from INTEGER        -- 转换前的虚拟项目ID
target_project_id INTEGER     -- 中止时成本下挂目标项目
target_project_code TEXT      -- 目标项目编号
suspend_reason TEXT           -- 中止原因

-- 项目状态
status TEXT  -- pending/approved/converting/suspended/completed
```

---

## 🔄 业务流程图

### 虚拟项目全生命周期

```
虚拟项目立项（8位编号）
    ↓
    ├─→ [中标] → 虚拟转实体 → 生成10位编号 → 文件自动归集
    │
    └─→ [未中标/中止] → 虚拟项目中止 → 成本下挂或归综合成本
```

### 编号规则

| 项目类型 | 编号格式 | 示例 | 长度 |
|---------|---------|------|------|
| 实体项目 | P + 年份 + 6位序号 | P2026000001 | 10位 |
| 虚拟项目 | V + 年份 + 4位序号 | V20260001 | 8位 |

---

## ✅ 功能验证

### 测试用例

#### 1. 创建虚拟项目
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "type": "virtual",
    "name": "测试虚拟项目",
    "location": "北京市朝阳区",
    "amount": 5000000,
    "virtual_limit": 3000000,
    "party_a": "测试甲方",
    "contract_type": "施工",
    "created_by": 1
  }'
```

#### 2. 虚拟转实体
```bash
curl -X POST http://localhost:3001/api/projects/1/convert \
  -H "Content-Type: application/json" \
  -d '{
    "win_notice_attachment": "中标通知书_20260305.pdf"
  }'
```

#### 3. 虚拟项目中止
```bash
curl -X POST http://localhost:3001/api/projects/1/suspend \
  -H "Content-Type: application/json" \
  -d '{
    "target_project_id": 2,
    "reason": "项目未中标"
  }'
```

---

## 🎯 使用场景

### 场景1: 正常中标流程
1. 采购员创建虚拟项目（V20260001）
2. 投标过程中产生费用，记录在虚拟项目下
3. 中标后，采购员上传《中标通知书》，申请转实体
4. 审批通过，生成实体编号（P2026000001）
5. 虚拟项目下所有文件自动归集到实体项目

### 场景2: 未中标成本处理
1. 采购员创建虚拟项目（V20260002）
2. 投标过程中产生费用
3. 未中标，采购员申请中止，选择成本下挂目标
4. 审批通过，成本划拨到指定实体项目或综合成本
5. 虚拟项目状态变为 `suspended`，冻结不可操作

---

## 🔒 权限要求

| 操作 | 所需权限 |
|------|---------|
| 创建虚拟项目 | project:create |
| 虚拟转实体 | project:convert |
| 虚拟中止 | project:suspend |
| 审批 | 对应审批权限 |

---

## 📝 注意事项

1. **编号唯一性**: 系统自动生成，全局唯一
2. **文件归集**: 虚拟转实体时文件已在原项目，无需迁移
3. **成本转移**: 中止时需明确成本去向
4. **状态冻结**: 中止后项目数据保留但不可操作
5. **审批必需**: 所有关键操作需审批通过

---

## 🔗 相关文档

- [项目立项管理](./docs/PROJECT_MANAGEMENT.md)
- [合同管理](./docs/CONTRACT_MANAGEMENT.md)
- [审批流程](./docs/APPROVAL_FLOW.md)

---

*文档创建: 2026-03-05*
*版本: v4.2.0*
*维护人: 全能大龙虾🦞*
