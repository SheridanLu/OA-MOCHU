/**
 * 劳务提报工程量核算API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const router = express.Router();
const db = new Database(path.join(__dirname, '../../data/oa.db'));

// 生成报告编号
function generateReportNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM labor_quantity_reports
    WHERE strftime('%Y%m', created_at) = ?
  `).get(`${year}${month}`).count;
  
  return `LQ${year}${month}${String(count + 1).padStart(4, '0')}`;
}

// ============================================
// 获取列表
// ============================================
router.get('/', (req, res) => {
  try {
    const { project_id, status, keyword } = req.query;
    
    let sql = `
      SELECT l.*, 
        p.code as project_code, p.name as project_name,
        c.code as contract_code, c.name as contract_name,
        s.period as statement_period,
        u.name as creator_name
      FROM labor_quantity_reports l
      LEFT JOIN projects p ON l.project_id = p.id
      LEFT JOIN contracts c ON l.contract_id = c.id
      LEFT JOIN statements s ON l.statement_id = s.id
      LEFT JOIN users u ON l.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (project_id) {
      sql += ' AND l.project_id = ?';
      params.push(project_id);
    }
    
    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }
    
    if (keyword) {
      sql += ' AND (p.name LIKE ? OR p.code LIKE ? OR l.report_no LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    
    sql += ' ORDER BY l.created_at DESC';
    
    const data = db.prepare(sql).all(...params);
    
    res.json({
      success: true,
      data
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// ============================================
// 获取详情
// ============================================
router.get('/:id', (req, res) => {
  try {
    const report = db.prepare(`
      SELECT l.*,
        p.code as project_code, p.name as project_name,
        c.code as contract_code, c.name as contract_name,
        s.period as statement_period,
        u.name as creator_name
      FROM labor_quantity_reports l
      LEFT JOIN projects p ON l.project_id = p.id
      LEFT JOIN contracts c ON l.contract_id = c.id
      LEFT JOIN statements s ON l.statement_id = s.id
      LEFT JOIN users u ON l.created_by = u.id
      WHERE l.id = ?
    `).get(req.params.id);
    
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// ============================================
// 创建报告
// ============================================
router.post('/', (req, res) => {
  try {
    const {
      project_id,
      contract_id,
      statement_id,
      photos,              // 隐蔽工程照片（JSON数组）
      calculation_formula, // 工程量计算式
      quantity,
      unit_price,
      amount,
      description,
      created_by
    } = req.body;
    
    // 验证必填字段
    if (!project_id || !contract_id || !quantity || !amount) {
      return res.status(400).json({
        success: false,
        error: '项目、合同、工程量、金额为必填项'
      });
    }
    
    // 验证项目状态（必须已开工）
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
    if (!project) {
      return res.status(400).json({ success: false, error: '项目不存在' });
    }
    
    if (project.status !== 'approved') {
      return res.status(400).json({ success: false, error: '项目未开工，无法提报' });
    }
    
    // 生成报告编号
    const report_no = generateReportNo();
    
    // 插入数据
    const result = db.prepare(`
      INSERT INTO labor_quantity_reports (
        project_id, contract_id, statement_id, report_no,
        photos, calculation_formula, quantity, unit_price, amount,
        description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project_id, contract_id, statement_id, report_no,
      JSON.stringify(photos), calculation_formula, quantity, unit_price, amount,
      description, created_by
    );
    
    // 创建审批记录
    const approvalFlow = db.prepare(`
      SELECT id FROM approval_flows 
      WHERE business_type = 'labor_quantity_report' AND status = 'active'
    `).get();
    
    if (approvalFlow) {
      db.prepare(`
        INSERT INTO approvals (flow_id, business_type, business_id, applicant_id, status)
        VALUES (?, 'labor_quantity_report', ?, ?, 'pending')
      `).run(approvalFlow.id, result.lastInsertRowid, created_by);
    }
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      report_no,
      message: '劳务提报创建成功，等待审批'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

// ============================================
// 更新报告
// ============================================
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      photos,
      calculation_formula,
      quantity,
      unit_price,
      amount,
      description
    } = req.body;
    
    const report = db.prepare('SELECT * FROM labor_quantity_reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }
    
    if (report.status !== 'pending') {
      return res.status(400).json({ success: false, error: '只能修改待审批的报告' });
    }
    
    db.prepare(`
      UPDATE labor_quantity_reports
      SET photos = ?, calculation_formula = ?, quantity = ?, unit_price = ?, amount = ?, description = ?, updated_at = DATETIME('now')
      WHERE id = ?
    `).run(
      JSON.stringify(photos), calculation_formula, quantity, unit_price, amount, description, id
    );
    
    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

// ============================================
// 删除报告
// ============================================
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const report = db.prepare('SELECT * FROM labor_quantity_reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }
    
    if (report.status !== 'pending') {
      return res.status(400).json({ success: false, error: '只能删除待审批的报告' });
    }
    
    // 删除审批记录
    db.prepare('DELETE FROM approvals WHERE business_type = ? AND business_id = ?')
      .run('labor_quantity_report', id);
    
    // 删除报告
    db.prepare('DELETE FROM labor_quantity_reports WHERE id = ?').run(id);
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

// ============================================
// 按项目统计
// ============================================
router.get('/statistics/by-project', (req, res) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_reports,
        SUM(quantity) as total_quantity,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
      FROM labor_quantity_reports
      WHERE project_id = ?
    `).get(project_id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '统计失败' });
  }
});

module.exports = router;
