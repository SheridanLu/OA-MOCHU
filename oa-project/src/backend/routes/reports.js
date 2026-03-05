/**
 * 报表API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 权限检查（可选，如果没有用户信息则允许访问）
const optionalAuth = (req, res, next) => {
  // 如果没有用户信息，设置为默认管理员
  if (!req.user) {
    req.user = { id: 1, role_id: 1, username: 'admin' };
  }
  next();
};

router.use(optionalAuth);

// ============================================
// 报表1: 当月单项目产值占合同总价百分比
// ============================================
router.get('/value-ratio', (req, res) => {
  try {
    const { project_id } = req.query;
    
    let sql = 'SELECT * FROM v_project_value_ratio';
    const params = [];
    
    if (project_id) {
      sql += ' WHERE project_id = ?';
      params.push(project_id);
    }
    
    const data = db.prepare(sql).all(...params);
    
    res.json({
      success: true,
      data,
      report_name: '当月产值占合同比',
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取报表失败' });
  }
});

// ============================================
// 报表2: 单项目已采购量占采购计划百分比
// ============================================
router.get('/purchase-ratio', (req, res) => {
  try {
    const { project_id } = req.query;
    
    let sql = 'SELECT * FROM v_project_purchase_ratio';
    const params = [];
    
    if (project_id) {
      sql += ' WHERE project_id = ?';
      params.push(project_id);
    }
    
    const data = db.prepare(sql).all(...params);
    
    // 汇总统计
    const summary = {
      total_materials: data.length,
      over_budget: data.filter(d => d.purchase_ratio > 100).length,
      in_budget: data.filter(d => d.purchase_ratio <= 100).length
    };
    
    res.json({
      success: true,
      data,
      summary,
      report_name: '采购量占计划比',
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取报表失败' });
  }
});

// ============================================
// 报表3: 项目收支统计
// ============================================
router.get('/finance', (req, res) => {
  try {
    const { project_id } = req.query;
    
    let sql = 'SELECT * FROM v_project_finance';
    const params = [];
    
    if (project_id) {
      sql += ' WHERE project_id = ?';
      params.push(project_id);
    }
    
    const data = db.prepare(sql).all(...params);
    
    // 汇总
    const total = data.reduce((acc, d) => ({
      income_contract_amount: acc.income_contract_amount + d.income_contract_amount,
      income_received: acc.income_received + d.income_received,
      income_receivable: acc.income_receivable + d.income_receivable,
      expense_contract_amount: acc.expense_contract_amount + d.expense_contract_amount,
      expense_paid: acc.expense_paid + d.expense_paid,
      expense_payable: acc.expense_payable + d.expense_payable
    }), {
      income_contract_amount: 0,
      income_received: 0,
      income_receivable: 0,
      expense_contract_amount: 0,
      expense_paid: 0,
      expense_payable: 0
    });
    
    res.json({
      success: true,
      data,
      total,
      report_name: '项目收支统计',
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取报表失败' });
  }
});

// ============================================
// 报表4: 采购合同支付进度
// ============================================
router.get('/payment-progress', (req, res) => {
  try {
    const { project_id } = req.query;
    
    let sql = 'SELECT * FROM v_contract_payment_progress';
    const params = [];
    
    if (project_id) {
      sql += ' WHERE project_id = ?';
      params.push(project_id);
    }
    
    const data = db.prepare(sql).all(...params);
    
    // 汇总
    const summary = {
      total_contracts: data.length,
      total_amount: data.reduce((sum, d) => sum + d.contract_amount, 0),
      total_paid: data.reduce((sum, d) => sum + d.paid_amount, 0),
      total_unpaid: data.reduce((sum, d) => sum + d.unpaid_amount, 0)
    };
    
    res.json({
      success: true,
      data,
      summary,
      report_name: '采购合同支付进度',
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取报表失败' });
  }
});

// ============================================
// 报表5: 综合统计
// ============================================
router.get('/overall', (req, res) => {
  try {
    const data = db.prepare('SELECT * FROM v_overall_statistics').get();
    
    // 计算额外指标
    const extra = {
      income_collection_rate: data.total_income_amount > 0 
        ? ((data.total_received / data.total_income_amount) * 100).toFixed(2)
        : 0,
      expense_payment_rate: data.total_expense_amount > 0 
        ? ((data.total_paid / data.total_expense_amount) * 100).toFixed(2)
        : 0,
      profit_margin: data.total_income_amount > 0 
        ? (((data.total_income_amount - data.total_expense_amount) / data.total_income_amount) * 100).toFixed(2)
        : 0
    };
    
    res.json({
      success: true,
      data,
      extra,
      report_name: '综合统计',
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取报表失败' });
  }
});

// ============================================
// 导出报表（CSV格式）
// ============================================
router.get('/export/:report_type', (req, res) => {
  try {
    const { report_type } = req.params;
    const { project_id } = req.query;
    
    let viewName = '';
    switch (report_type) {
      case 'value-ratio':
        viewName = 'v_project_value_ratio';
        break;
      case 'purchase-ratio':
        viewName = 'v_project_purchase_ratio';
        break;
      case 'finance':
        viewName = 'v_project_finance';
        break;
      case 'payment-progress':
        viewName = 'v_contract_payment_progress';
        break;
      default:
        return res.status(400).json({ success: false, error: '无效的报表类型' });
    }
    
    let sql = `SELECT * FROM ${viewName}`;
    const params = [];
    
    if (project_id) {
      sql += ' WHERE project_id = ?';
      params.push(project_id);
    }
    
    const data = db.prepare(sql).all(...params);
    
    // 转换为CSV
    if (data.length === 0) {
      return res.send('No data');
    }
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = headers + '\n' + rows;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${report_type}_${Date.now()}.csv`);
    res.send('\ufeff' + csv); // BOM for Excel
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '导出失败' });
  }
});

// ============================================
// 保存自定义报表配置
// ============================================
router.post('/save', (req, res) => {
  try {
    const { report_name, report_type, report_config, visible_to } = req.body;
    const created_by = req.user.id;

    const result = db.prepare(`
      INSERT INTO reports (report_name, report_type, report_config, visible_to, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(report_name, report_type, JSON.stringify(report_config), JSON.stringify(visible_to), created_by);

    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: '报表保存成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

// ============================================
// 获取自定义报表列表
// ============================================
router.get('/custom', (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT r.*, u.name as creator_name
      FROM reports r
      LEFT JOIN users u ON r.created_by = u.id
      ORDER BY r.created_at DESC
    `).all();

    // 过滤用户可见的报表
    const visibleReports = reports.filter(report => {
      // 超级管理员可见所有
      if (req.user.role_id === 1 || req.user.username === 'admin') {
        return true;
      }

      // 解析可见人列表
      let visibleTo = [];
      try {
        visibleTo = JSON.parse(report.visible_to || '[]');
      } catch (e) {
        visibleTo = [];
      }

      // 如果没有设置可见人，则所有人可见
      if (visibleTo.length === 0) {
        return true;
      }

      // 检查用户是否在可见人列表中
      return visibleTo.includes(req.user.id);
    });

    res.json({
      success: true,
      data: visibleReports
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// ============================================
// 更新报表可见人
// ============================================
router.put('/:id/visibility', (req, res) => {
  try {
    const { id } = req.params;
    const { visible_to } = req.body;

    db.prepare(`
      UPDATE reports 
      SET visible_to = ?
      WHERE id = ?
    `).run(JSON.stringify(visible_to), id);

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
// 删除自定义报表
// ============================================
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.prepare('DELETE FROM reports WHERE id = ?').run(id);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

module.exports = router;
