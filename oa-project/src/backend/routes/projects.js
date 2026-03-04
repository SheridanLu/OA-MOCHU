/**
 * 项目管理 API - 终版（含状态机）
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

// 创建审批
function createApproval(businessType, businessId) {
  const flow = db.prepare('SELECT * FROM approval_flows WHERE business_type = ? AND status = ?').get(businessType, 'active');
  if (!flow) return null;
  
  const result = db.prepare('INSERT INTO approvals (flow_id, business_type, business_id, status) VALUES (?, ?, ?, ?)')
    .run(flow.id, businessType, businessId, 'pending');
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
    if (keyword) { sql += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.alias LIKE ?)'; const k = `%${keyword}%`; params.push(k, k, k); }
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
    const paymentPlans = db.prepare(`SELECT * FROM payment_plans WHERE project_id = ? ORDER BY batch_no`).all(req.params.id);
    const statements = db.prepare(`SELECT * FROM statements WHERE project_id = ? ORDER BY period DESC`).all(req.params.id);
    
    res.json({ ...project, contracts, paymentPlans, statements });
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 虚拟项目立项（8位）
router.post('/virtual', (req, res) => {
  try {
    const { 
      name, location, party_a, party_a_contact, party_a_phone,
      contract_amount, contract_type, virtual_limit, created_by 
    } = req.body;
    
    if (!name) return res.status(400).json({ error: '项目名称不能为空' });
    
    const code = generateCode('virtual');
    const result = db.prepare(`
      INSERT INTO projects (
        code, name, type, location, party_a, party_a_contact, party_a_phone,
        contract_amount, contract_type, virtual_limit, status, created_by
      ) VALUES (?, ?, 'virtual', ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(code, name, location, party_a, party_a_contact, party_a_phone,
      contract_amount || 0, contract_type, virtual_limit, created_by);
    
    createApproval('project', result.lastInsertRowid);
    res.json({ id: result.lastInsertRowid, code, message: '虚拟项目创建成功，等待审批' });
  } catch (e) { console.error(e); res.status(500).json({ error: '创建失败' }); }
});

// POST 实体项目立项（10位）
router.post('/entity', (req, res) => {
  try {
    const { 
      name, alias, location, party_a, party_a_contact, party_a_phone,
      contract_amount, amount_no_tax, tax_rate, tax_amount, contract_type,
      start_date, end_date, warranty_period, created_by 
    } = req.body;
    
    if (!name) return res.status(400).json({ error: '项目名称不能为空' });
    
    const code = generateCode('entity');
    const calcTax = tax_amount || (contract_amount && tax_rate ? contract_amount * tax_rate / 100 : 0);
    
    const result = db.prepare(`
      INSERT INTO projects (
        code, name, alias, type, location, party_a, party_a_contact, party_a_phone,
        contract_amount, amount_no_tax, tax_rate, tax_amount, contract_type,
        start_date, end_date, warranty_period, status, created_by
      ) VALUES (?, ?, ?, 'entity', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(code, name, alias, location, party_a, party_a_contact, party_a_phone,
      contract_amount || 0, amount_no_tax || 0, tax_rate || 0, calcTax, contract_type,
      start_date, end_date, warranty_period || 0, created_by);
    
    createApproval('project', result.lastInsertRowid);
    res.json({ id: result.lastInsertRowid, code, message: '实体项目创建成功，等待审批' });
  } catch (e) { console.error(e); res.status(500).json({ error: '创建失败' }); }
});

// POST 虚拟转实体（需上传中标通知书）
router.post('/:id/convert', (req, res) => {
  try {
    const { id } = req.params;
    const { win_notice_attachment } = req.body;
    
    if (!win_notice_attachment) {
      return res.status(400).json({ error: '必须上传《中标通知书》' });
    }
    
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    if (project.type !== 'virtual') return res.status(400).json({ error: '只有虚拟项目可转换' });
    
    const newCode = generateCode('entity');
    
    db.transaction(() => {
      // 更新项目类型和编号
      db.prepare(`
        UPDATE projects 
        SET type = 'entity', code = ?, converted_from = ?, status = 'converting'
        WHERE id = ?
      `).run(newCode, id, id);
      
      // 迁移成本数据（物资流水）
      db.prepare(`
        UPDATE material_transactions 
        SET project_id = ? 
        WHERE project_id = ?
      `).run(id, id);
      
      // 迁移合同
      db.prepare(`
        UPDATE contracts 
        SET project_id = ? 
        WHERE project_id = ?
      `).run(id, id);
    })();
    
    createApproval('project_convert', id);
    res.json({ code: newCode, message: '转换申请已提交，等待审批' });
  } catch (e) { console.error(e); res.status(500).json({ error: '转换失败' }); }
});

// POST 项目中止（需选择成本下挂项目）
router.post('/:id/suspend', (req, res) => {
  try {
    const { id } = req.params;
    const { suspend_to_project, reason } = req.body;
    
    if (!suspend_to_project) {
      return res.status(400).json({ error: '必须选择成本下挂项目' });
    }
    
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    
    db.transaction(() => {
      // 更新项目状态
      db.prepare(`
        UPDATE projects 
        SET status = 'suspended', suspend_to_project = ?
        WHERE id = ?
      `).run(suspend_to_project, id);
      
      // 划拨成本到下挂项目
      db.prepare(`
        UPDATE material_transactions 
        SET project_id = ? 
        WHERE project_id = ?
      `).run(suspend_to_project, id);
    })();
    
    res.json({ message: '项目已中止，成本已划拨' });
  } catch (e) { console.error(e); res.status(500).json({ error: '操作失败' }); }
});

// PUT 更新项目进度
router.put('/:id/progress', (req, res) => {
  try {
    const { progress_percent } = req.body;
    db.prepare('UPDATE projects SET progress_percent = ? WHERE id = ?').run(progress_percent, req.params.id);
    res.json({ message: '进度更新成功' });
  } catch (e) { res.status(500).json({ error: '更新失败' }); }
});

// ==================== 付款计划 ====================

// GET 付款计划
router.get('/:id/payment-plans', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM payment_plans WHERE project_id = ? ORDER BY batch_no').all(req.params.id));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 添加付款计划
router.post('/:id/payment-plans', (req, res) => {
  try {
    const { batch_no, planned_date, amount, created_by } = req.body;
    const result = db.prepare(`
      INSERT INTO payment_plans (project_id, batch_no, planned_date, amount, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, batch_no, planned_date, amount || 0, created_by);
    res.json({ id: result.lastInsertRowid, message: '添加成功' });
  } catch (e) { res.status(500).json({ error: '添加失败' }); }
});

// PUT 更新实际付款
router.put('/payment-plans/:planId', (req, res) => {
  try {
    const { actual_date, actual_amount } = req.body;
    const status = actual_amount ? 'completed' : 'pending';
    db.prepare('UPDATE payment_plans SET actual_date = ?, actual_amount = ?, status = ? WHERE id = ?')
      .run(actual_date, actual_amount, status, req.params.planId);
    res.json({ message: '更新成功' });
  } catch (e) { res.status(500).json({ error: '更新失败' }); }
});

module.exports = router;
