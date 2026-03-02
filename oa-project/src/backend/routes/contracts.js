/**
 * 合同管理路由
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 获取合同列表
router.get('/', (req, res) => {
  try {
    const contracts = db.prepare(`
      SELECT c.*, p.name as project_name
      FROM contracts c
      LEFT JOIN projects p ON c.project_id = p.id
      ORDER BY c.created_at DESC
    `).all();
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: '获取合同失败' });
  }
});

// 获取合同模板
router.get('/templates', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM contract_templates WHERE status = ?').all('active');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: '获取模板失败' });
  }
});

module.exports = router;
