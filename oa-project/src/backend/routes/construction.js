/**
 * 施工管理 - 工程对账单、工程款申请
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 对账单编号（5位）
function genStatementCode() {
  const c = db.prepare(`SELECT COUNT(*) as count FROM statements`).get();
  return `DZ${String(c.count + 1).padStart(5, '0')}`;
}

// 付款申请编号
function genPaymentCode() {
  const y = new Date().getFullYear();
  const c = db.prepare(`SELECT COUNT(*) as count FROM payment_applications`).get();
  return `FK${y}${String(c.count + 1).padStart(4, '0')}`;
}

// GET 对账单列表
router.get('/statements', (req, res) => {
  try {
    const { project_id, status } = req.query;
    let sql = `SELECT s.*, p.name as project_name, c.name as contract_name, u.name as creator_name
      FROM statements s LEFT JOIN projects p ON s.project_id = p.id LEFT JOIN contracts c ON s.contract_id = c.id LEFT JOIN users u ON s.created_by = u.id WHERE 1=1`;
    const params = [];
    if (project_id) { sql += ' AND s.project_id = ?'; params.push(project_id); }
    if (status) { sql += ' AND s.status = ?'; params.push(status); }
    sql += ' ORDER BY s.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 创建对账单
router.post('/statements', (req, res) => {
  try {
    const { project_id, contract_id, period, amount, content, attachments, created_by } = req.body;
    if (!project_id || !period) return res.status(400).json({ error: '缺少必填项' });
    const code = genStatementCode();
    const result = db.prepare(`INSERT INTO statements (code, project_id, contract_id, period, amount, content, attachments, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(code, project_id, contract_id, period, amount || 0, content, attachments, created_by);
    res.json({ id: result.lastInsertRowid, code, message: '对账单创建成功' });
  } catch (e) { res.status(500).json({ error: '创建失败' }); }
});

// GET 付款申请列表
router.get('/payments', (req, res) => {
  try {
    const { project_id, type, status } = req.query;
    let sql = `SELECT pa.*, p.name as project_name, c.name as contract_name, u.name as creator_name
      FROM payment_applications pa LEFT JOIN projects p ON pa.project_id = p.id LEFT JOIN contracts c ON pa.contract_id = c.id LEFT JOIN users u ON pa.created_by = u.id WHERE 1=1`;
    const params = [];
    if (project_id) { sql += ' AND pa.project_id = ?'; params.push(project_id); }
    if (type) { sql += ' AND pa.type = ?'; params.push(type); }
    if (status) { sql += ' AND pa.status = ?'; params.push(status); }
    sql += ' ORDER BY pa.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 创建付款申请
router.post('/payments', (req, res) => {
  try {
    const { project_id, contract_id, type, amount, content, attachments, statement_id, created_by } = req.body;
    if (!project_id || !type) return res.status(400).json({ error: '缺少必填项' });
    const code = genPaymentCode();
    const result = db.prepare(`INSERT INTO payment_applications (code, project_id, contract_id, type, amount, content, attachments, statement_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(code, project_id, contract_id, type, amount || 0, content, attachments, statement_id, created_by);
    res.json({ id: result.lastInsertRowid, code, message: '申请创建成功' });
  } catch (e) { res.status(500).json({ error: '创建失败' }); }
});

module.exports = router;
