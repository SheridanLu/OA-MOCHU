/**
 * 项目启动会管理API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const router = express.Router();
const db = new Database(path.join(__dirname, '../../data/oa.db'));

// ============================================
// 里程碑管理
// ============================================

// 获取项目里程碑列表
router.get('/milestones', (req, res) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    const milestones = db.prepare(`
      SELECT m.*,
        u.name as responsible_name,
        p.name as project_name
      FROM project_milestones m
      LEFT JOIN users u ON m.responsible_user_id = u.id
      LEFT JOIN projects p ON m.project_id = p.id
      WHERE m.project_id = ?
      ORDER BY m.planned_start_date
    `).all(project_id);
    
    res.json({
      success: true,
      data: milestones
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 创建里程碑
router.post('/milestones', (req, res) => {
  try {
    const {
      project_id,
      milestone_name,
      milestone_type,
      planned_start_date,
      planned_end_date,
      responsible_user_id,
      description,
      created_by
    } = req.body;
    
    if (!project_id || !milestone_name) {
      return res.status(400).json({ success: false, error: '项目和里程碑名称为必填项' });
    }
    
    const result = db.prepare(`
      INSERT INTO project_milestones (
        project_id, milestone_name, milestone_type,
        planned_start_date, planned_end_date,
        responsible_user_id, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project_id, milestone_name, milestone_type,
      planned_start_date, planned_end_date,
      responsible_user_id, description, created_by
    );
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: '里程碑创建成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

// 更新里程碑进度
router.put('/milestones/:id/progress', (req, res) => {
  try {
    const { id } = req.params;
    const {
      actual_start_date,
      actual_end_date,
      progress_percent,
      status
    } = req.body;
    
    db.prepare(`
      UPDATE project_milestones
      SET actual_start_date = ?, actual_end_date = ?, progress_percent = ?, status = ?, updated_at = DATETIME('now')
      WHERE id = ?
    `).run(actual_start_date, actual_end_date, progress_percent, status, id);
    
    res.json({
      success: true,
      message: '进度更新成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

// ============================================
// 项目启动文档管理
// ============================================

// 获取启动文档列表
router.get('/docs', (req, res) => {
  try {
    const { project_id, doc_type } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    let sql = `
      SELECT d.*, u.name as creator_name
      FROM project_startup_docs d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.project_id = ?
    `;
    const params = [project_id];
    
    if (doc_type) {
      sql += ' AND d.doc_type = ?';
      params.push(doc_type);
    }
    
    sql += ' ORDER BY d.created_at DESC';
    
    const docs = db.prepare(sql).all(...params);
    
    res.json({
      success: true,
      data: docs
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 创建启动文档
router.post('/docs', (req, res) => {
  try {
    const {
      project_id,
      doc_type,  // overview/milestone/construction_design/site_plan/start_application
      title,
      content,
      attachments,
      created_by
    } = req.body;
    
    if (!project_id || !doc_type || !title) {
      return res.status(400).json({ success: false, error: '项目、文档类型、标题为必填项' });
    }
    
    const validTypes = ['overview', 'milestone', 'construction_design', 'site_plan', 'start_application'];
    if (!validTypes.includes(doc_type)) {
      return res.status(400).json({ success: false, error: '无效的文档类型' });
    }
    
    const result = db.prepare(`
      INSERT INTO project_startup_docs (
        project_id, doc_type, title, content, attachments, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      project_id, doc_type, title, content, JSON.stringify(attachments), created_by
    );
    
    // 创建审批记录
    const approvalFlow = db.prepare(`
      SELECT id FROM approval_flows 
      WHERE business_type = 'project_startup' AND status = 'active'
    `).get();
    
    if (approvalFlow) {
      db.prepare(`
        INSERT INTO approvals (flow_id, business_type, business_id, applicant_id, status)
        VALUES (?, 'project_startup_doc', ?, ?, 'pending')
      `).run(approvalFlow.id, result.lastInsertRowid, created_by);
    }
    
    const docTypeNames = {
      'overview': '项目概况',
      'milestone': '关键里程碑',
      'construction_design': '施工组织设计',
      'site_plan': '现场平面布置图',
      'start_application': '开工申请'
    };
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: `${docTypeNames[doc_type]}创建成功，等待审批`
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

// 审批通过后自动创建施工进度看板
router.post('/docs/:id/complete', (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = db.prepare('SELECT * FROM project_startup_docs WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: '文档不存在' });
    }
    
    if (doc.doc_type === 'milestone' && doc.status === 'approved') {
      // 创建进度监控看板
      db.prepare(`
        INSERT INTO progress_monitors (project_id, monitor_type, status)
        VALUES (?, 'construction', 'active')
      `).run(doc.project_id);
      
      res.json({
        success: true,
        message: '施工进度监控看板已自动创建'
      });
    } else {
      res.json({
        success: true,
        message: '文档已完成'
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '完成失败' });
  }
});

// ============================================
// 项目团队干系人
// ============================================

// 获取项目干系人
router.get('/stakeholders', (req, res) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    // 从项目相关的用户中获取干系人
    const stakeholders = db.prepare(`
      SELECT DISTINCT u.id, u.name, u.phone, u.email, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id IN (
        SELECT created_by FROM projects WHERE id = ?
        UNION
        SELECT created_by FROM contracts WHERE project_id = ?
        UNION
        SELECT created_by FROM labor_quantity_reports WHERE project_id = ?
        UNION
        SELECT created_by FROM change_requests WHERE project_id = ?
      )
    `).all(project_id, project_id, project_id, project_id);
    
    res.json({
      success: true,
      data: stakeholders
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

module.exports = router;
