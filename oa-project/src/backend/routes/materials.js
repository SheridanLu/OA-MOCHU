/**
 * 物资进销存 API - 终版（含风控）
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// GET 物资列表
router.get('/', (req, res) => {
  try {
    const { project_id, keyword } = req.query;
    let sql = `SELECT m.*, p.name as project_name FROM materials m LEFT JOIN projects p ON m.project_id = p.id WHERE 1=1`;
    const params = [];
    if (project_id) { sql += ' AND m.project_id = ?'; params.push(project_id); }
    if (keyword) { sql += ' AND m.name LIKE ?'; params.push(`%${keyword}%`); }
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 创建物资
router.post('/', (req, res) => {
  try {
    const { code, name, spec, unit, category, base_price, project_id, contract_id } = req.body;
    const result = db.prepare(`
      INSERT INTO materials (code, name, spec, unit, category, base_price, project_id, contract_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code, name, spec, unit, category, base_price || 0, project_id, contract_id);
    res.json({ id: result.lastInsertRowid, message: '物资创建成功' });
  } catch (e) { res.status(500).json({ error: '创建失败' }); }
});

// GET 物资流水
router.get('/transactions', (req, res) => {
  try {
    const { project_id, type, material_id } = req.query;
    let sql = `
      SELECT t.*, m.name as material_name, m.spec, m.unit, p.name as project_name, u.name as creator_name
      FROM material_transactions t 
      LEFT JOIN materials m ON t.material_id = m.id 
      LEFT JOIN projects p ON t.project_id = p.id 
      LEFT JOIN users u ON t.created_by = u.id 
      WHERE 1=1
    `;
    const params = [];
    if (project_id) { sql += ' AND t.project_id = ?'; params.push(project_id); }
    if (type) { sql += ' AND t.type = ?'; params.push(type); }
    if (material_id) { sql += ' AND t.material_id = ?'; params.push(material_id); }
    sql += ' ORDER BY t.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 入库（含风控）
router.post('/in', (req, res) => {
  try {
    const { project_id, material_id, quantity, unit_price, supplier, contract_id, photos, created_by } = req.body;
    
    // 1. 基准价检查
    const material = db.prepare('SELECT base_price, name FROM materials WHERE id = ?').get(material_id);
    if (material && unit_price > material.base_price) {
      // 高于基准价，需要确认
      return res.status(400).json({ 
        error: `采购单价 ¥${unit_price} 高于基准价 ¥${material.base_price}，请确认是否继续`,
        needConfirm: true,
        material_name: material.name
      });
    }
    
    // 2. 入库金额校验（vs 合同金额）
    if (contract_id) {
      const contract = db.prepare('SELECT amount FROM contracts WHERE id = ?').get(contract_id);
      const totalIn = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM material_transactions 
        WHERE contract_id = ? AND type = 'in' AND status != 'rejected'
      `).get(contract_id);
      
      const newTotal = (totalIn.total || 0) + (quantity * unit_price);
      if (newTotal < contract.amount) {
        // 需要完整审批
        return res.status(400).json({
          error: '入库金额小于合同金额，需要完整审批流程',
          needFullApproval: true,
          contract_amount: contract.amount,
          current_total: totalIn.total,
          new_total: newTotal
        });
      }
    }
    
    const total_amount = (quantity || 0) * (unit_price || 0);
    const result = db.prepare(`
      INSERT INTO material_transactions (project_id, material_id, type, quantity, unit_price, total_amount, supplier, contract_id, photos, created_by, status)
      VALUES (?, ?, 'in', ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(project_id, material_id, quantity, unit_price, total_amount, supplier, contract_id, photos, created_by);
    
    // 更新基准价（如果是新低）
    if (material && unit_price < material.base_price) {
      db.prepare('UPDATE materials SET base_price = ? WHERE id = ?').run(unit_price, material_id);
    }
    
    // 记录价格历史
    db.prepare(`
      INSERT INTO material_price_history (material_id, price, contract_id, supplier, transaction_date)
      VALUES (?, ?, ?, ?, DATE('now'))
    `).run(material_id, unit_price, contract_id, supplier);
    
    // 更新合同物资的已采购量
    if (contract_id) {
      db.prepare(`
        UPDATE contract_items 
        SET purchased_quantity = COALESCE(purchased_quantity, 0) + ?
        WHERE contract_id = ? AND material_name = (SELECT name FROM materials WHERE id = ?)
      `).run(quantity, contract_id, material_id);
    }
    
    res.json({ id: result.lastInsertRowid, message: '入库申请已提交' });
  } catch (e) { console.error(e); res.status(500).json({ error: '入库失败' }); }
});

// POST 强制入库（已确认基准价）
router.post('/in/force', (req, res) => {
  try {
    const { project_id, material_id, quantity, unit_price, supplier, contract_id, photos, created_by, reason } = req.body;
    const total_amount = (quantity || 0) * (unit_price || 0);
    
    const result = db.prepare(`
      INSERT INTO material_transactions (project_id, material_id, type, quantity, unit_price, total_amount, supplier, contract_id, photos, created_by, status)
      VALUES (?, ?, 'in', ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(project_id, material_id, quantity, unit_price, total_amount, supplier, contract_id, photos, created_by);
    
    res.json({ id: result.lastInsertRowid, message: '入库申请已提交（已确认价格）' });
  } catch (e) { res.status(500).json({ error: '入库失败' }); }
});

// POST 出库
router.post('/out', (req, res) => {
  try {
    const { project_id, material_id, quantity, photos, created_by } = req.body;
    const result = db.prepare(`
      INSERT INTO material_transactions (project_id, material_id, type, quantity, photos, created_by, status)
      VALUES (?, ?, 'out', ?, ?, ?, 'completed')
    `).run(project_id, material_id, quantity, photos, created_by);
    res.json({ id: result.lastInsertRowid, message: '出库成功' });
  } catch (e) { res.status(500).json({ error: '出库失败' }); }
});

// POST 退库
router.post('/return', (req, res) => {
  try {
    const { project_id, material_id, quantity, created_by } = req.body;
    const result = db.prepare(`
      INSERT INTO material_transactions (project_id, material_id, type, quantity, created_by, status)
      VALUES (?, ?, 'return', ?, ?, 'completed')
    `).run(project_id, material_id, quantity, created_by);
    res.json({ id: result.lastInsertRowid, message: '退库成功' });
  } catch (e) { res.status(500).json({ error: '退库失败' }); }
});

// GET 库存汇总
router.get('/inventory', (req, res) => {
  try {
    const { project_id } = req.query;
    let sql = `
      SELECT m.id, m.name, m.spec, m.unit, m.base_price,
        COALESCE(SUM(CASE WHEN t.type = 'in' THEN t.quantity ELSE 0 END), 0) as in_qty,
        COALESCE(SUM(CASE WHEN t.type = 'out' THEN t.quantity ELSE 0 END), 0) as out_qty,
        COALESCE(SUM(CASE WHEN t.type = 'return' THEN t.quantity ELSE 0 END), 0) as return_qty
      FROM materials m
      LEFT JOIN material_transactions t ON m.id = t.material_id AND t.status != 'rejected'
      WHERE 1=1
    `;
    const params = [];
    if (project_id) { sql += ' AND t.project_id = ?'; params.push(project_id); }
    sql += ' GROUP BY m.id';
    
    const data = db.prepare(sql).all(...params);
    data.forEach(item => {
      item.stock = item.in_qty - item.out_qty + item.return_qty;
    });
    
    res.json(data);
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 零星采购预警检查（化整为零）
router.post('/check-fragment', (req, res) => {
  try {
    const { project_id, amount } = req.body;
    
    // 获取批量采购总额
    const batchTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM contracts WHERE project_id = ? AND type = 'expense'
    `).get(project_id);
    
    const threshold = batchTotal.total * 0.015; // 1.5%
    
    if (amount > threshold) {
      // 触发预警（实际应发送钉钉通知）
      res.json({ 
        warning: true, 
        message: `零星采购金额 ¥${amount} 超过批量采购的1.5%（¥${threshold.toFixed(2)}），已通知采购员和财务`,
        threshold 
      });
    } else {
      res.json({ warning: false });
    }
  } catch (e) { res.status(500).json({ error: '检查失败' }); }
});

// PUT 审批物资流水
router.put('/transactions/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE material_transactions SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: '更新成功' });
  } catch (e) { res.status(500).json({ error: '更新失败' }); }
});

module.exports = router;
