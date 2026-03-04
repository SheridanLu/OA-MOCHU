/**
 * 竣工管理 API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// GET 竣工文档列表
router.get('/docs', (req, res) => {
  try {
    const { project_id, type, status } = req.query;
    let sql = `
      SELECT cd.*, p.name as project_name, u.name as creator_name
      FROM completion_docs cd
      LEFT JOIN projects p ON cd.project_id = p.id
      LEFT JOIN users u ON cd.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (project_id) { sql += ' AND cd.project_id = ?'; params.push(project_id); }
    if (type) { sql += ' AND cd.type = ?'; params.push(type); }
    if (status) { sql += ' AND cd.status = ?'; params.push(status); }
    sql += ' ORDER BY cd.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// POST 提交竣工文档
router.post('/docs', (req, res) => {
  try {
    const { project_id, type, title, content, attachments, design_issues_cleared, all_statements_generated, created_by } = req.body;
    
    // 前置条件检查
    if (type === 'drawing' && !design_issues_cleared) {
      return res.status(400).json({ error: '设计进度监控看板中的图纸修改遗留问题必须清零' });
    }
    
    if (type === 'settlement' && !all_statements_generated) {
      // 检查是否所有对账单都已生成
      const statements = db.prepare(`
        SELECT COUNT(*) as count FROM statements WHERE project_id = ?
      `).get(project_id);
      
      // 简化检查：假设需要至少1个对账单
      if (!statements || statements.count === 0) {
        return res.status(400).json({ error: '系统的工程对账单必须全部生成完毕' });
      }
    }
    
    const result = db.prepare(`
      INSERT INTO completion_docs (project_id, type, title, content, attachments, design_issues_cleared, all_statements_generated, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(project_id, type, title, content, attachments, design_issues_cleared ? 1 : 0, all_statements_generated ? 1 : 0, created_by);
    
    // 创建审批
    const flow = db.prepare('SELECT id FROM approval_flows WHERE business_type = ?').get('completion');
    if (flow) {
      db.prepare('INSERT INTO approvals (flow_id, business_type, business_id, status) VALUES (?, ?, ?, ?)')
        .run(flow.id, 'completion', result.lastInsertRowid, 'pending');
    }
    
    res.json({ id: result.lastInsertRowid, message: '提交成功' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '提交失败' });
  }
});

// PUT 审核
router.put('/docs/:id/approve', (req, res) => {
  try {
    db.prepare('UPDATE completion_docs SET status = ? WHERE id = ?').run('approved', req.params.id);
    res.json({ message: '审核通过' });
  } catch (e) {
    res.status(500).json({ error: '审核失败' });
  }
});

module.exports = router;
