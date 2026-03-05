/**
 * 项目详情汇总API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// ============================================
// 获取项目完整详情
// ============================================
router.get('/:id/overview', (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. 项目基本信息
    const project = db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).get(id);
    
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    
    // 2. 合同信息
    const contracts = db.prepare(`
      SELECT id, code, name, type, amount, status, created_at
      FROM contracts
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(id);
    
    const contractStats = db.prepare(`
      SELECT
        COUNT(*) as total_contracts,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_contracts,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_contracts
      FROM contracts
      WHERE project_id = ?
    `).get(id);
    
    // 3. 预算信息
    const budgets = db.prepare(`
      SELECT id, budget_type, total_amount, status, created_at
      FROM project_budgets
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(id);
    
    // 4. 采购清单
    const purchaseList = db.prepare(`
      SELECT COUNT(*) as total_items,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN status = 'purchased' THEN 1 ELSE 0 END) as purchased_items
      FROM project_purchase_lists
      WHERE project_id = ?
    `).get(id);
    
    // 5. 进度监控
    const progress = db.prepare(`
      SELECT type, total_items, completed_items, remaining_items, progress_percent
      FROM progress_monitors
      WHERE project_id = ?
    `).all(id);
    
    // 6. 里程碑
    const milestones = db.prepare(`
      SELECT milestone_name, planned_end_date, progress_percent, status
      FROM project_milestones
      WHERE project_id = ?
      ORDER BY planned_start_date
    `).all(id);
    
    // 7. 劳务提报
    const laborReports = db.prepare(`
      SELECT COUNT(*) as total_reports,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count
      FROM labor_quantity_reports
      WHERE project_id = ?
    `).get(id);
    
    // 8. 变更签证
    const changeRequests = db.prepare(`
      SELECT type, COUNT(*) as count, SUM(amount) as total_amount
      FROM change_requests
      WHERE project_id = ?
      GROUP BY type
    `).all(id);
    
    // 9. 工程对账单
    const statements = db.prepare(`
      SELECT COUNT(*) as total_statements,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM statements
      WHERE project_id = ?
    `).get(id);
    
    // 10. 物资流水
    const materials = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as total_in,
        SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as total_out
      FROM material_transactions
      WHERE project_id = ?
    `).get(id);
    
    // 11. 竣工文档
    const completionDocs = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM completion_docs
      WHERE project_id = ?
      GROUP BY type
    `).all(id);
    
    // 汇总数据
    const overview = {
      project,
      statistics: {
        contracts: contractStats || {},
        budgets: { count: budgets.length, latest: budgets[0] },
        purchase: purchaseList || {},
        progress: {
          design: progress.find(p => p.type === 'design') || {},
          construction: progress.find(p => p.type === 'construction') || {}
        },
        labor: laborReports || {},
        changes: changeRequests || [],
        statements: statements || {},
        materials: materials || {}
      },
      details: {
        contracts: contracts.slice(0, 5),
        budgets: budgets,
        milestones: milestones,
        changeRequests: changeRequests,
        completionDocs: completionDocs
      }
    };
    
    res.json({
      success: true,
      data: overview
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取项目详情失败' });
  }
});

// ============================================
// 获取项目合同详情列表
// ============================================
router.get('/:id/contracts', (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    
    let sql = `
      SELECT c.*
      FROM contracts c
      WHERE c.project_id = ?
    `;
    const params = [id];
    
    if (type) {
      sql += ' AND c.type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY c.created_at DESC';
    
    const contracts = db.prepare(sql).all(...params);
    
    res.json({
      success: true,
      data: contracts
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取合同列表失败' });
  }
});

// ============================================
// 获取项目进度详情
// ============================================
router.get('/:id/progress', (req, res) => {
  try {
    const { id } = req.params;
    
    const designProgress = db.prepare(`
      SELECT * FROM progress_monitors WHERE project_id = ? AND type = 'design'
    `).get(id);
    
    const constructionProgress = db.prepare(`
      SELECT * FROM progress_monitors WHERE project_id = ? AND type = 'construction'
    `).get(id);
    
    const milestones = db.prepare(`
      SELECT m.*
      FROM project_milestones m
      WHERE m.project_id = ?
      ORDER BY m.planned_start_date
    `).all(id);
    
    res.json({
      success: true,
      data: {
        design: designProgress,
        construction: constructionProgress,
        milestones
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取进度详情失败' });
  }
});

// ============================================
// 获取项目财务摘要
// ============================================
router.get('/:id/finance', (req, res) => {
  try {
    const { id } = req.params;
    
    // 收入统计
    const income = db.prepare(`
      SELECT
        COUNT(*) as contract_count,
        SUM(amount) as total_amount
      FROM contracts
      WHERE project_id = ? AND type = 'income'
    `).get(id);
    
    // 支出统计
    const expense = db.prepare(`
      SELECT
        COUNT(*) as contract_count,
        SUM(amount) as total_amount
      FROM contracts
      WHERE project_id = ? AND type = 'expense'
    `).get(id);
    
    // 劳务支出
    const labor = db.prepare(`
      SELECT SUM(amount) as total_amount
      FROM labor_quantity_reports
      WHERE project_id = ? AND status = 'approved'
    `).get(id);
    
    // 物资支出
    const materials = db.prepare(`
      SELECT SUM(total_amount) as total_amount
      FROM material_transactions
      WHERE project_id = ? AND type = 'in'
    `).get(id);
    
    res.json({
      success: true,
      data: {
        income: income || {},
        expense: expense || {},
        labor: labor || {},
        materials: materials || {},
        summary: {
          total_income: income?.total_amount || 0,
          total_expense: (expense?.total_amount || 0) + (labor?.total_amount || 0) + (materials?.total_amount || 0)
        }
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取财务摘要失败' });
  }
});

module.exports = router;
