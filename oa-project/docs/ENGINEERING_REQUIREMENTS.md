# 工程项目全周期管理需求分析

## 一、已实现功能 ✅

### 1. 基础模块
- ✅ 登录系统
- ✅ 组织架构
- ✅ 项目立项（实体/虚拟）
- ✅ 合同管理（收入/支出）
- ✅ 资质管理
- ✅ 薪资社保
- ✅ 报销管理
- ✅ 资产管理

### 2. 施工管理
- ✅ 工程对账单（5位编号）
- ✅ 工程款申请
- ✅ 进度款管理

### 3. 进销存管理
- ✅ 物资采购
- ✅ 物资入库
- ✅ 物资出库
- ✅ 物资退库
- ✅ 基准价系统

---

## 二、待完善功能 ⚠️

### 1. 支出合同管理

#### 1.1 劳务提报工程量核算
**需求描述**：
- 项目经理完成劳务提报工程量初步核算
- 核算材料：隐蔽工程照片、已完工工程量计算式、工程对账单
- 审批流程：项目经理→预算员→财务→总经理

**待实现**：
```sql
CREATE TABLE labor_quantity_reports (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  contract_id INTEGER NOT NULL,
  statement_id INTEGER,  -- 关联工程对账单
  photos TEXT,           -- 隐蔽工程照片（JSON）
  calculation_formula TEXT,  -- 工程量计算式
  quantity DECIMAL(10,2),
  amount DECIMAL(14,2),
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 1.2 工程款申请（人工费、软件费）
**需求描述**：
- 系统自动生成申请资料清单目录
- 自动关联工程对账单
- 审批流程：项目经理→采购员→财务→总经理

#### 1.3 工程款申请（物资到货款）
**需求描述**：
- 系统自动生成申请资料清单
- 审批流程：项目经理→采购员→财务→总经理

---

### 2. 变更与签证管理

#### 2.1 超量采购申请
**需求描述**：
- 采购物资量>支出合同清单量且>项目采购清单时触发
- 审批流程：项目经理→预算员→采购员→总经理
- 自动发起现场签证或设计变更

#### 2.2 新增设备/材料型号采购
**需求描述**：
- 项目采购清单对比收入合同有新增时，预算员发起设计变更
- 支出合同与项目采购清单有新增时，采购员发起设计变更

#### 2.3 现场签证/设计变更
**需求描述**：
- 审批流程：项目经理→预算员→总经理

**待实现**：
```sql
CREATE TABLE change_requests (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  type TEXT NOT NULL,  -- 'over_purchase', 'new_material', 'site_visa', 'design_change'
  reason TEXT,
  before_content TEXT,
  after_content TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3. 项目启动会

#### 3.1 项目概况与关键里程碑
**需求描述**：
- 项目经理编制
- 审批流程：项目经理→总经理

#### 3.2 施工组织设计
**需求描述**：
- 审批流程：项目经理→总经理

#### 3.3 现场平面布置图
**需求描述**：
- 审批流程：项目经理→总经理

#### 3.4 开工申请
**需求描述**：
- 审批流程：项目经理（阅办）

**待实现**：
```sql
CREATE TABLE project_milestones (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  milestone_name TEXT NOT NULL,
  planned_date DATE,
  actual_date DATE,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 4. 工程进度监控

#### 4.1 设计进度监控
**需求描述**：
- 上传设计施工图技术交底答疑文件
- 生成电子看板（修改需求数/完成数/剩余数）
- 与设计变更流程联动

#### 4.2 施工进度监控
**需求描述**：
- 根据里程碑生成施工进度监控看板
- 进度条实时更新
- 进度落后自动预警（微信通知）
- 与对账单关联（弱相关）
- 与劳务提报工程量核算关联（强相关）

**待实现**：
```sql
CREATE TABLE progress_monitors (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  type TEXT NOT NULL,  -- 'design', 'construction'
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  remaining_items INTEGER DEFAULT 0,
  progress_percent DECIMAL(5,2) DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 5. 工程竣工管理

#### 5.1 劳务竣工结算
**需求描述**：
- 完整的竣工结算流程

#### 5.2 项目竣工结算

##### 5.2.1 工程竣工图纸审核
**需求描述**：
- 前置条件：设计进度监控中遗留问题清零
- 审批流程：预算员→项目经理→采购员→总经理

##### 5.2.2 工程竣工结算文件审核
**需求描述**：
- 前置条件：工程对账单全部生成
- 审批流程：预算员→项目经理→采购员→总经理

##### 5.2.3 工程竣工结算文档归档
**需求描述**：
- 签证和设计变更文件归档
- 工程洽商/技术核定单归档
- 图纸会审记录归档
- 工地会议纪要归档
- 工程档案及技术资料归档

**待实现**：
```sql
CREATE TABLE completion_docs (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL,  -- 'visa', 'design_change', 'technical_review', 'meeting_minutes', 'archive'
  file_path TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 6. 物资进销存管理增强

#### 6.1 批量采购入库校验
**需求描述**：
- 入库单与物资采购数量校验
- 超量/少量入库自动提醒

#### 6.2 零星采购预警
**需求描述**：
- 零星采购金额>批量采购1.5%时钉钉通知

#### 6.3 入库金额校验
**需求描述**：
- 入库金额≥合同金额：直接通过
- 入库金额<合同金额：需审批（采购员→财务→总经理）

#### 6.4 到货通知
**需求描述**：
- 入库完成后自动生成收货通知
- 钉钉推送：到货时间、快递单号、供应商联系、车牌信息

**待实现**：
```sql
CREATE TABLE goods_receipts (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  contract_id INTEGER NOT NULL,
  arrival_time DATETIME,
  tracking_number TEXT,
  supplier_contact TEXT,
  license_plate TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 7. 报表系统
**需求描述**：
- 形成业务报表
- 指定可见人

---

## 三、实施优先级

### P0（本周完成）
1. ⭐ 劳务提报工程量核算
2. ⭐ 超量采购申请
3. ⭐ 现场签证/设计变更
4. ⭐ 项目里程碑管理
5. ⭐ 工程进度监控看板

### P1（下周完成）
1. 📋 工程款申请（人工/物资）
2. 📋 项目启动会文档
3. 📋 竣工图纸审核
4. 📋 竣工结算文件审核
5. 📋 文档归档

### P2（后续优化）
1. 📊 设计进度监控
2. 📊 进度纠偏提醒
3. 📊 到货通知
4. 📊 报表系统
5. 📊 钉钉/微信通知

---

## 四、技术实现要点

### 1. 前置条件校验
```javascript
// 竣工图纸审核前置条件
if (designMonitor.remaining_items > 0) {
  throw new Error('设计进度监控中遗留问题未清零');
}

// 竣工结算文件审核前置条件
if (!allStatementsGenerated(project_id)) {
  throw new Error('工程对账单未全部生成');
}

// 劳务提报工程量校验
if (laborReport.amount > progressMonitor.amount) {
  throw new Error('申请产值高于施工进度比例');
}
```

### 2. 自动提醒机制
```javascript
// 进度落后提醒
if (actual_progress < planned_progress) {
  sendWechatNotification(projectTeam, '进度落后预警');
}

// 零星采购预警
if (sporadicAmount > bulkAmount * 0.015) {
  sendDingTalkNotification([buyer, finance], '零星采购超预算');
}
```

### 3. 强弱相关关联
```javascript
// 弱相关：施工进度 vs 对账单
if (statementAmount / contractAmount < progressPercent) {
  systemWarning('产值占比低于施工进度');
}

// 强相关：施工进度 vs 劳务提报
if (laborAmount / contractAmount > progressPercent) {
  systemError('无法发起审批流程');
}
```

---

## 五、数据库表设计

### 新增表（10个）
1. `labor_quantity_reports` - 劳务提报工程量核算
2. `change_requests` - 变更签证申请
3. `project_milestones` - 项目里程碑
4. `progress_monitors` - 进度监控
5. `completion_docs` - 竣工文档
6. `goods_receipts` - 到货通知
7. `design_qa_files` - 设计答疑文件
8. `project_startup_docs` - 项目启动文档
9. `payment_applications` - 工程款申请
10. `reports` - 报表

---

## 六、下一步行动

1. 创建新增表结构
2. 实现劳务提报工程量核算API
3. 实现变更签证管理API
4. 实现项目里程碑API
5. 实现进度监控看板
6. 添加前置条件校验
7. 添加自动提醒功能

---

*分析时间: 2026-03-05 16:00*
*分析人: 全能大龙虾🦞*
