/**
 * 仪表盘路由
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 获取统计数据
router.get('/stats', (req, res) => {
  try {
    const projectStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM projects
    `).get();
    
    const contractStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'income' THEN 1 ELSE 0 END) as income_count,
        SUM(CASE WHEN type = 'expense' THEN 1 ELSE 0 END) as expense_count
      FROM contracts
    `).get();
    
    const pendingApprovals = db.prepare(`
      SELECT COUNT(*) as count FROM approval_flows WHERE status = 'pending'
    `).get();
    
    res.json({
      projects: projectStats,
      contracts: contractStats,
      pendingApprovals: pendingApprovals.count
    });
  } catch (err) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 获取最近项目
router.get('/recent-projects', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT id, code, name, type, status, created_at
      FROM projects
      ORDER BY created_at DESC
      LIMIT 5
    `).all();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: '获取项目失败' });
  }
});

module.exports = router;
