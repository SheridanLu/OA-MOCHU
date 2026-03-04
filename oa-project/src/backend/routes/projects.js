/**
 * 项目管理 API - 完整版（核心字段对齐）
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// ==================== 编号生成 ====================

/**
 * 生成实体项目编号（10位）
 * 格式: P + 年份(4位) + 序号(6位)
 * 示例: P2026000001
 */
function generateEntityCode() {
  const year = new Date().getFullYear();
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM projects 
    WHERE type = 'entity' AND strftime('%Y', created_at) = ?
  `).get(String(year));
  return `P${year}${String(count.count + 1).padStart(6, '0')}`;
}

/**
 * 生成虚拟项目编号（8位）
 * 格式: V + 年份(4位) + 序号(4位)
 * 示例: V20260001
 */
function generateVirtualCode() {
  const year = new Date().getFullYear();
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM projects 
    WHERE type = 'virtual' AND strftime('%Y', created_at) = ?
  `).get(String(year));
  return `V${year}${String(count.count + 1).padStart(4, '0')}`;
}

// ==================== 创建审批 ====================

function createApproval(businessType, businessId) {
  const flow = db.prepare('SELECT * FROM approval_flows WHERE business_type = ? AND status = ?').get(businessType, 'active');
  if (!flow) return null;
  
  const result = db.prepare('INSERT INTO approvals (flow_id, business_type, business_id, status) VALUES (?, ?, ?, ?)')
    .run(flow.id, businessType, businessId, 'pending');
  return result.lastInsertRowid;
}

// ==================== GET 项目列表 ====================

router.get('/', (req, res) => {
  try {
    const { type, status, keyword, created_by } = req.query;
    let sql = `
      SELECT p.*, u.name as creator_name, d.name as creator_department,
        tp.code as target_project_code, tp.name as target_project_name
      FROM projects p 
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN projects tp ON p.target_project_id = tp.id
      WHERE 1=1
    `;
    const params = [];
    
    if (type) { sql += ' AND p.type = ?'; params.push(type); }
    if (status) { sql += ' AND p.status = ?'; params.push(status); }
    if (created_by) { sql += ' AND p.created_by = ?'; params.push(created_by); }
    if (keyword) {
      sql += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.alias LIKE ?)';
      const k = `%${keyword}%`;
      params.push(k, k, k);
    }
    
    sql += ' ORDER BY p.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取失败' });
  }
});

// ==================== GET 项目详情 ====================

router.get('/:id', (req, res) => {
  try {
    const project = db.prepare(`
      SELECT p.*, u.name as creator_name, d.name as creator_department,
        tp.code as target_project_code, tp.name as target_project_name,
        cf.code as converted_from_code, cf.name as converted_from_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN projects tp ON p.target_project_id = tp.id
      LEFT JOIN projects cf ON p.converted_from = cf.id
      WHERE p.id = ?
    `).get(req.params.id);
    
    if (!project) return res.status(404).json({ error: '项目不存在' });
    
    // 获取关联数据
    const contracts = db.prepare(`SELECT id, code, name, type, amount, status FROM contracts WHERE project_id = ?`).all(req.params.id);
    const paymentPlans = db.prepare(`SELECT * FROM payment_plans WHERE project_id = ? ORDER BY batch_no`).all(req.params.id);
    const statements = db.prepare(`SELECT * FROM statements WHERE project_id = ? ORDER BY period DESC`).all(req.params.id);
    
    res.json({ ...project, contracts, paymentPlans, statements });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取失败' });
  }
});

// ==================== POST 虚拟项目立项 ====================

router.post('/virtual', (req, res) => {
  try {
    const {
      name,           // 虚拟合同名称（必填）
      location,       // 合同地点
      contract_amount,// 合同含税金额（万元）
      party_a,        // 甲方单位名称
      contract_type,  // 合同类型
      virtual_limit,  // 拟投入项目金额限额
      created_by      // 发起人ID（必填）
    } = req.body;
    
    if (!name) return res.status(400).json({ error: '虚拟合同名称不能为空' });
    if (!created_by) return res.status(400).json({ error: '发起人不能为空' });
    
    // 生成8位编号
    const code = generateVirtualCode();
    
    const result = db.prepare(`
      INSERT INTO projects (
        code, name, type, location, party_a,
        contract_amount, contract_type, virtual_limit,
        status, created_by
      ) VALUES (?, ?, 'virtual', ?, ?, ?, ?, ?, 'pending', ?)
    `).run(code, name, location, party_a, contract_amount || 0, contract_type, virtual_limit, created_by);
    
    // 创建审批流程
    createApproval('project', result.lastInsertRowid);
    
    res.json({
      id: result.lastInsertRowid,
      code,
      status: 'pending',
      created_by,
      message: '虚拟项目创建成功，等待审批'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '创建失败' });
  }
});

// ==================== POST 实体项目立项 ====================

router.post('/entity', (req, res) => {
  try {
    const {
      name,              // 合同名称（必填）
      alias,             // 项目别名
      location,          // 项目地点
      contract_amount,   // 合同含税金额（万元）
      amount_no_tax,     // 不含税金额（万元）
      tax_rate,          // 税率（%）
      tax_amount,        // 税金（万元）
      party_a,           // 甲方单位名称
      party_a_bank,      // 甲方银行信息
      party_a_contact,   // 甲方联系人
      party_a_phone,     // 甲方电话
      party_a_address,   // 甲方地址
      contract_type,     // 合同类型
      start_date,        // 开始时间
      end_date,          // 结束时间
      warranty_period,   // 保修期（月）
      return_plan_time,  // 回款计划时间
      return_plan_amount,// 回款计划金额
      payment_plans,     // 付款计划数组
      created_by         // 发起人ID（必填）
    } = req.body;
    
    if (!name) return res.status(400).json({ error: '合同名称不能为空' });
    if (!created_by) return res.status(400).json({ error: '发起人不能为空' });
    
    // 生成10位编号
    const code = generateEntityCode();
    
    // 计算税金
    const calcTax = tax_amount || (contract_amount && tax_rate ? contract_amount * tax_rate / 100 : 0);
    
    // 开启事务
    const result = db.transaction(() => {
      // 插入项目
      const projectResult = db.prepare(`
        INSERT INTO projects (
          code, name, alias, type, location,
          party_a, party_a_contact, party_a_phone, party_a_bank, party_a_address,
          contract_amount, amount_no_tax, tax_rate, tax_amount, contract_type,
          start_date, end_date, warranty_period,
          return_plan_time, return_plan_amount,
          status, created_by
        ) VALUES (?, ?, ?, 'entity', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        code, name, alias, location,
        party_a, party_a_contact, party_a_phone, party_a_bank, party_a_address,
        contract_amount || 0, amount_no_tax || 0, tax_rate || 0, calcTax, contract_type,
        start_date, end_date, warranty_period || 0,
        return_plan_time, return_plan_amount,
        created_by
      );
      
      // 插入付款计划
      if (payment_plans && payment_plans.length > 0) {
        const stmt = db.prepare(`
          INSERT INTO payment_plans (project_id, batch_no, planned_date, amount, plan_ratio, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        payment_plans.forEach(plan => {
          stmt.run(
            projectResult.lastInsertRowid,
            plan.batch_no,
            plan.planned_date,
            plan.amount || 0,
            plan.plan_ratio || 0,
            created_by
          );
        });
      }
      
      return projectResult;
    })();
    
    // 创建审批流程
    createApproval('project', result.lastInsertRowid);
    
    res.json({
      id: result.lastInsertRowid,
      code,
      status: 'pending',
      created_by,
      message: '实体项目创建成功，等待审批'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '创建失败' });
  }
});

// ==================== POST 虚拟项目中止 ====================

router.post('/:id/suspend', (req, res) => {
  try {
    const { id } = req.params;
    const { 
      target_project_id,    // 成本下挂目标项目ID（实体项目）
      reason                // 中止原因
    } = req.body;
    
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    if (project.type !== 'virtual') return res.status(400).json({ error: '只有虚拟项目可以中止' });
    if (project.status === 'suspended') return res.status(400).json({ error: '项目已中止' });
    
    // 验证目标项目
    let targetCode = null;
    if (target_project_id) {
      const target = db.prepare('SELECT * FROM projects WHERE id = ?').get(target_project_id);
      if (!target) return res.status(400).json({ error: '目标项目不存在' });
      if (target.type !== 'entity') return res.status(400).json({ error: '成本下挂目标必须是实体项目' });
      targetCode = target.code;  // 10位编号
    }
    
    // 执行中止（事务）
    db.transaction(() => {
      // 1. 更新项目状态
      db.prepare(`
        UPDATE projects 
        SET status = 'suspended', 
            target_project_id = ?,
            target_project_code = ?
        WHERE id = ?
      `).run(target_project_id || null, targetCode, id);
      
      // 2. 转移成本（物资流水）
      if (target_project_id) {
        db.prepare(`UPDATE material_transactions SET project_id = ? WHERE project_id = ?`)
          .run(target_project_id, id);
        
        // 3. 转移合同
        db.prepare(`UPDATE contracts SET project_id = ? WHERE project_id = ?`)
          .run(target_project_id, id);
      }
    })();
    
    res.json({
      id,
      code: project.code,
      status: 'suspended',
      target_project_id,
      target_project_code: targetCode,
      message: target_project_id 
        ? `项目已中止，成本已划拨至 ${targetCode}` 
        : '项目已中止，成本归入公司综合成本'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '操作失败' });
  }
});

// ==================== POST 虚拟转实体 ====================

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
    
    // 生成新的10位实体编号
    const newCode = generateEntityCode();
    
    db.transaction(() => {
      // 更新项目类型和编号
      db.prepare(`
        UPDATE projects 
        SET type = 'entity', code = ?, converted_from = ?, status = 'converting'
        WHERE id = ?
      `).run(newCode, id, id);
      
      // 文件和成本已经在原项目下，无需迁移
    })();
    
    // 创建审批流程
    createApproval('project_convert', id);
    
    res.json({
      id,
      old_code: project.code,
      new_code: newCode,
      status: 'converting',
      message: '转换申请已提交，等待审批'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '转换失败' });
  }
});

// ==================== PUT 更新项目进度 ====================

router.put('/:id/progress', (req, res) => {
  try {
    const { progress_percent } = req.body;
    if (progress_percent < 0 || progress_percent > 100) {
      return res.status(400).json({ error: '进度百分比必须在0-100之间' });
    }
    
    db.prepare('UPDATE projects SET progress_percent = ?, updated_at = DATETIME("now") WHERE id = ?')
      .run(progress_percent, req.params.id);
    
    res.json({ message: '进度更新成功' });
  } catch (e) {
    res.status(500).json({ error: '更新失败' });
  }
});

// ==================== 付款计划管理 ====================

// GET 付款计划
router.get('/:id/payment-plans', (req, res) => {
  try {
    const plans = db.prepare(`
      SELECT pp.*, u.name as creator_name
      FROM payment_plans pp
      LEFT JOIN users u ON pp.created_by = u.id
      WHERE pp.project_id = ?
      ORDER BY pp.batch_no
    `).all(req.params.id);
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// POST 添加付款计划
router.post('/:id/payment-plans', (req, res) => {
  try {
    const { batch_no, planned_date, amount, plan_ratio, created_by } = req.body;
    
    const result = db.prepare(`
      INSERT INTO payment_plans (project_id, batch_no, planned_date, amount, plan_ratio, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, batch_no, planned_date, amount || 0, plan_ratio || 0, created_by);
    
    res.json({ id: result.lastInsertRowid, message: '添加成功' });
  } catch (e) {
    res.status(500).json({ error: '添加失败' });
  }
});

// PUT 更新实际付款
router.put('/payment-plans/:planId', (req, res) => {
  try {
    const { actual_date, actual_amount } = req.body;
    const status = actual_amount ? 'completed' : 'pending';
    
    db.prepare(`
      UPDATE payment_plans 
      SET actual_date = ?, actual_amount = ?, status = ?
      WHERE id = ?
    `).run(actual_date, actual_amount, status, req.params.planId);
    
    res.json({ message: '更新成功' });
  } catch (e) {
    res.status(500).json({ error: '更新失败' });
  }
});

module.exports = router;
