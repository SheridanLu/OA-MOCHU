/**
 * 组织架构与权限管理 API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// ==================== 部门管理 ====================

// GET 部门树
router.get('/departments/tree', (req, res) => {
  try {
    const depts = db.prepare(`
      SELECT d.*, u.name as manager_name,
        (SELECT COUNT(*) FROM users WHERE department_id = d.id) as employee_count
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
      WHERE d.status = 'active'
      ORDER BY d.level, d.sort_order
    `).all();
    
    // 构建树形结构
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({ ...item, children: buildTree(items, item.id) }));
    };
    
    res.json(buildTree(depts));
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// POST 创建部门
router.post('/departments', (req, res) => {
  try {
    const { name, parent_id, level, sort_order, manager_id } = req.body;
    const result = db.prepare(
      'INSERT INTO departments (name, parent_id, level, sort_order, manager_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, parent_id, level || 2, sort_order || 0, manager_id);
    res.json({ id: result.lastInsertRowid, message: '创建成功' });
  } catch (e) {
    res.status(500).json({ error: '创建失败' });
  }
});

// PUT 更新部门
router.put('/departments/:id', (req, res) => {
  try {
    const { name, manager_id } = req.body;
    db.prepare('UPDATE departments SET name = ?, manager_id = ? WHERE id = ?').run(name, manager_id, req.params.id);
    res.json({ message: '更新成功' });
  } catch (e) {
    res.status(500).json({ error: '更新失败' });
  }
});

// ==================== 角色管理 ====================

// GET 角色列表
router.get('/roles', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM roles WHERE status = ? ORDER BY level DESC').all('active'));
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// ==================== 权限管理 ====================

// GET 权限列表
router.get('/permissions', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM permissions ORDER BY module, action').all());
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// POST 分配角色权限
router.post('/roles/:id/permissions', (req, res) => {
  try {
    const { permissions } = req.body;
    db.transaction(() => {
      db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(req.params.id);
      const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
      permissions.forEach(p => stmt.run(req.params.id, p));
    })();
    res.json({ message: '权限分配成功' });
  } catch (e) {
    res.status(500).json({ error: '分配失败' });
  }
});

// ==================== 用户管理（升级版）====================

// GET 用户列表（含部门、角色）
router.get('/users', (req, res) => {
  try {
    const { department_id, role_id, status } = req.query;
    let sql = `
      SELECT u.*, d.name as department_name, r.name as role_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params = [];
    if (department_id) { sql += ' AND u.department_id = ?'; params.push(department_id); }
    if (role_id) { sql += ' AND u.role_id = ?'; params.push(role_id); }
    if (status) { sql += ' AND u.status = ?'; params.push(status); }
    sql += ' ORDER BY u.department_id, u.id';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// POST 创建用户（入职）
router.post('/users', (req, res) => {
  try {
    const { username, password, name, email, phone, department_id, role_id, position, employee_no, hire_date, attachments } = req.body;
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(password || '123456', 10);
    
    const result = db.prepare(`
      INSERT INTO users (username, password, name, email, phone, department_id, role_id, position, employee_no, hire_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(username, hash, name, email, phone, department_id, role_id, position, employee_no, hire_date);
    
    // 创建入职审批
    const flowId = db.prepare('SELECT id FROM approval_flows WHERE business_type = ?').get('hr_onboard')?.id;
    if (flowId) {
      db.prepare('INSERT INTO approvals (flow_id, business_type, business_id, status) VALUES (?, ?, ?, ?)').run(flowId, 'hr_onboard', result.lastInsertRowid, 'pending');
    }
    
    res.json({ id: result.lastInsertRowid, message: '入职申请已提交，等待审批' });
  } catch (e) {
    res.status(500).json({ error: '创建失败' });
  }
});

// PUT 用户离职
router.put('/users/:id/resign', (req, res) => {
  try {
    const { reason } = req.body;
    db.prepare('UPDATE users SET status = ?, leave_date = DATE("now") WHERE id = ?').run('resigned', req.params.id);
    res.json({ message: '离职成功，权限已冻结' });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

// PUT FLAG标记（薪酬联动）
router.put('/users/:id/flag', (req, res) => {
  try {
    const { flagged } = req.body;
    db.prepare('UPDATE users SET flag_marked = ? WHERE id = ?').run(flagged ? 1 : 0, req.params.id);
    res.json({ message: '标记更新成功' });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

// GET 待生成工资表的标记用户
router.get('/users/flagged', (req, res) => {
  try {
    res.json(db.prepare(`
      SELECT u.*, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.flag_marked = 1 AND u.status = 'active'
    `).all());
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

module.exports = router;
