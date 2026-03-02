/**
 * 物资进消存管理
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// GET 物资列表
router.get('/', (req, res) => {
  try {
    const { project_id, contract_id } = req.query;
    let sql = `SELECT m.*, p.name as project_name FROM materials m LEFT JOIN projects p ON m.project_id = p.id WHERE 1=1`;
    const params = [];
    if (project_id) { sql += ' AND m.project_id = ?'; params.push(project_id); }
    if (contract_id) { sql += ' AND m.contract_id = ?'; params.push(contract_id); }
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 创建物资
router.post('/', (req, res) => {
  try {
    const { project_id, contract_id, name, spec, unit, category, base_price } = req.body;
    const result = db.prepare(`INSERT INTO materials (project_id, contract_id, name, spec, unit, category, base_price) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(project_id, contract_id, name, spec, unit, category, base_price || 0);
    res.json({ id: result.lastInsertRowid, message: '物资创建成功' });
  } catch (e) { res.status(500).json({ error: '创建失败' }); }
});

// GET 物资流水
router.get('/transactions', (req, res) => {
  try {
    const { project_id, type } = req.query;
    let sql = `SELECT t.*, m.name as material_name, p.name as project_name, u.name as creator_name
      FROM material_transactions t LEFT JOIN materials m ON t.material_id = m.id LEFT JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.created_by = u.id WHERE 1=1`;
    const params = [];
    if (project_id) { sql += ' AND t.project_id = ?'; params.push(project_id); }
    if (type) { sql += ' AND t.type = ?'; params.push(type); }
    sql += ' ORDER BY t.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 入库
router.post('/in', (req, res) => {
  try {
    const { project_id, material_id, quantity, price, supplier, contract_id, photos, created_by } = req.body;
    const amount = (quantity || 0) * (price || 0);
    const result = db.prepare(`INSERT INTO material_transactions (project_id, material_id, type, quantity, price, amount, supplier, contract_id, photos, created_by) VALUES (?, ?, 'in', ?, ?, ?, ?, ?, ?, ?)`)
      .run(project_id, material_id, quantity, price, amount, supplier, contract_id, photos, created_by);
    res.json({ id: result.lastInsertRowid, message: '入库成功' });
  } catch (e) { res.status(500).json({ error: '入库失败' }); }
});

// POST 出库
router.post('/out', (req, res) => {
  try {
    const { project_id, material_id, quantity, photos, created_by } = req.body;
    const result = db.prepare(`INSERT INTO material_transactions (project_id, material_id, type, quantity, photos, created_by) VALUES (?, ?, 'out', ?, ?, ?)`)
      .run(project_id, material_id, quantity, photos, created_by);
    res.json({ id: result.lastInsertRowid, message: '出库成功' });
  } catch (e) { res.status(500).json({ error: '出库失败' }); }
});

// POST 退库
router.post('/return', (req, res) => {
  try {
    const { project_id, material_id, quantity, created_by } = req.body;
    const result = db.prepare(`INSERT INTO material_transactions (project_id, material_id, type, quantity, created_by) VALUES (?, ?, 'return', ?, ?)`)
      .run(project_id, material_id, quantity, created_by);
    res.json({ id: result.lastInsertRowid, message: '退库成功' });
  } catch (e) { res.status(500).json({ error: '退库失败' }); }
});

module.exports = router;
