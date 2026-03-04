/**
 * 合同管理 API - 终版（含时间窗校验+风控）
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

// 检查录入时间窗（25-30日）
function checkInputWindow() {
  const day = new Date().getDate();
  return day >= 25 && day <= 30;
}

// GET 合同列表
router.get('/', (req, res) => {
  try {
    const { project_id, type, status } = req.query;
    let sql = `
      SELECT c.*, p.name as project_name, p.code as project_code, ic.code as income_contract_code
      FROM contracts c 
      LEFT JOIN projects p ON c.project_id = p.id 
      LEFT JOIN contracts ic ON c.income_contract_id = ic.id
      WHERE 1=1
    `;
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
    const contract = db.prepare(`
      SELECT c.*, p.name as project_name, p.code as project_code
      FROM contracts c 
      LEFT JOIN projects p ON c.project_id = p.id 
      WHERE c.id = ?
    `).get(req.params.id);
    if (!contract) return res.status(404).json({ error: '合同不存在' });
    
    const items = db.prepare(`SELECT * FROM contract_items WHERE contract_id = ?`).all(req.params.id);
    res.json({ ...contract, items });
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 创建收入合同
router.post('/income', (req, res) => {
  try {
    const { project_id, name, party_a, party_b, amount, sign_date, start_date, end_date, template_id, attachments, items, created_by } = req.body;
    
    if (!project_id || !name) return res.status(400).json({ error: '缺少必填项' });
    
    // 检查项目是否有收入合同
    const existingIncome = db.prepare('SELECT id FROM contracts WHERE project_id = ? AND type = ?').get(project_id, 'income');
    if (existingIncome) {
      return res.status(400).json({ error: '该项目已有收入合同，一个项目只能有一个收入合同' });
    }
    
    const code = generateCode();
    const result = db.prepare(`
      INSERT INTO contracts (code, project_id, type, name, party_a, party_b, amount, sign_date, start_date, end_date, template_id, attachments, created_by)
      VALUES (?, ?, 'income', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code, project_id, name, party_a, party_b, amount || 0, sign_date, start_date, end_date, template_id, attachments, created_by);
    
    // 自动关联支出合同
    db.prepare('UPDATE contracts SET income_contract_id = ? WHERE project_id = ? AND type = ? AND income_contract_id IS NULL')
      .run(result.lastInsertRowid, project_id, 'expense');
    
    res.json({ id: result.lastInsertRowid, code, message: '收入合同创建成功' });
  } catch (e) { console.error(e); res.status(500).json({ error: '创建失败' }); }
});

// POST 创建支出合同（含时间窗校验）
router.post('/expense', (req, res) => {
  try {
    const { project_id, income_contract_id, name, party_a, party_b, amount, sign_date, start_date, end_date, template_id, attachments, items, created_by, override_window } = req.body;
    
    if (!project_id || !name) return res.status(400).json({ error: '缺少必填项' });
    
    // 时间窗校验
    if (!override_window && !checkInputWindow()) {
      return res.status(400).json({ 
        error: '不在合同录入时间窗内（每月25日-30日）',
        can_override: true 
      });
    }
    
    const code = generateCode();
    
    // 自动关联收入合同
    let linkedIncomeId = income_contract_id;
    if (!linkedIncomeId) {
      const incomeContract = db.prepare('SELECT id FROM contracts WHERE project_id = ? AND type = ?').get(project_id, 'income');
      linkedIncomeId = incomeContract?.id || null;
    }
    
    // 检查采购量是否超标
    let needBudgetApproval = false;
    if (items && items.length > 0) {
      items.forEach(item => {
        const planItem = db.prepare(`
          SELECT ci.quantity, ci.purchased_quantity 
          FROM contract_items ci 
          JOIN contracts c ON ci.contract_id = c.id 
          WHERE c.project_id = ? AND ci.material_name = ?
        `).get(project_id, item.material_name);
        
        if (planItem) {
          const totalPurchased = (planItem.purchased_quantity || 0) + (item.quantity || 0);
          if (totalPurchased > planItem.quantity) {
            needBudgetApproval = true;
          }
        }
      });
    }
    
    const result = db.prepare(`
      INSERT INTO contracts (code, project_id, income_contract_id, type, name, party_a, party_b, amount, sign_date, start_date, end_date, template_id, attachments, created_by)
      VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code, project_id, linkedIncomeId, name, party_a, party_b, amount || 0, sign_date, start_date, end_date, template_id, attachments, created_by);
    
    // 插入物资清单
    if (items && items.length > 0) {
      const stmt = db.prepare(`INSERT INTO contract_items (contract_id, material_name, spec, unit, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      items.forEach(i => stmt.run(result.lastInsertRowid, i.material_name, i.spec, i.unit, i.quantity, i.unit_price, i.amount));
    }
    
    res.json({ 
      id: result.lastInsertRowid, 
      code, 
      needBudgetApproval,
      message: needBudgetApproval ? '支出合同创建成功，采购量超标需预算员审批' : '支出合同创建成功' 
    });
  } catch (e) { console.error(e); res.status(500).json({ error: '创建失败' }); }
});

// PUT 补充收入合同关联（财务手工操作）
router.put('/:id/link-income', (req, res) => {
  try {
    const { income_contract_id } = req.body;
    db.prepare('UPDATE contracts SET income_contract_id = ? WHERE id = ?').run(income_contract_id, req.params.id);
    res.json({ message: '关联成功' });
  } catch (e) { res.status(500).json({ error: '关联失败' }); }
});

// PUT 状态更新
router.put('/:id/status', (req, res) => {
  try {
    db.prepare('UPDATE contracts SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    res.json({ message: '更新成功' });
  } catch (e) { res.status(500).json({ error: '更新失败' }); }
});

// GET 检查时间窗
router.get('/check-window', (req, res) => {
  res.json({ 
    inWindow: checkInputWindow(),
    day: new Date().getDate(),
    message: checkInputWindow() ? '当前在录入时间窗内' : '不在录入时间窗（25-30日）'
  });
});

module.exports = router;
