/**
 * 审批流引擎 - 终版
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 获取用户角色
function getUserRole(userId) {
  const user = db.prepare('SELECT r.code as role_code FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?').get(userId);
  return user?.role_code;
}

// 检查是否是当前审批人
function isCurrentApprover(approval, userId) {
  const roleCode = getUserRole(userId);
  const step = db.prepare(`
    SELECT afs.* FROM approval_flow_steps afs
    WHERE afs.flow_id = ? AND afs.step_number = ?
  `).get(approval.flow_id, approval.current_step);
  return step?.role_code === roleCode;
}

// GET 待办列表
router.get('/pending', (req, res) => {
  try {
    const { userId, roleCode } = req.query;
    
    let sql = `
      SELECT a.*, af.name as flow_name,
        CASE a.business_type
          WHEN 'project' THEN (SELECT name FROM projects WHERE id = a.business_id)
          WHEN 'contract_income' THEN (SELECT name FROM contracts WHERE id = a.business_id)
          WHEN 'contract_expense' THEN (SELECT name FROM contracts WHERE id = a.business_id)
          WHEN 'change' THEN (SELECT reason FROM change_requests WHERE id = a.business_id)
          WHEN 'payment' THEN (SELECT code FROM payment_applications WHERE id = a.business_id)
          ELSE NULL
        END as business_name
      FROM approvals a
      JOIN approval_flows af ON a.flow_id = af.id
      WHERE a.status = 'pending'
    `;
    
    const params = [];
    if (roleCode) {
      sql += ` AND EXISTS (
        SELECT 1 FROM approval_flow_steps afs 
        WHERE afs.flow_id = a.flow_id 
        AND afs.step_number = a.current_step 
        AND afs.role_code = ?
      )`;
      params.push(roleCode);
    }
    
    sql += ' ORDER BY a.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { console.error(e); res.status(500).json({ error: '获取失败' }); }
});

// GET 已办列表
router.get('/done', (req, res) => {
  try {
    const { userId } = req.query;
    res.json(db.prepare(`
      SELECT ar.*, a.business_type, a.business_id, af.name as flow_name
      FROM approval_records ar
      JOIN approvals a ON ar.approval_id = a.id
      JOIN approval_flows af ON a.flow_id = af.id
      WHERE ar.approver_id = ?
      ORDER BY ar.created_at DESC
    `).all(userId));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// GET 审批详情
router.get('/:id', (req, res) => {
  try {
    const approval = db.prepare(`
      SELECT a.*, af.name as flow_name
      FROM approvals a
      JOIN approval_flows af ON a.flow_id = af.id
      WHERE a.id = ?
    `).get(req.params.id);
    
    if (!approval) return res.status(404).json({ error: '审批不存在' });
    
    const steps = db.prepare(`
      SELECT afs.*, r.name as role_name
      FROM approval_flow_steps afs
      LEFT JOIN roles r ON afs.role_code = r.code
      WHERE afs.flow_id = ?
      ORDER BY afs.step_number
    `).all(approval.flow_id);
    
    const records = db.prepare(`
      SELECT ar.*, u.name as approver_name
      FROM approval_records ar
      JOIN users u ON ar.approver_id = u.id
      WHERE ar.approval_id = ?
      ORDER BY ar.step_number
    `).all(req.params.id);
    
    res.json({ ...approval, steps, records });
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 审批通过
router.post('/:id/approve', (req, res) => {
  try {
    const { userId, comment } = req.body;
    const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id);
    
    if (!approval) return res.status(404).json({ error: '审批不存在' });
    if (approval.status !== 'pending') return res.status(400).json({ error: '该审批已处理' });
    
    // 记录审批
    db.prepare(`
      INSERT INTO approval_records (approval_id, step_number, approver_id, action, comment)
      VALUES (?, ?, ?, 'approve', ?)
    `).run(req.params.id, approval.current_step, userId, comment);
    
    // 检查是否还有下一步
    const nextStep = db.prepare(`
      SELECT * FROM approval_flow_steps 
      WHERE flow_id = ? AND step_number = ?
    `).get(approval.flow_id, approval.current_step + 1);
    
    if (nextStep) {
      // 进入下一步
      db.prepare('UPDATE approvals SET current_step = ? WHERE id = ?').run(approval.current_step + 1, req.params.id);
      res.json({ message: '审批通过，流转至下一节点' });
    } else {
      // 审批完成
      db.prepare('UPDATE approvals SET status = ?, completed_at = DATETIME("now") WHERE id = ?').run('approved', req.params.id);
      
      // 更新业务状态
      updateBusinessStatus(approval.business_type, approval.business_id, 'approved');
      
      res.json({ message: '审批完成' });
    }
  } catch (e) { console.error(e); res.status(500).json({ error: '操作失败' }); }
});

// POST 审批拒绝
router.post('/:id/reject', (req, res) => {
  try {
    const { userId, comment } = req.body;
    const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id);
    
    if (!approval) return res.status(404).json({ error: '审批不存在' });
    
    // 记录审批
    db.prepare(`
      INSERT INTO approval_records (approval_id, step_number, approver_id, action, comment)
      VALUES (?, ?, ?, 'reject', ?)
    `).run(req.params.id, approval.current_step, userId, comment);
    
    // 拒绝
    db.prepare('UPDATE approvals SET status = ?, completed_at = DATETIME("now") WHERE id = ?').run('rejected', req.params.id);
    
    // 更新业务状态
    updateBusinessStatus(approval.business_type, approval.business_id, 'rejected');
    
    res.json({ message: '已拒绝' });
  } catch (e) { res.status(500).json({ error: '操作失败' }); }
});

// 更新业务状态
function updateBusinessStatus(businessType, businessId, status) {
  const tableMap = {
    'project': 'projects',
    'project_convert': 'projects',
    'contract_income': 'contracts',
    'contract_expense': 'contracts',
    'change': 'change_requests',
    'payment': 'payment_applications',
    'hr_onboard': 'users'
  };
  
  const table = tableMap[businessType];
  if (table) {
    if (businessType === 'project' && status === 'approved') {
      db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('active', businessId);
    } else if (businessType === 'hr_onboard' && status === 'approved') {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run('active', businessId);
    } else {
      db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).run(status, businessId);
    }
  }
}

// GET 审批流配置列表
router.get('/flows', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM approval_flows ORDER BY business_type').all());
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// GET 审批流步骤
router.get('/flows/:flowId/steps', (req, res) => {
  try {
    res.json(db.prepare(`
      SELECT afs.*, r.name as role_name
      FROM approval_flow_steps afs
      LEFT JOIN roles r ON afs.role_code = r.code
      WHERE afs.flow_id = ?
      ORDER BY afs.step_number
    `).all(req.params.flowId));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

module.exports = router;
