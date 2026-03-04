/**
 * 数据库初始化 - 终版需求
 * 2026-03-04 完整重构
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'oa.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==================== 组织架构与权限 ====================

// 部门表（树状结构）
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    level INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    manager_id INTEGER,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES departments(id)
  )
`);

// 角色表
db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 权限表
db.exec(`
  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    module TEXT,
    action TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 角色权限关联
db.exec(`
  CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id),
    UNIQUE(role_id, permission_id)
  )
`);

// 用户表升级
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department_id INTEGER,
    role_id INTEGER,
    position TEXT,
    employee_no TEXT,
    status TEXT DEFAULT 'active',
    hire_date DATE,
    leave_date DATE,
    flag_marked INTEGER DEFAULT 0,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
  )
`);

// ==================== 资质证书管理 ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS qualifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    cert_no TEXT,
    owner_type TEXT NOT NULL,
    owner_id INTEGER,
    owner_name TEXT,
    issue_date DATE,
    expire_date DATE NOT NULL,
    remind_months INTEGER DEFAULT 3,
    status TEXT DEFAULT 'valid',
    attachments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 资质提醒记录
db.exec(`
  CREATE TABLE IF NOT EXISTS qualification_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qualification_id INTEGER NOT NULL,
    remind_date DATE NOT NULL,
    sent INTEGER DEFAULT 0,
    handler_id INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (qualification_id) REFERENCES qualifications(id)
  )
`);

// ==================== 知识库 ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    uploader_id INTEGER NOT NULL,
    attachments TEXT,
    view_permissions TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploader_id) REFERENCES users(id)
  )
`);

// ==================== 工资与薪酬 ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS salary_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    base_salary DECIMAL(12,2) DEFAULT 0,
    bonus DECIMAL(12,2) DEFAULT 0,
    deduction DECIMAL(12,2) DEFAULT 0,
    actual_salary DECIMAL(12,2) DEFAULT 0,
    adjusted_by INTEGER,
    adjustment_note TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, year, month)
  )
`);

// ==================== 项目管理升级 ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    alias TEXT,
    type TEXT NOT NULL,
    location TEXT,
    party_a TEXT,
    party_a_contact TEXT,
    party_a_phone TEXT,
    contract_amount DECIMAL(14,2) DEFAULT 0,
    amount_no_tax DECIMAL(14,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(14,2) DEFAULT 0,
    contract_type TEXT,
    start_date DATE,
    end_date DATE,
    warranty_period INTEGER DEFAULT 0,
    virtual_limit DECIMAL(14,2),
    converted_from INTEGER,
    suspend_to_project INTEGER,
    status TEXT DEFAULT 'pending',
    progress_percent DECIMAL(5,2) DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (converted_from) REFERENCES projects(id),
    FOREIGN KEY (suspend_to_project) REFERENCES projects(id)
  )
`);

// 付款计划
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    batch_no INTEGER NOT NULL,
    planned_date DATE,
    amount DECIMAL(14,2) DEFAULT 0,
    actual_date DATE,
    actual_amount DECIMAL(14,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

// ==================== 合同管理升级 ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    project_id INTEGER,
    income_contract_id INTEGER,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    party_a TEXT,
    party_b TEXT,
    amount DECIMAL(14,2) DEFAULT 0,
    sign_date DATE,
    start_date DATE,
    end_date DATE,
    template_id INTEGER,
    attachments TEXT,
    status TEXT DEFAULT 'draft',
    input_window_check INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (income_contract_id) REFERENCES contracts(id)
  )
`);

// 合同物资清单
db.exec(`
  CREATE TABLE IF NOT EXISTS contract_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    material_name TEXT NOT NULL,
    spec TEXT,
    unit TEXT,
    quantity DECIMAL(10,2) DEFAULT 0,
    unit_price DECIMAL(10,2) DEFAULT 0,
    amount DECIMAL(14,2) DEFAULT 0,
    purchased_quantity DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
  )
`);

// ==================== 物资与进销存升级 ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    spec TEXT,
    unit TEXT,
    category TEXT,
    base_price DECIMAL(10,2) DEFAULT 0,
    project_id INTEGER,
    contract_id INTEGER,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
  )
`);

// 物资价格历史（基准价计算）
db.exec(`
  CREATE TABLE IF NOT EXISTS material_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    contract_id INTEGER,
    supplier TEXT,
    transaction_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id)
  )
`);

// 物资流水
db.exec(`
  CREATE TABLE IF NOT EXISTS material_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(14,2),
    supplier TEXT,
    contract_id INTEGER,
    photos TEXT,
    status TEXT DEFAULT 'pending',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (material_id) REFERENCES materials(id)
  )
`);

// ==================== 工程执行 ====================

// 工程对账单
db.exec(`
  CREATE TABLE IF NOT EXISTS statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    project_id INTEGER NOT NULL,
    contract_id INTEGER,
    period TEXT NOT NULL,
    amount DECIMAL(14,2) DEFAULT 0,
    work_progress DECIMAL(5,2) DEFAULT 0,
    content TEXT,
    attachments TEXT,
    status TEXT DEFAULT 'pending',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

// 工程款申请
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    project_id INTEGER NOT NULL,
    contract_id INTEGER,
    statement_id INTEGER,
    type TEXT NOT NULL,
    amount DECIMAL(14,2) DEFAULT 0,
    work_value DECIMAL(14,2) DEFAULT 0,
    content TEXT,
    attachments TEXT,
    status TEXT DEFAULT 'pending',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (statement_id) REFERENCES statements(id)
  )
`);

// ==================== 变更签证 ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    project_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    amount DECIMAL(14,2) DEFAULT 0,
    attachments TEXT,
    status TEXT DEFAULT 'pending',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

// ==================== 审批流 ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS approval_flows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS approval_flow_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flow_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    role_code TEXT NOT NULL,
    is_required INTEGER DEFAULT 1,
    timeout_hours INTEGER,
    FOREIGN KEY (flow_id) REFERENCES approval_flows(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flow_id INTEGER,
    business_type TEXT NOT NULL,
    business_id INTEGER NOT NULL,
    current_step INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (flow_id) REFERENCES approval_flows(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS approval_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    approval_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    approver_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (approval_id) REFERENCES approvals(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
  )
`);

// ==================== 竣工管理 ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS completion_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    attachments TEXT,
    status TEXT DEFAULT 'pending',
    design_issues_cleared INTEGER DEFAULT 0,
    all_statements_generated INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

// ==================== 初始化基础数据 ====================

// 初始化部门
const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get().count;
if (deptCount === 0) {
  const insertDept = db.prepare('INSERT INTO departments (name, parent_id, level, sort_order) VALUES (?, ?, ?, ?)');
  insertDept.run('总经理', null, 1, 1);
  insertDept.run('工程项目管理部', 1, 2, 2);
  insertDept.run('基础业务部', 1, 2, 3);
  insertDept.run('软件业务部', 1, 2, 4);
  insertDept.run('财务/综合部', 1, 2, 5);
  insertDept.run('技术支撑部', 1, 2, 6);
}

// 初始化角色
const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').get().count;
if (roleCount === 0) {
  const insertRole = db.prepare('INSERT INTO roles (code, name, level, description) VALUES (?, ?, ?, ?)');
  insertRole.run('ceo', '总经理', 100, '最高管理者');
  insertRole.run('finance', '财务人员', 50, '财务管理');
  insertRole.run('budget', '预算员', 40, '预算管理');
  insertRole.run('buyer', '采购员', 30, '采购管理');
  insertRole.run('archivist', '资料员', 20, '资料管理');
  insertRole.run('pm', '项目经理', 35, '项目管理');
  insertRole.run('staff', '普通员工', 10, '普通员工');
}

// 初始化用户
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  const insertUser = db.prepare('INSERT INTO users (username, password, name, department_id, role_id, position) VALUES (?, ?, ?, ?, ?, ?)');
  insertUser.run('admin', hash, '系统管理员', 1, 1, '总经理');
  insertUser.run('zhangsan', bcrypt.hashSync('123456', 10), '张三', 2, 6, '项目经理');
  insertUser.run('lisi', bcrypt.hashSync('123456', 10), '李四', 2, 3, '预算员');
  insertUser.run('wangwu', bcrypt.hashSync('123456', 10), '王五', 2, 4, '采购员');
  insertUser.run('zhaoliu', bcrypt.hashSync('123456', 10), '赵六', 2, 5, '资料员');
  insertUser.run('sunqi', bcrypt.hashSync('123456', 10), '孙七', 5, 2, '财务人员');
}

// 初始化审批流
const flowCount = db.prepare('SELECT COUNT(*) as count FROM approval_flows').get().count;
if (flowCount === 0) {
  const insertFlow = db.prepare('INSERT INTO approval_flows (code, name, business_type) VALUES (?, ?, ?)');
  const insertStep = db.prepare('INSERT INTO approval_flow_steps (flow_id, step_number, role_code, is_required) VALUES (?, ?, ?, ?)');
  
  // 项目立项
  let result = insertFlow.run('FLOW_PROJECT', '项目立项审批', 'project');
  insertStep.run(result.lastInsertRowid, 1, 'finance', 1);
  insertStep.run(result.lastInsertRowid, 2, 'ceo', 1);
  
  // 收入合同
  result = insertFlow.run('FLOW_CONTRACT_INCOME', '收入合同审批', 'contract_income');
  insertStep.run(result.lastInsertRowid, 1, 'finance', 1);
  insertStep.run(result.lastInsertRowid, 2, 'archivist', 1);
  insertStep.run(result.lastInsertRowid, 3, 'ceo', 1);
  
  // 支出合同
  result = insertFlow.run('FLOW_CONTRACT_EXPENSE', '支出合同审批', 'contract_expense');
  insertStep.run(result.lastInsertRowid, 1, 'budget', 0); // 采购量超标时需要
  insertStep.run(result.lastInsertRowid, 2, 'finance', 1);
  insertStep.run(result.lastInsertRowid, 3, 'archivist', 1);
  insertStep.run(result.lastInsertRowid, 4, 'ceo', 1);
  
  // 变更签证
  result = insertFlow.run('FLOW_CHANGE', '变更签证审批', 'change');
  insertStep.run(result.lastInsertRowid, 1, 'budget', 1);
  insertStep.run(result.lastInsertRowid, 2, 'buyer', 1);
  insertStep.run(result.lastInsertRowid, 3, 'ceo', 1);
  
  // 付款申请
  result = insertFlow.run('FLOW_PAYMENT', '付款申请审批', 'payment');
  insertStep.run(result.lastInsertRowid, 1, 'buyer', 1);
  insertStep.run(result.lastInsertRowid, 2, 'budget', 1);
  insertStep.run(result.lastInsertRowid, 3, 'finance', 1);
  insertStep.run(result.lastInsertRowid, 4, 'ceo', 1);
}

console.log('✅ 数据库初始化完成');

module.exports = db;
