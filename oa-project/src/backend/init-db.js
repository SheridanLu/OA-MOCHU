/**
 * 工程项目管理系统 - 完整数据库
 * 基于 PPT 需求文档
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/oa.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('📦 初始化工程项目管理数据库...');

// ============================================
// 1. 组织架构
// ============================================
db.exec(`CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT,
  parent_id INTEGER,
  manager_id INTEGER,
  type TEXT DEFAULT 'normal',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department_id INTEGER,
  position TEXT,
  role TEXT DEFAULT 'employee',
  annual_leave REAL DEFAULT 10,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT
)`);

// ============================================
// 2. 项目管理
// ============================================
db.exec(`CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  alias TEXT,
  type TEXT NOT NULL DEFAULT 'entity',
  location TEXT,
  party_a TEXT,
  party_a_contact TEXT,
  party_a_phone TEXT,
  contract_amount REAL DEFAULT 0,
  amount_no_tax REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  contract_type TEXT,
  start_date DATE,
  end_date DATE,
  warranty_period INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  virtual_limit REAL,
  converted_from INTEGER,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS project_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member',
  UNIQUE(project_id, user_id)
)`);

// ============================================
// 3. 合同管理
// ============================================
db.exec(`CREATE TABLE IF NOT EXISTS contract_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  content TEXT,
  fields TEXT,
  is_party_a INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  project_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  party_a TEXT,
  party_b TEXT,
  amount REAL DEFAULT 0,
  sign_date DATE,
  start_date DATE,
  end_date DATE,
  template_id INTEGER,
  attachments TEXT,
  status TEXT DEFAULT 'draft',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS contract_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  material_name TEXT NOT NULL,
  spec TEXT,
  unit TEXT,
  quantity REAL DEFAULT 0,
  price REAL DEFAULT 0,
  amount REAL DEFAULT 0
)`);

// ============================================
// 4. 施工管理
// ============================================
db.exec(`CREATE TABLE IF NOT EXISTS statements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  project_id INTEGER NOT NULL,
  contract_id INTEGER,
  period TEXT NOT NULL,
  amount REAL DEFAULT 0,
  content TEXT,
  attachments TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS payment_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  project_id INTEGER NOT NULL,
  contract_id INTEGER,
  type TEXT NOT NULL,
  amount REAL DEFAULT 0,
  content TEXT,
  attachments TEXT,
  statement_id INTEGER,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// ============================================
// 5. 物资管理
// ============================================
db.exec(`CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  contract_id INTEGER,
  name TEXT NOT NULL,
  spec TEXT,
  unit TEXT,
  category TEXT,
  base_price REAL DEFAULT 0,
  last_price REAL DEFAULT 0
)`);

db.exec(`CREATE TABLE IF NOT EXISTS material_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  material_id INTEGER,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  price REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  supplier TEXT,
  contract_id INTEGER,
  photos TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// ============================================
// 6. 变更管理
// ============================================
db.exec(`CREATE TABLE IF NOT EXISTS change_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  amount REAL DEFAULT 0,
  attachments TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// ============================================
// 7. 审批流程
// ============================================
db.exec(`CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  entity_type TEXT,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS approval_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  approval_id INTEGER NOT NULL,
  step_number INTEGER NOT NULL,
  role_code TEXT,
  user_id INTEGER,
  action TEXT,
  comment TEXT,
  acted_at DATETIME
)`);

// ============================================
// 8. 通知
// ============================================
db.exec(`CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT,
  title TEXT NOT NULL,
  content TEXT,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

console.log('✅ 数据库表创建完成');

// ============================================
// 初始数据
// ============================================
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  console.log('📝 插入初始数据...');
  
  // 部门
  const deptStmt = db.prepare('INSERT INTO departments (name, code, parent_id, type) VALUES (?, ?, ?, ?)');
  deptStmt.run('总公司', 'HQ', null, 'admin');
  deptStmt.run('工程项目管理部', 'ENG', 1, 'engineering');
  deptStmt.run('财务综合部', 'FIN', 1, 'finance');
  deptStmt.run('基础业务部', 'BIZ', 1, 'business');
  deptStmt.run('软件业务部', 'SOFT', 1, 'software');
  deptStmt.run('技术支撑部', 'TECH', 1, 'tech');

  // 角色
  const roleStmt = db.prepare('INSERT INTO roles (name, code) VALUES (?, ?)');
  roleStmt.run('总经理', 'ceo');
  roleStmt.run('财务人员', 'finance');
  roleStmt.run('采购员', 'buyer');
  roleStmt.run('预算员', 'estimator');
  roleStmt.run('项目经理', 'pm');
  roleStmt.run('资料员', 'clerk');

  // 用户
  const adminPwd = bcrypt.hashSync('admin123', 10);
  const userPwd = bcrypt.hashSync('123456', 10);
  const userStmt = db.prepare('INSERT INTO users (username, password, name, email, phone, department_id, position, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  
  userStmt.run('admin', adminPwd, '系统管理员', 'admin@company.com', '13800000001', 1, '总经理', 'admin');
  userStmt.run('zhangsan', userPwd, '张三', 'zhangsan@company.com', '13800000002', 2, '项目经理', 'pm');
  userStmt.run('lisi', userPwd, '李四', 'lisi@company.com', '13800000003', 2, '预算员', 'estimator');
  userStmt.run('wangwu', userPwd, '王五', 'wangwu@company.com', '13800000004', 2, '采购员', 'buyer');
  userStmt.run('zhaoliu', userPwd, '赵六', 'zhaoliu@company.com', '13800000005', 2, '资料员', 'clerk');
  userStmt.run('sunqi', userPwd, '孙七', 'sunqi@company.com', '13800000006', 3, '财务主管', 'finance');

  console.log('✅ 初始数据完成');
  console.log('📋 测试账号: admin / admin123');
}

db.close();
console.log('🎉 数据库初始化完成！');
