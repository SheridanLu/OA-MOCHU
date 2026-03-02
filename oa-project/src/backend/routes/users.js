/**
 * 用户管理路由
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 获取所有用户
router.get('/', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.name, u.email, u.phone, 
             u.department_id, u.position, u.role, u.status, u.created_at,
             d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.id
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: '获取用户失败' });
  }
});

// 创建用户
router.post('/', (req, res) => {
  try {
    const { username, password, name, email, phone, department_id, position, role } = req.body;
    
    if (!username || !name) {
      return res.status(400).json({ error: '用户名和姓名不能为空' });
    }
    
    const hashedPassword = bcrypt.hashSync(password || '123456', 10);
    
    const result = db.prepare(`
      INSERT INTO users (username, password, name, email, phone, department_id, position, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, hashedPassword, name, email, phone, department_id, position, role || 'employee');
    
    res.json({ id: result.lastInsertRowid, message: '用户创建成功' });
  } catch (err) {
    res.status(500).json({ error: '创建用户失败' });
  }
});

// 更新用户
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, department_id, position, role, status } = req.body;
    
    db.prepare(`
      UPDATE users SET name=?, email=?, phone=?, department_id=?, position=?, role=?, status=?
      WHERE id=?
    `).run(name, email, phone, department_id, position, role, status, id);
    
    res.json({ message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: '更新用户失败' });
  }
});

// 删除用户
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM user_roles WHERE user_id=?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除用户失败' });
  }
});

// 重置密码
router.post('/:id/reset-password', (req, res) => {
  try {
    const hashedPassword = bcrypt.hashSync('123456', 10);
    db.prepare('UPDATE users SET password=? WHERE id=?').run(hashedPassword, req.params.id);
    res.json({ message: '密码已重置为 123456' });
  } catch (err) {
    res.status(500).json({ error: '重置密码失败' });
  }
});

module.exports = router;
