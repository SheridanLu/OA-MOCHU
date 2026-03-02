/**
 * 数据库初始化脚本
 * 工程项目管理OA系统
 * 
 * 运行: npm run db:init
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/oa.db');

// 确保目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('📦 初始化数据库...');
console.log('   路径:', DB_PATH);
console.log('');

// ============================================
// 1. 基础组织架构
// ============================================

console.log('创建组织架构表...');

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
  avatar TEXT,
  annual_leave REAL DEFAULT 10,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, role_id)
)`);

// ============================================
// 2. 项目管理
// ============================================

console.log('创建项目管理表...');

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
  virtual_to_entity INTEGER,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS project_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member',
  join_date DATE,
  leave_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
)`);

// ============================================
// 3. 合同管理
// ============================================

console.log('创建合同管理表...');

db.exec(`CREATE TABLE IF NOT EXISTS contract_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  fields TEXT,
  is_party_a_template INTEGER DEFAULT 0,
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
  amount REAL NOT NULL DEFAULT 0,
  sign_date DATE,
  start_date DATE,
  end_date DATE,
  template_id INTEGER,
  content TEXT,
  attachments TEXT,
  status TEXT DEFAULT 'draft',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// ============================================
// 4. 审批流程
// ============================================

console.log('创建审批流程表...');

db.exec(`CREATE TABLE IF NOT EXISTS approval_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS approval_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id INTEGER NOT NULL,
  step_number INTEGER NOT NULL,
  role_code TEXT,
  user_id INTEGER,
  action TEXT,
  comment TEXT,
  acted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// ============================================
// 5. 通知系统
// ============================================

console.log('创建通知系统表...');

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

console.log('✅ 所有表创建完成');
console.log('');

// ============================================
// 插入初始数据
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
  console.log('   ✓ 部门数据');

  // 角色
  const roleStmt = db.prepare('INSERT INTO roles (name, code, description) VALUES (?, ?, ?)');
  roleStmt.run('总经理', 'ceo', '公司最高管理者');
  roleStmt.run('财务人员', 'finance', '负责财务审批');
  roleStmt.run('采购员', 'buyer', '负责采购和合同');
  roleStmt.run('预算员', 'estimator', '负责预算管理');
  roleStmt.run('项目经理', 'pm', '负责项目管理');
  roleStmt.run('资料员', 'clerk', '负责文档管理');
  roleStmt.run('综合人员', 'admin', '负责综合事务');
  roleStmt.run('普通员工', 'employee', '普通员工');
  console.log('   ✓ 角色数据');

  // 密码
  const adminPwd = bcrypt.hashSync('admin123', 10);
  const userPwd = bcrypt.hashSync('123456', 10);

  // 用户
  const userStmt = db.prepare(`
    INSERT INTO users (username, password, name, email, phone, department_id, position, role, annual_leave)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  userStmt.run('admin', adminPwd, '系统管理员', 'admin@company.com', '13800000001', 1, '总经理', 'admin', 15);
  userStmt.run('zhangsan', userPwd, '张三', 'zhangsan@company.com', '13800000002', 2, '项目经理', 'manager', 12);
  userStmt.run('lisi', userPwd, '李四', 'lisi@company.com', '13800000003', 2, '预算员', 'employee', 10);
  userStmt.run('wangwu', userPwd, '王五', 'wangwu@company.com', '13800000004', 2, '采购员', 'employee', 10);
  userStmt.run('zhaoliu', userPwd, '赵六', 'zhaoliu@company.com', '13800000005', 2, '资料员', 'employee', 10);
  userStmt.run('sunqi', userPwd, '孙七', 'sunqi@company.com', '13800000006', 3, '财务主管', 'manager', 12);
  userStmt.run('zhouba', userPwd, '周八', 'zhouba@company.com', '13800000007', 3, '综合专员', 'employee', 10);
  console.log('   ✓ 用户数据');

  // 部门主管
  db.prepare('UPDATE departments SET manager_id = 1 WHERE id = 1').run();
  db.prepare('UPDATE departments SET manager_id = 2 WHERE id = 2').run();
  db.prepare('UPDATE departments SET manager_id = 6 WHERE id = 3').run();
  console.log('   ✓ 部门主管');

  // 用户角色
  const urStmt = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
  urStmt.run(1, 1); // admin -> ceo
  urStmt.run(2, 5); // zhangsan -> pm
  urStmt.run(3, 4); // lisi -> estimator
  urStmt.run(4, 3); // wangwu -> buyer
  urStmt.run(5, 6); // zhaoliu -> clerk
  urStmt.run(6, 2); // sunqi -> finance
  urStmt.run(7, 7); // zhouba -> admin
  console.log('   ✓ 用户角色');

  console.log('');
  console.log('📋 测试账号:');
  console.log('   admin / admin123 (总经理)');
  console.log('   zhangsan / 123456 (项目经理)');
  console.log('   lisi / 123456 (预算员)');
  console.log('   wangwu / 123456 (采购员)');
  console.log('   sunqi / 123456 (财务)');
} else {
  console.log('ℹ️  数据库已有数据，跳过初始化');
}

db.close();
console.log('');
console.log('🎉 数据库初始化完成！');
