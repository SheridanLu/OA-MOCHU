/**
 * 竣工管理API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const router = express.Router();
const db = new Database(path.join(__dirname, '../../data/oa.db'));

// ============================================
// 竣工文档管理
// ============================================

// 获取竣工文档列表
router.get('/docs', (req, res) => {
  try {
    const { project_id, type } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    let sql = `
      SELECT c.*, u.name as creator_name, p.name as project_name
      FROM completion_docs c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE c.project_id = ?
    `;
    const params = [project_id];
    
    if (type) {
      sql += ' AND c.type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY c.created_at DESC';
    
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

// 获取竣工文档详情
router.get('/docs/:id', (req, res) => {
  try {
    const doc = db.prepare(`
      SELECT c.*, u.name as creator_name, p.name as project_name
      FROM completion_docs c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE c.id = ?
    `).get(req.params.id);
    
    if (!doc) {
      return res.status(404).json({ success: false, error: '文档不存在' });
    }
    
    res.json({
      success: true,
      data: doc
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 创建竣工文档
router.post('/docs', (req, res) => {
  try {
    const {
      project_id,
      type,  // labor_settlement/project_settlement/drawing_review/file_review/archive
      title,
      content,
      attachments,
      created_by
    } = req.body;
    
    if (!project_id || !type || !title) {
      return res.status(400).json({ success: false, error: '项目、类型、标题为必填项' });
    }
    
    const validTypes = ['labor_settlement', 'project_settlement', 'drawing_review', 'file_review', 'archive'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: '无效的文档类型' });
    }
    
    // 前置条件校验
    let canCreate = true;
    let reason = '';
    
    if (type === 'drawing_review') {
      // 竣工图纸审核：设计进度监控中遗留问题必须清零
      const designProgress = db.prepare(`
        SELECT remaining_items FROM progress_monitors
        WHERE project_id = ? AND type = 'design'
      `).get(project_id);
      
      if (designProgress && designProgress.remaining_items > 0) {
        canCreate = false;
        reason = '设计进度监控中遗留问题未清零，无法发起竣工图纸审核';
      }
    }
    
    if (type === 'file_review') {
      // 竣工结算文件审核：工程对账单必须全部生成
      const statements = db.prepare(`
        SELECT COUNT(*) as count FROM statements WHERE project_id = ? AND status != 'approved'
      `).get(project_id);
      
      if (statements && statements.count > 0) {
        canCreate = false;
        reason = '工程对账单未全部生成，无法发起竣工结算文件审核';
      }
    }
    
    if (!canCreate) {
      return res.status(400).json({ success: false, error: reason });
    }
    
    // 插入数据
    const result = db.prepare(`
      INSERT INTO completion_docs (
        project_id, type, title, content, attachments, created_by,
        design_issues_cleared, all_statements_generated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project_id, type, title, content, JSON.stringify(attachments), created_by,
      type === 'drawing_review' ? 1 : 0,
      type === 'file_review' ? 1 : 0
    );
    
    // 创建审批记录
    const approvalFlow = db.prepare(`
      SELECT id FROM approval_flows 
      WHERE business_type = 'completion_doc' AND status = 'active'
    `).get();
    
    if (approvalFlow) {
      db.prepare(`
        INSERT INTO approvals (flow_id, business_type, business_id, applicant_id, status)
        VALUES (?, 'completion_doc', ?, ?, 'pending')
      `).run(approvalFlow.id, result.lastInsertRowid, created_by);
    }
    
    const typeNames = {
      'labor_settlement': '劳务竣工结算',
      'project_settlement': '项目竣工结算',
      'drawing_review': '竣工图纸审核',
      'file_review': '竣工结算文件审核',
      'archive': '文档归档'
    };
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: `${typeNames[type]}创建成功，等待审批`
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

// 更新竣工文档
router.put('/docs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, attachments } = req.body;
    
    const doc = db.prepare('SELECT * FROM completion_docs WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: '文档不存在' });
    }
    
    if (doc.status !== 'pending') {
      return res.status(400).json({ success: false, error: '只能修改待审批的文档' });
    }
    
    db.prepare(`
      UPDATE completion_docs
      SET title = ?, content = ?, attachments = ?
      WHERE id = ?
    `).run(title, content, JSON.stringify(attachments), id);
    
    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

// 删除竣工文档
router.delete('/docs/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = db.prepare('SELECT * FROM completion_docs WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: '文档不存在' });
    }
    
    if (doc.status !== 'pending') {
      return res.status(400).json({ success: false, error: '只能删除待审批的文档' });
    }
    
    // 删除审批记录
    db.prepare('DELETE FROM approvals WHERE business_type = ? AND business_id = ?')
      .run('completion_doc', id);
    
    // 删除文档
    db.prepare('DELETE FROM completion_docs WHERE id = ?').run(id);
    
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
// 前置条件校验
// ============================================

// 校验是否可以发起竣工图纸审核
router.get('/check/drawing-review', (req, res) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    const designProgress = db.prepare(`
      SELECT remaining_items FROM progress_monitors
      WHERE project_id = ? AND type = 'design'
    `).get(project_id);
    
    const canCreate = !designProgress || designProgress.remaining_items === 0;
    
    res.json({
      success: true,
      canCreate,
      reason: canCreate ? '' : '设计进度监控中遗留问题未清零'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '校验失败' });
  }
});

// 校验是否可以发起竣工结算文件审核
router.get('/check/file-review', (req, res) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    const statements = db.prepare(`
      SELECT COUNT(*) as count FROM statements WHERE project_id = ? AND status != 'approved'
    `).get(project_id);
    
    const canCreate = !statements || statements.count === 0;
    
    res.json({
      success: true,
      canCreate,
      reason: canCreate ? '' : '工程对账单未全部生成'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '校验失败' });
  }
});

// ============================================
// 归档管理
// ============================================

// 获取归档文档列表
router.get('/archives', (req, res) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    const archives = db.prepare(`
      SELECT * FROM completion_docs
      WHERE project_id = ? AND type = 'archive'
      ORDER BY created_at DESC
    `).all(project_id);
    
    res.json({
      success: true,
      data: archives
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 创建归档
router.post('/archives', (req, res) => {
  try {
    const {
      project_id,
      archive_type,  // visa/design_change/tech_review/meeting_records/tech_docs
      title,
      attachments,
      created_by
    } = req.body;
    
    const archiveTypeNames = {
      'visa': '签证和设计变更文件',
      'design_change': '工程洽商/技术核定单',
      'tech_review': '图纸会审记录',
      'meeting_records': '工地会议纪要',
      'tech_docs': '工程档案及技术资料'
    };
    
    const result = db.prepare(`
      INSERT INTO completion_docs (
        project_id, type, title, content, attachments, created_by, status
      ) VALUES (?, 'archive', ?, ?, ?, ?, 'approved')
    `).run(
      project_id, 
      `${archiveTypeNames[archive_type]} - ${title}`, 
      JSON.stringify({ archive_type }), 
      JSON.stringify(attachments), 
      created_by
    );
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: '归档成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '归档失败' });
  }
});

module.exports = router;
