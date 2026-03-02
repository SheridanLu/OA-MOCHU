-- ============================================
-- OA 系统数据库 Schema
-- 数据库: SQLite
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department_id INTEGER,
    role TEXT DEFAULT 'employee', -- admin, manager, employee
    avatar TEXT,
    annual_leave INTEGER DEFAULT 10, -- 年假余额（天）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    manager_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES departments(id),
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- 请假表
CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- annual, sick, personal, other
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days REAL NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, cancelled
    approver_id INTEGER,
    approve_comment TEXT,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- 报销表
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- travel, meal, transport, office, other
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'CNY',
    description TEXT,
    receipt_url TEXT, -- 发票图片
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, paid
    approver_id INTEGER,
    approve_comment TEXT,
    approved_at DATETIME,
    finance_id INTEGER, -- 财务确认人
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approver_id) REFERENCES users(id),
    FOREIGN KEY (finance_id) REFERENCES users(id)
);

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    scope TEXT DEFAULT 'all', -- all, department
    department_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 公告阅读记录
CREATE TABLE IF NOT EXISTS announcement_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    announcement_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(announcement_id, user_id),
    FOREIGN KEY (announcement_id) REFERENCES announcements(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- leave, expense, announcement, system
    title TEXT NOT NULL,
    content TEXT,
    link TEXT, -- 点击跳转的链接
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- 初始数据
-- ============================================

-- 插入默认部门
INSERT INTO departments (name, parent_id) VALUES 
    ('总公司', NULL),
    ('技术部', 1),
    ('人事部', 1),
    ('财务部', 1),
    ('市场部', 1);

-- 插入默认管理员 (密码: admin123，实际使用需要 hash)
-- 注意：实际部署时请使用 bcrypt hash
INSERT INTO users (username, password, name, email, department_id, role, annual_leave) VALUES 
    ('admin', '$2b$10$placeholder_hash_change_me', '系统管理员', 'admin@company.com', 1, 'admin', 15),
    ('manager1', '$2b$10$placeholder_hash_change_me', '张经理', 'zhang@company.com', 2, 'manager', 12),
    ('employee1', '$2b$10$placeholder_hash_change_me', '李员工', 'li@company.com', 2, 'employee', 10);

-- 更新部门主管
UPDATE departments SET manager_id = 2 WHERE id = 2;
