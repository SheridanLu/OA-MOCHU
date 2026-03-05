# OA系统需求对标任务清单

> 基于2026-03-05 17:20 完整需求文档
> 目标：实现所有需求功能

---

## 📊 需求实现情况总览

### ✅ 已完成（14/18 模块 = 78%）

1. ✅ **登录系统**
2. ✅ **组织架构**（7个部门）
3. ✅ **人力资源管理**
   - 入职/离职
   - 薪资/社保
   - 资产移交
   - 从业资质
4. ✅ **项目立项**
   - 实体项目（10位编号）
   - 虚拟项目（8位编号）
   - 虚拟转实体
   - 虚拟中止
5. ✅ **合同管理**
   - 收入合同
   - 支出合同
   - 时间窗校验
6. ✅ **审批流引擎**
7. ✅ **报表系统**（5个核心报表）
8. ✅ **权限系统**（32个权限/7个角色）
9. ✅ **资质管理**（公司/人员资质+到期预警）
10. ✅ **知识库**
11. ✅ **资产管理**
12. ✅ **进销存管理**（采购/入库/出库/退库）
13. ✅ **施工管理**（对账单/工程款）
14. ✅ **数据库备份**（自动备份+监控）

---

### ⚠️ 需补充（4/18 模块）

1. ⚠️ **通讯录管理**
2. ⚠️ **企业邮箱集成**
3. ⚠️ **合同模板管理**
4. ⚠️ **工程项目全周期管理**

---

## 🎯 Phase 12: 需求对标任务

### TASK-110: 通讯录FLAG打标 [x]
**需求**：
- 通讯录FLAG打标
- 自动生成工资表
- 财务可手动调整
- 总经理审核后进入打款流程

**实现方案**：
```sql
ALTER TABLE users ADD COLUMN flag TEXT;
ALTER TABLE users ADD COLUMN salary_flag BOOLEAN DEFAULT 0;
```

---

### TASK-111: 合同模板管理 [x]
**需求**：
1. **实体项目收入合同模板录入**
   - 甲方拟定：采购员→总经理
   - 非甲方拟定：采购员→财务→法务→总经理

2. **实体项目支出合同模板录入**（每月25-30日）
   - 采购员→财务→法务→总经理

3. **虚拟项目支出合同模板录入**
   - 采购员→财务→法务→总经理

**实现方案**：
```sql
CREATE TABLE contract_templates (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- income/expense
  is_party_a_draft BOOLEAN DEFAULT 0,
  content TEXT,
  created_by INTEGER,
  status TEXT DEFAULT 'pending',
  created_at DATETIME
);
```

---

### TASK-112: 法务角色和审批流调整 [ ]
**需求**：
- 添加法务角色
- 合同审批流程调整

**实现方案**：
```sql
INSERT INTO roles (name, description) VALUES ('法务人员', '合同法务审核');
INSERT INTO permissions (code, name, module) VALUES ('contract:legal_review', '法务审核合同', '合同管理');
```

---

### TASK-113: 项目预算管理 [x]
**需求**：
- 投标前初步预算（Excel导入）
- 投标预算
- 成本分析
- 项目采购清单
- 建立材料价格信息库

**实现方案**：
```sql
CREATE TABLE project_budgets (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  budget_type TEXT NOT NULL,  -- preliminary/bidding/final
  total_amount DECIMAL(14,2),
  excel_file TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME
);
```

---

### TASK-114: 材料价格信息库 [ ]
**需求**：
- 所有实体交易采购价格纳入
- 历次采购最低价作为基准价
- 高于基准价时提醒采购员确认

**实现方案**：
```sql
CREATE TABLE material_price_library (
  id INTEGER PRIMARY KEY,
  material_id INTEGER NOT NULL,
  project_id INTEGER,
  contract_id INTEGER,
  unit_price DECIMAL(10,2) NOT NULL,
  is_baseline BOOLEAN DEFAULT 0,
  purchase_date DATE,
  created_at DATETIME
);
```

---

### TASK-115: 劳务提报工程量核算 [ ]
**需求**：
- 项目经理完成初步核算
- 隐蔽工程照片
- 已完工工程量计算式
- 工程对账单关联
- 审批流程：项目经理→预算员→财务→总经理

**实现方案**：
- 表已存在：`labor_quantity_reports`
- API已创建
- 需要前端页面

---

### TASK-116: 变更签证管理 [ ]
**需求**：
1. **超量采购申请**
   - 采购物资>支出合同清单>项目采购清单
   - 预算员勾选（合同范围内调整/现场签证/设计变更）
   - 审批：项目经理→预算员→采购员→总经理

2. **新增设备/材料型号**
   - 项目采购清单vs收入合同清单
   - 审批：预算员/采购员→项目经理→采购员/预算员→总经理

3. **现场签证/设计变更**
   - 审批：项目经理→预算员→总经理

**实现方案**：
- 表已存在：`change_requests`
- API已创建
- 需要前端页面

---

### TASK-117: 项目启动会管理 [x]
**需求**：
1. **关键里程碑编制**
   - 项目经理→总经理（预算员/采购员/资料员/财务阅办）

2. **施工组织设计**
   - 项目经理→总经理

3. **现场平面布置图**
   - 项目经理→总经理

4. **开工申请**
   - 项目经理（预算员/采购员/资料员/财务阅办）

5. **明确项目团队关键干系人**
   - 用于微信通知设置

**实现方案**：
- 表已存在：`project_startup_docs`
- 表已存在：`project_milestones`
- 需要API和前端

---

### TASK-118: 进度监控看板 [x]
**需求**：
1. **设计进度监控**
   - 上传设计施工图技术交底答疑文件
   - 电子看板（修改需求数/完成数/剩余数）
   - 与设计变更流程联动

2. **施工进度监控**
   - 里程碑生成进度看板
   - 进度条可视化
   - 进度落后预警（微信通知）
   - 与对账单弱相关
   - 与劳务提报强相关

**实现方案**：
- 表已存在：`progress_monitors`
- 表已存在：`design_qa_files`
- 需要API和前端

---

### TASK-119: 竣工管理 [x]
**需求**：
1. **劳务竣工结算**
2. **项目竣工结算**
   - 竣工图纸审核（前置：设计进度监控中遗留问题清零）
   - 竣工结算文件审核（前置：工程对账单全部生成）
   - 文档归档

**实现方案**：
- 表已存在：`completion_docs`
- 需要API和前端
- 需要前置条件校验

---

### TASK-120: 物资进销存增强 [ ]
**需求**：
1. **批量采购**
   - 入库单与采购数量校验
   - 超量/少量入库提醒

2. **零星采购**
   - 手动输入
   - 零星采购>批量采购1.5%时钉钉提醒

3. **采购物资入库**
   - 大于等于合同金额：直接通过
   - 小于合同金额：需审批（采购员→财务→总经理）
   - 自动生成收货通知（钉钉推送）

4. **采购物资出库**
   - 项目经理上传现场到货单、照片
   - 采购人员手动输入（软件/非实物）

5. **采购物资退库**
   - 现场盘点结余物料
   - 处置方式（现场处理/退回厂家/入公司通用库/项目间调拨）

**实现方案**：
- 表已存在：`goods_receipts`
- 需要增强API
- 需要前端页面

---

## 📊 任务统计

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| TASK-110 通讯录FLAG | P0 | 0.5天 |
| TASK-111 合同模板 | P0 | 1天 |
| TASK-112 法务角色 | P0 | 0.5天 |
| TASK-113 项目预算 | P1 | 1天 |
| TASK-114 材料价格库 | P1 | 0.5天 |
| TASK-115 劳务提报 | P0 | 0.5天（API已有） |
| TASK-116 变更签证 | P0 | 0.5天（API已有） |
| TASK-117 项目启动 | P0 | 1天 |
| TASK-118 进度监控 | P0 | 1天 |
| TASK-119 竣工管理 | P0 | 1天 |
| TASK-120 进销存增强 | P1 | 1天 |
| **总计** | - | **8.5天** |

---

## 🎯 实施计划

### Week 1 (3天)
- Day 1: TASK-110, TASK-112
- Day 2: TASK-111
- Day 3: TASK-115, TASK-116

### Week 2 (3天)
- Day 1: TASK-117
- Day 2: TASK-118
- Day 3: TASK-119

### Week 3 (2.5天)
- Day 1: TASK-113
- Day 2: TASK-114, TASK-120

---

*创建时间: 2026-03-05 17:20*
*版本: 4.2.0*
