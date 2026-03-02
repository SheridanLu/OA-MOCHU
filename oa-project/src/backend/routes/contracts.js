/**
 * 合同管理 - 完整实现
 * 收入/支出合同、模板、物资清单
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 生成合同编号（8位）
function generateCode() {
  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, '0');
  const c = db.prepare(`SELECT COUNT(*) as count FROM contracts WHERE strftime('%Y-%m', created_at) = ?`).get(`${y}-${m}`);
  return `HT${y}${m}${String(c.count + 1).padStart(4, '0')}`;
}

// GET 模板列表
router.get('/templates', (req, res) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM contract_templates WHERE status = ?';
    const params = ['active'];
    if (type) { sql += ' AND type = ?'; params.push(type); }
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 创建模板
router.post('/templates', (req, res) => {
  try {
    const { name, type, category, content, fields, is_party_a, created_by } = req.body;
    const result = db.prepare(`INSERT INTO contract_templates (name, type, category, content, fields, is_party_a, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(name, type, category, content, fields, is_party_a ? 1 : 0, created_by);
    res.json({ id: result.lastInsertRowid, message: '模板创建成功' });
  } catch (e) { res.status(500).json({ error: '创建失败' }); }
});

// GET 合同列表
router.get('/', (req, res) => {
  try {
    const { project_id, type, status } = req.query;
    let sql = `SELECT c.*, p.name as project_name, p.code as project_code FROM contracts c LEFT JOIN projects p ON c.project_id = p.id WHERE 1=1`;
    const params = [];
    if (project_id) { sql += ' AND c.project_id = ?'; params.push(project_id); }
    if (type) { sql += ' AND c.type = ?'; params.push(type); }
    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    sql += ' ORDER BY c.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// GET 合同详情
router.get('/:id', (req, res) => {
  try {
    const contract = db.prepare(`SELECT c.*, p.name as project_name FROM contracts c LEFT JOIN projects p ON c.project_id = p.id WHERE c.id = ?`).get(req.params.id);
    if (!contract) return res.status(404).json({ error: '合同不存在' });
    const items = db.prepare(`SELECT * FROM contract_items WHERE contract_id = ?`).all(req.params.id);
    res.json({ ...contract, items });
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 创建合同
router.post('/', (req, res) => {
  try {
    const { project_id, type, name, party_a, party_b, amount, sign_date, start_date, end_date, template_id, attachments, items, created_by } = req.body;
    if (!project_id || !type || !name) return res.status(400).json({ error: '缺少必填项' });
    
    const code = generateCode();
    const result = db.prepare(`
      INSERT INTO contracts (code, project_id, type, name, party_a, party_b, amount, sign_date, start_date, end_date, template_id, attachments, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code, project_id, type, name, party_a, party_b, amount || 0, sign_date, start_date, end_date, template_id, attachments, created_by);
    
    // 插入物资清单
    if (items && items.length > 0) {
      const stmt = db.prepare(`INSERT INTO contract_items (contract_id, material_name, spec, unit, quantity, price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      items.forEach(i => stmt.run(result.lastInsertRowid, i.material_name, i.spec, i.unit, i.quantity, i.price, i.amount));
    }
    
    res.json({ id: result.lastInsertRowid, code, message: '合同创建成功' });
  } catch (e) { console.error(e); res.status(500).json({ error: '创建失败' }); }
});

// PUT 状态
router.put('/:id/status', (req, res) => {
  try {
    db.prepare('UPDATE contracts SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    res.json({ message: '更新成功' });
  } catch (e) { res.status(500).json({ error: '更新失败' }); }
});

module.exports = router;
