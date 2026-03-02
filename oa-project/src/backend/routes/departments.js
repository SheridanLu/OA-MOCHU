/**
 * 部门管理路由
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 获取所有部门
router.get('/', (req, res) => {
  try {
    const departments = db.prepare(`
      SELECT d.*, 
        p.name as parent_name,
        u.name as manager_name,
        (SELECT COUNT(*) FROM users WHERE department_id = d.id) as user_count
      FROM departments d
      LEFT JOIN departments p ON d.parent_id = p.id
      LEFT JOIN users u ON d.manager_id = u.id
      ORDER BY d.id
    `).all();
    res.json(departments);
  } catch (err) {
    console.error('获取部门失败:', err);
    res.status(500).json({ error: '获取部门失败' });
  }
});

// 创建部门
router.post('/', (req, res) => {
  try {
    const { name, code, parent_id, type } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: '部门名称不能为空' });
    }
    
    const result = db.prepare(`
      INSERT INTO departments (name, code, parent_id, type)
      VALUES (?, ?, ?, ?)
    `).run(name, code || null, parent_id || null, type || 'normal');
    
    res.json({ id: result.lastInsertRowid, name, message: '部门创建成功' });
  } catch (err) {
    res.status(500).json({ error: '创建部门失败' });
  }
});

// 更新部门
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, parent_id, type, manager_id } = req.body;
    
    db.prepare(`
      UPDATE departments 
      SET name = COALESCE(?, name), 
          code = COALESCE(?, code), 
          parent_id = COALESCE(?, parent_id), 
          type = COALESCE(?, type),
          manager_id = COALESCE(?, manager_id)
      WHERE id = ?
    `).run(name, code, parent_id, type, manager_id, id);
    
    res.json({ message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: '更新部门失败' });
  }
});

// 删除部门
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const children = db.prepare('SELECT COUNT(*) as count FROM departments WHERE parent_id = ?').get(id);
    if (children.count > 0) {
      return res.status(400).json({ error: '该部门下还有子部门，无法删除' });
    }
    
    const users = db.prepare('SELECT COUNT(*) as count FROM users WHERE department_id = ?').get(id);
    if (users.count > 0) {
      return res.status(400).json({ error: '该部门下还有用户，无法删除' });
    }
    
    db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除部门失败' });
  }
});

module.exports = router;
