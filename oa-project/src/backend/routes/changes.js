/**
 * 变更与签证管理
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// GET 变更列表
router.get('/', (req, res) => {
  try {
    const { project_id, type, status } = req.query;
    let sql = `SELECT cr.*, p.name as project_name, u.name as creator_name FROM change_requests cr LEFT JOIN projects p ON cr.project_id = p.id LEFT JOIN users u ON cr.created_by = u.id WHERE 1=1`;
    const params = [];
    if (project_id) { sql += ' AND cr.project_id = ?'; params.push(project_id); }
    if (type) { sql += ' AND cr.type = ?'; params.push(type); }
    if (status) { sql += ' AND cr.status = ?'; params.push(status); }
    sql += ' ORDER BY cr.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 超量采购申请
router.post('/over-purchase', (req, res) => {
  try {
    const { project_id, reason, amount, attachments, created_by } = req.body;
    const result = db.prepare(`INSERT INTO change_requests (project_id, type, reason, amount, attachments, created_by) VALUES (?, 'over_purchase', ?, ?, ?, ?)`)
      .run(project_id, reason, amount || 0, attachments, created_by);
    res.json({ id: result.lastInsertRowid, message: '申请已提交' });
  } catch (e) { res.status(500).json({ error: '提交失败' }); }
});

// POST 现场签证
router.post('/site-visa', (req, res) => {
  try {
    const { project_id, reason, amount, attachments, created_by } = req.body;
    const result = db.prepare(`INSERT INTO change_requests (project_id, type, reason, amount, attachments, created_by) VALUES (?, 'site_visa', ?, ?, ?, ?)`)
      .run(project_id, reason, amount || 0, attachments, created_by);
    res.json({ id: result.lastInsertRowid, message: '签证已提交' });
  } catch (e) { res.status(500).json({ error: '提交失败' }); }
});

// POST 设计变更
router.post('/design-change', (req, res) => {
  try {
    const { project_id, reason, amount, attachments, created_by } = req.body;
    const result = db.prepare(`INSERT INTO change_requests (project_id, type, reason, amount, attachments, created_by) VALUES (?, 'design_change', ?, ?, ?, ?)`)
      .run(project_id, reason, amount || 0, attachments, created_by);
    res.json({ id: result.lastInsertRowid, message: '变更已提交' });
  } catch (e) { res.status(500).json({ error: '提交失败' }); }
});

// PUT 审批
router.put('/:id/status', (req, res) => {
  try {
    db.prepare('UPDATE change_requests SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    res.json({ message: '更新成功' });
  } catch (e) { res.status(500).json({ error: '更新失败' }); }
});

module.exports = router;
