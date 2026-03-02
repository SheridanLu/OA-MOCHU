/**
 * 项目管理路由
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 生成项目编号
function generateProjectCode(type) {
  const prefix = type === 'entity' ? 'P' : 'V';
  const year = new Date().getFullYear();
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM projects 
    WHERE type = ? AND created_at >= datetime('now', 'start of year')
  `).get(type);
  const seq = String(count.count + 1).padStart(type === 'entity' ? 6 : 4, '0');
  return `${prefix}${year}${seq}`;
}

// 获取项目列表
router.get('/', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, u.name as creator_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.created_at DESC
    `).all();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: '获取项目失败' });
  }
});

// 创建项目
router.post('/', (req, res) => {
  try {
    const { name, type, party_a, contract_amount } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: '项目名称和类型不能为空' });
    }
    
    const code = generateProjectCode(type);
    
    const result = db.prepare(`
      INSERT INTO projects (code, name, type, party_a, contract_amount, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(code, name, type, party_a || null, contract_amount || 0);
    
    res.json({ id: result.lastInsertRowid, code, message: '项目创建成功' });
  } catch (err) {
    res.status(500).json({ error: '创建项目失败' });
  }
});

module.exports = router;
