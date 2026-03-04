/**
 * 工资与薪酬管理 API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// GET 工资表列表
router.get('/salaries', (req, res) => {
  try {
    const { year, month, status } = req.query;
    let sql = `
      SELECT sr.*, u.name as user_name, u.employee_no, d.name as department_name,
        adj.name as adjuster_name
      FROM salary_records sr
      JOIN users u ON sr.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users adj ON sr.adjusted_by = adj.id
      WHERE 1=1
    `;
    const params = [];
    if (year) { sql += ' AND sr.year = ?'; params.push(year); }
    if (month) { sql += ' AND sr.month = ?'; params.push(month); }
    if (status) { sql += ' AND sr.status = ?'; params.push(status); }
    sql += ' ORDER BY sr.year DESC, sr.month DESC, u.department_id';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// POST 自动生成工资表（基于FLAG标记）
router.post('/salaries/generate', (req, res) => {
  try {
    const { year, month } = req.body;
    
    // 获取所有标记用户
    const flaggedUsers = db.prepare(`
      SELECT id FROM users WHERE flag_marked = 1 AND status = 'active'
    `).all();
    
    let generated = 0;
    const insertSalary = db.prepare(`
      INSERT OR IGNORE INTO salary_records (user_id, year, month, base_salary, status)
      VALUES (?, ?, ?, 0, 'draft')
    `);
    
    flaggedUsers.forEach(u => {
      const result = insertSalary.run(u.id, year, month);
      if (result.changes > 0) generated++;
    });
    
    res.json({ generated, message: `已生成 ${generated} 条工资记录` });
  } catch (e) {
    res.status(500).json({ error: '生成失败' });
  }
});

// PUT 财务调整工资
router.put('/salaries/:id', (req, res) => {
  try {
    const { base_salary, bonus, deduction, adjustment_note, adjusted_by } = req.body;
    const actual_salary = (base_salary || 0) + (bonus || 0) - (deduction || 0);
    
    db.prepare(`
      UPDATE salary_records 
      SET base_salary = ?, bonus = ?, deduction = ?, actual_salary = ?, adjustment_note = ?, adjusted_by = ?, status = 'adjusted'
      WHERE id = ?
    `).run(base_salary, bonus, deduction, actual_salary, adjustment_note, adjusted_by, req.params.id);
    
    res.json({ message: '调整成功' });
  } catch (e) {
    res.status(500).json({ error: '调整失败' });
  }
});

// PUT 提交审核
router.put('/salaries/:id/submit', (req, res) => {
  try {
    db.prepare('UPDATE salary_records SET status = ? WHERE id = ?').run('pending_approval', req.params.id);
    res.json({ message: '已提交审核' });
  } catch (e) {
    res.status(500).json({ error: '提交失败' });
  }
});

// PUT 总经理审核通过
router.put('/salaries/:id/approve', (req, res) => {
  try {
    db.prepare('UPDATE salary_records SET status = ? WHERE id = ?').run('approved', req.params.id);
    res.json({ message: '审核通过' });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

// PUT 打款完成
router.put('/salaries/:id/pay', (req, res) => {
  try {
    db.prepare('UPDATE salary_records SET status = ? WHERE id = ?').run('paid', req.params.id);
    res.json({ message: '打款完成' });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

// GET 工资统计
router.get('/salaries/summary', (req, res) => {
  try {
    const { year, month } = req.query;
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(actual_salary) as total_amount,
        SUM(CASE WHEN status = 'paid' THEN actual_salary ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'pending_approval' THEN actual_salary ELSE 0 END) as pending_amount
      FROM salary_records
      WHERE year = ? AND month = ?
    `).get(year, month);
    res.json(summary);
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

module.exports = router;
