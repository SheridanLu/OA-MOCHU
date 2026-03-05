/**
 * 工程项目全周期管理 - 数据库扩展
 */

-- ============================================
-- 1. 劳务提报工程量核算
-- ============================================
CREATE TABLE IF NOT EXISTS labor_quantity_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  contract_id INTEGER NOT NULL,
  statement_id INTEGER,              -- 关联工程对账单
  report_no TEXT UNIQUE,             -- 报告编号
  photos TEXT,                       -- 隐蔽工程照片（JSON）
  calculation_formula TEXT,          -- 工程量计算式
  quantity DECIMAL(10,2) NOT NULL,   -- 工程量
  unit_price DECIMAL(10,2),          -- 单价
  amount DECIMAL(14,2) NOT NULL,     -- 金额
  description TEXT,                  -- 说明
  status TEXT DEFAULT 'pending',     -- pending/approved/rejected
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (statement_id) REFERENCES statements(id)
);

CREATE INDEX idx_labor_reports_project ON labor_quantity_reports(project_id);
CREATE INDEX idx_labor_reports_status ON labor_quantity_reports(status);

-- ============================================
-- 2. 变更签证管理
-- ============================================
CREATE TABLE IF NOT EXISTS change_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  contract_id INTEGER,
  request_no TEXT UNIQUE,            -- 申请编号
  type TEXT NOT NULL,                -- over_purchase/new_material/site_visa/design_change
  reason TEXT NOT NULL,              -- 变更原因
  before_content TEXT,               -- 变更前内容
  after_content TEXT,                -- 变更后内容
  attachments TEXT,                  -- 附件（JSON）
  impact_cost DECIMAL(14,2),         -- 影响成本
  impact_schedule INTEGER,           -- 影响工期（天）
  status TEXT DEFAULT 'pending',     -- pending/approved/rejected
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

CREATE INDEX idx_change_requests_project ON change_requests(project_id);
CREATE INDEX idx_change_requests_type ON change_requests(type);
CREATE INDEX idx_change_requests_status ON change_requests(status);

-- ============================================
-- 3. 项目里程碑
-- ============================================
CREATE TABLE IF NOT EXISTS project_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  milestone_name TEXT NOT NULL,      -- 里程碑名称
  milestone_type TEXT,               -- 里程碑类型
  planned_start_date DATE,           -- 计划开始日期
  planned_end_date DATE,             -- 计划结束日期
  actual_start_date DATE,            -- 实际开始日期
  actual_end_date DATE,              -- 实际结束日期
  progress_percent DECIMAL(5,2) DEFAULT 0,  -- 完成百分比
  responsible_user_id INTEGER,       -- 负责人
  status TEXT DEFAULT 'pending',     -- pending/in_progress/completed/delayed
  description TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (responsible_user_id) REFERENCES users(id)
);

CREATE INDEX idx_milestones_project ON project_milestones(project_id);
CREATE INDEX idx_milestones_status ON project_milestones(status);

-- ============================================
-- 4. 进度监控
-- ============================================
CREATE TABLE IF NOT EXISTS progress_monitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  type TEXT NOT NULL,                -- design/construction
  total_items INTEGER DEFAULT 0,     -- 总项目数
  completed_items INTEGER DEFAULT 0, -- 已完成数
  remaining_items INTEGER DEFAULT 0, -- 剩余数
  progress_percent DECIMAL(5,2) DEFAULT 0,  -- 进度百分比
  last_updated_by INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_progress_monitors_project ON progress_monitors(project_id);
CREATE INDEX idx_progress_monitors_type ON progress_monitors(type);

-- ============================================
-- 5. 设计答疑文件
-- ============================================
CREATE TABLE IF NOT EXISTS design_qa_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,                    -- technical_review/qa_document
  upload_by INTEGER NOT NULL,
  upload_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_final BOOLEAN DEFAULT 0,        -- 是否为正式答疑文档
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_design_qa_project ON design_qa_files(project_id);

-- ============================================
-- 6. 项目启动文档
-- ============================================
CREATE TABLE IF NOT EXISTS project_startup_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL,            -- overview/milestone/construction_design/site_plan/start_application
  title TEXT NOT NULL,
  content TEXT,                      -- 文档内容
  attachments TEXT,                  -- 附件（JSON）
  status TEXT DEFAULT 'pending',     -- pending/approved/rejected
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_startup_docs_project ON project_startup_docs(project_id);
CREATE INDEX idx_startup_docs_type ON project_startup_docs(doc_type);

-- ============================================
-- 7. 竣工文档
-- ============================================
CREATE TABLE IF NOT EXISTS completion_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL,            -- visa/design_change/technical_review/meeting_minutes/archive/drawing/settlement
  doc_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT DEFAULT 'pending',     -- pending/approved/archived
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_completion_docs_project ON completion_docs(project_id);
CREATE INDEX idx_completion_docs_type ON completion_docs(doc_type);

-- ============================================
-- 8. 到货通知
-- ============================================
CREATE TABLE IF NOT EXISTS goods_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  contract_id INTEGER NOT NULL,
  receipt_no TEXT UNIQUE,            -- 收货单号
  arrival_time DATETIME,             -- 到货时间
  tracking_number TEXT,              -- 快递/物流单号
  supplier_contact TEXT,             -- 供应商联系
  license_plate TEXT,                -- 车牌信息
  receiver_id INTEGER,               -- 接收人
  receive_time DATETIME,             -- 接收时间
  status TEXT DEFAULT 'pending',     -- pending/received/confirmed
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

CREATE INDEX idx_goods_receipts_project ON goods_receipts(project_id);
CREATE INDEX idx_goods_receipts_status ON goods_receipts(status);

-- ============================================
-- 9. 工程款申请（增强版）
-- ============================================
CREATE TABLE IF NOT EXISTS payment_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  contract_id INTEGER NOT NULL,
  application_no TEXT UNIQUE,        -- 申请编号
  application_type TEXT NOT NULL,    -- progress/labor/material
  amount DECIMAL(14,2) NOT NULL,     -- 申请金额
  labor_report_id INTEGER,           -- 关联劳务提报（人工费）
  statement_id INTEGER,              -- 关联对账单
  description TEXT,
  attachments TEXT,                  -- 附件清单（JSON）
  status TEXT DEFAULT 'pending',     -- pending/approved/rejected/paid
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (labor_report_id) REFERENCES labor_quantity_reports(id),
  FOREIGN KEY (statement_id) REFERENCES statements(id)
);

CREATE INDEX idx_payment_applications_project ON payment_applications(project_id);
CREATE INDEX idx_payment_applications_type ON payment_applications(application_type);
CREATE INDEX idx_payment_applications_status ON payment_applications(status);

-- ============================================
-- 10. 报表配置
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL,         -- project/financial/material/construction
  report_config TEXT,                -- 报表配置（JSON）
  visible_to TEXT,                   -- 可见人（JSON数组，用户ID）
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_reports_type ON reports(report_type);

-- ============================================
-- 11. 系统提醒
-- ============================================
CREATE TABLE IF NOT EXISTS system_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,                -- warning/task/approval
  title TEXT NOT NULL,
  content TEXT,
  link TEXT,                         -- 跳转链接
  is_read BOOLEAN DEFAULT 0,
  sent_via TEXT,                     -- system/wechat/dingtalk/email
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_notifications_user ON system_notifications(user_id);
CREATE INDEX idx_notifications_read ON system_notifications(is_read);

-- ============================================
-- 插入审批流配置
-- ============================================
INSERT OR IGNORE INTO approval_flows (name, business_type, steps, status) VALUES
('劳务提报工程量核算', 'labor_quantity_report', '["项目经理","预算员","财务人员","总经理"]', 'active'),
('变更签证申请', 'change_request', '["项目经理","预算员","总经理"]', 'active'),
('项目里程碑', 'project_milestone', '["项目经理","总经理"]', 'active'),
('项目启动文档', 'project_startup_doc', '["项目经理","总经理"]', 'active'),
('竣工图纸审核', 'completion_drawing', '["预算员","项目经理","采购员","总经理"]', 'active'),
('竣工结算文件', 'completion_settlement', '["预算员","项目经理","采购员","总经理"]', 'active'),
('工程款申请（进度款）', 'payment_progress', '["预算员","财务人员","总经理"]', 'active'),
('工程款申请（人工费）', 'payment_labor', '["项目经理","采购员","财务人员","总经理"]', 'active'),
('工程款申请（物资款）', 'payment_material', '["项目经理","采购员","财务人员","总经理"]', 'active');

-- ============================================
-- 添加法务角色
-- ============================================
INSERT OR IGNORE INTO roles (name, description) VALUES ('法务人员', '合同法务审核');

-- ============================================
-- 添加法务权限
-- ============================================
INSERT OR IGNORE INTO permissions (code, name, module) VALUES
('contract:legal_review', '法务审核合同', '合同管理');

-- ============================================
-- 为法务角色分配权限
-- ============================================
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = '法务人员' AND p.code = 'contract:legal_review';
