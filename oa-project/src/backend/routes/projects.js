/**
 * 项目立项管理 - 完整实现
 * 实体项目（P+年份+6位序号=10位）
 * 虚拟项目（V+年份+4位序号=8位）
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 生成项目编号
function generateCode(type) {
  const year = new Date().getFullYear();
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM projects 
    WHERE type = ? AND strftime('%Y', created_at) = ?
  `).get(type, String(year));
  
  if (type === 'entity') {
    return `P${year}${String(count.count + 1).padStart(6, '0')}`; // 10位
  } else {
    return `V${year}${String(count.count + 1).padStart(4, '0')}`; // 8位
  }
}

// 创建审批流程
function createApproval(type, entityId, steps) {
  const result = db.prepare(`INSERT INTO approvals (type, entity_id, status) VALUES (?, ?, 'pending')`).run(type, entityId);
  steps.forEach((role, i) => {
    db.prepare(`INSERT INTO approval_steps (approval_id, step_number, role_code) VALUES (?, ?, ?)`).run(result.lastInsertRowid, i + 1, role);
  });
  return result.lastInsertRowid;
}

// GET 项目列表
router.get('/', (req, res) => {
  try {
    const { type, status, keyword } = req.query;
    let sql = `SELECT p.*, u.name as creator_name FROM projects p LEFT JOIN users u ON p.created_by = u.id WHERE 1=1`;
    const params = [];
    if (type) { sql += ' AND p.type = ?'; params.push(type); }
    if (status) { sql += ' AND p.status = ?'; params.push(status); }
    if (keyword) { sql += ' AND (p.name LIKE ? OR p.code LIKE ?)'; const k = `%${keyword}%`; params.push(k, k); }
    sql += ' ORDER BY p.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// GET 项目详情
router.get('/:id', (req, res) => {
  try {
    const project = db.prepare(`SELECT p.*, u.name as creator_name FROM projects p LEFT JOIN users u ON p.created_by = u.id WHERE p.id = ?`).get(req.params.id);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const contracts = db.prepare(`SELECT id, code, name, type, amount, status FROM contracts WHERE project_id = ?`).all(req.params.id);
    res.json({ ...project, contracts });
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 实体项目立项
router.post('/entity', (req, res) => {
  try {
    const { name, alias, location, party_a, party_a_contact, party_a_phone,
      contract_amount, amount_no_tax, tax_rate, contract_type, start_date, end_date, warranty_period, created_by } = req.body;
    if (!name) return res.status(400).json({ error: '项目名称不能为空' });
    
    const code = generateCode('entity');
    const tax_amount = contract_amount && tax_rate ? contract_amount * tax_rate / 100 : 0;
    
    const result = db.prepare(`
      INSERT INTO projects (code, name, alias, type, location, party_a, party_a_contact, party_a_phone,
        contract_amount, amount_no_tax, tax_rate, tax_amount, contract_type, start_date, end_date, warranty_period, status, created_by)
      VALUES (?, ?, ?, 'entity', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(code, name, alias, location, party_a, party_a_contact, party_a_phone,
      contract_amount || 0, amount_no_tax || 0, tax_rate || 0, tax_amount, contract_type, start_date, end_date, warranty_period || 0, created_by);
    
    createApproval('project', result.lastInsertRowid, ['buyer', 'finance', 'ceo']);
    res.json({ id: result.lastInsertRowid, code, message: '实体项目创建成功' });
  } catch (e) { console.error(e); res.status(500).json({ error: '创建失败' }); }
});

// POST 虚拟项目立项
router.post('/virtual', (req, res) => {
  try {
    const { name, location, party_a, contract_amount, contract_type, virtual_limit, created_by } = req.body;
    if (!name) return res.status(400).json({ error: '项目名称不能为空' });
    
    const code = generateCode('virtual');
    const result = db.prepare(`
      INSERT INTO projects (code, name, type, location, party_a, contract_amount, contract_type, virtual_limit, status, created_by)
      VALUES (?, ?, 'virtual', ?, ?, ?, ?, ?, 'pending', ?)
    `).run(code, name, location, party_a, contract_amount || 0, contract_type, virtual_limit, created_by);
    
    createApproval('project', result.lastInsertRowid, ['buyer', 'finance', 'ceo']);
    res.json({ id: result.lastInsertRowid, code, message: '虚拟项目创建成功' });
  } catch (e) { res.status(500).json({ error: '创建失败' }); }
});

// POST 虚拟转实体
router.post('/:id/convert', (req, res) => {
  try {
    const { id } = req.params;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    if (project.type !== 'virtual') return res.status(400).json({ error: '只有虚拟项目可转换' });
    
    const newCode = generateCode('entity');
    db.prepare(`UPDATE projects SET type = 'entity', code = ?, converted_from = ? WHERE id = ?`).run(newCode, id, id);
    res.json({ code: newCode, message: '转换成功' });
  } catch (e) { res.status(500).json({ error: '转换失败' }); }
});

// POST 项目中止
router.post('/:id/suspend', (req, res) => {
  try {
    db.prepare(`UPDATE projects SET status = 'suspended' WHERE id = ?`).run(req.params.id);
    res.json({ message: '项目已中止' });
  } catch (e) { res.status(500).json({ error: '操作失败' }); }
});

module.exports = router;
