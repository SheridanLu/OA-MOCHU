/**
 * 仪表盘 API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

router.get('/stats', (req, res) => {
  try {
    const projects = db.prepare(`SELECT COUNT(*) as total, 
      SUM(CASE WHEN type='entity' THEN 1 ELSE 0 END) as entity,
      SUM(CASE WHEN type='virtual' THEN 1 ELSE 0 END) as virtual,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active
      FROM projects`).get();
    
    const contracts = db.prepare(`SELECT COUNT(*) as total,
      SUM(CASE WHEN type='income' THEN 1 ELSE 0 END) as income,
      SUM(CASE WHEN type='expense' THEN 1 ELSE 0 END) as expense,
      SUM(amount) as total_amount FROM contracts`).get();
    
    const pendingApprovals = db.prepare(`SELECT COUNT(*) as count FROM approvals WHERE status='pending'`).get();
    
    res.json({ projects, contracts, pendingApprovals: pendingApprovals.count });
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

router.get('/recent-projects', (req, res) => {
  try {
    res.json(db.prepare(`SELECT id, code, name, type, status, created_at FROM projects ORDER BY created_at DESC LIMIT 5`).all());
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

module.exports = router;
