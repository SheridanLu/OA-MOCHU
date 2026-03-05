/**
 * 进度监控看板API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// ============================================
// 设计进度监控
// ============================================

// 获取设计答疑文件列表
router.get('/design/files', (req, res) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    const files = db.prepare(`
      SELECT d.*, u.name as uploader_name
      FROM design_qa_files d
      LEFT JOIN users u ON d.upload_by = u.id
      WHERE d.project_id = ?
      ORDER BY d.upload_at DESC
    `).all(project_id);
    
    res.json({
      success: true,
      data: files
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 上传设计答疑文件
router.post('/design/files', (req, res) => {
  try {
    const {
      project_id,
      file_name,
      file_path,
      file_type,
      is_final,
      upload_by
    } = req.body;
    
    if (!project_id || !file_name || !file_path) {
      return res.status(400).json({ success: false, error: '项目、文件名、文件路径为必填项' });
    }
    
    const result = db.prepare(`
      INSERT INTO design_qa_files (
        project_id, file_name, file_path, file_type, is_final, upload_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(project_id, file_name, file_path, file_type, is_final ? 1 : 0, upload_by);
    
    // 如果是正式答疑文档，更新进度监控
    if (is_final) {
      updateDesignProgress(project_id);
    }
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: '文件上传成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '上传失败' });
  }
});

// 获取设计进度看板
router.get('/design/dashboard', (req, res) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    const dashboard = db.prepare(`
      SELECT * FROM progress_monitors
      WHERE project_id = ? AND type = 'design'
    `).get(project_id);
    
    if (!dashboard) {
      // 创建默认看板
      db.prepare(`
        INSERT INTO progress_monitors (project_id, type, total_items, completed_items, remaining_items)
        VALUES (?, 'design', 0, 0, 0)
      `).run(project_id);
      
      return res.json({
        success: true,
        data: {
          project_id,
          type: 'design',
          total_items: 0,
          completed_items: 0,
          remaining_items: 0,
          progress_percent: 0
        }
      });
    }
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 更新设计进度
router.put('/design/progress', (req, res) => {
  try {
    const { project_id, total_items, completed_items } = req.body;
    
    const remaining_items = total_items - completed_items;
    const progress_percent = total_items > 0 ? (completed_items / total_items * 100).toFixed(2) : 0;
    
    db.prepare(`
      UPDATE progress_monitors
      SET total_items = ?, completed_items = ?, remaining_items = ?, progress_percent = ?, updated_at = DATETIME('now')
      WHERE project_id = ? AND type = 'design'
    `).run(total_items, completed_items, remaining_items, progress_percent, project_id);
    
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
// 施工进度监控
// ============================================

// 获取施工进度看板
router.get('/construction/dashboard', (req, res) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    const dashboard = db.prepare(`
      SELECT * FROM progress_monitors
      WHERE project_id = ? AND type = 'construction'
    `).get(project_id);
    
    if (!dashboard) {
      return res.json({
        success: true,
        data: {
          project_id,
          type: 'construction',
          total_items: 0,
          completed_items: 0,
          remaining_items: 0,
          progress_percent: 0
        }
      });
    }
    
    // 获取里程碑详情
    const milestones = db.prepare(`
      SELECT * FROM project_milestones
      WHERE project_id = ?
      ORDER BY planned_start_date
    `).all(project_id);
    
    res.json({
      success: true,
      data: {
        ...dashboard,
        milestones
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 更新施工进度
router.put('/construction/progress', (req, res) => {
  try {
    const { project_id, milestone_id, progress_percent, actual_start_date, actual_end_date, status } = req.body;
    
    // 更新里程碑进度
    db.prepare(`
      UPDATE project_milestones
      SET progress_percent = ?, actual_start_date = ?, actual_end_date = ?, status = ?, updated_at = DATETIME('now')
      WHERE id = ?
    `).run(progress_percent, actual_start_date, actual_end_date, status, milestone_id);
    
    // 重新计算整体进度
    updateConstructionProgress(project_id);
    
    // 检查是否需要进度纠偏提醒
    checkProgressWarning(project_id, milestone_id);
    
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
// 进度纠偏提醒
// ============================================

function checkProgressWarning(project_id, milestone_id) {
  const milestone = db.prepare('SELECT * FROM project_milestones WHERE id = ?').get(milestone_id);
  
  if (!milestone) return;
  
  // 检查是否落后于计划
  const today = new Date();
  const plannedEnd = new Date(milestone.planned_end_date);
  
  if (today > plannedEnd && milestone.progress_percent < 100) {
    // 发送提醒
    db.prepare(`
      INSERT INTO system_notifications (user_id, title, content, type)
      SELECT id, '进度预警', '项目[' || (SELECT name FROM projects WHERE id = ?) || ']里程碑[' || ? || ']进度落后，请及时处理', 'warning'
      FROM users WHERE role_id IN (SELECT id FROM roles WHERE name IN ('项目经理', '总经理'))
    `).run(project_id, milestone.milestone_name);
  }
}

// ============================================
// 与对账单弱相关校验
// ============================================

router.post('/validate/statement', (req, res) => {
  try {
    const { project_id, statement_value_ratio } = req.body;
    
    // 获取施工进度
    const progress = db.prepare(`
      SELECT progress_percent FROM progress_monitors
      WHERE project_id = ? AND type = 'construction'
    `).get(project_id);
    
    if (!progress) {
      return res.json({ success: true, valid: true });
    }
    
    // 产值占比 < 施工进度时预警
    if (statement_value_ratio < progress.progress_percent) {
      return res.json({
        success: true,
        valid: true,
        warning: '产值占比低于施工进度，建议检查'
      });
    }
    
    res.json({
      success: true,
      valid: true
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '校验失败' });
  }
});

// ============================================
// 与劳务提报强相关校验
// ============================================

router.post('/validate/labor', (req, res) => {
  try {
    const { project_id, labor_value_ratio } = req.body;
    
    // 获取施工进度
    const progress = db.prepare(`
      SELECT progress_percent FROM progress_monitors
      WHERE project_id = ? AND type = 'construction'
    `).get(project_id);
    
    if (!progress) {
      return res.json({ success: true, valid: true });
    }
    
    // 申请产值 > 施工进度时不通过
    if (labor_value_ratio > progress.progress_percent) {
      return res.json({
        success: false,
        valid: false,
        error: '申请产值高于施工进度，无法提交'
      });
    }
    
    res.json({
      success: true,
      valid: true
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '校验失败' });
  }
});

// ============================================
// 辅助函数
// ============================================

function updateDesignProgress(project_id) {
  const files = db.prepare(`
    SELECT COUNT(*) as count FROM design_qa_files WHERE project_id = ? AND is_final = 1
  `).get(project_id);
  
  db.prepare(`
    UPDATE progress_monitors
    SET completed_items = ?, progress_percent = CASE WHEN total_items > 0 THEN (completed_items / total_items * 100) ELSE 0 END
    WHERE project_id = ? AND type = 'design'
  `).run(files.count, project_id);
}

function updateConstructionProgress(project_id) {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_items,
      SUM(CASE WHEN progress_percent >= 100 THEN 1 ELSE 0 END) as completed_items
    FROM project_milestones
    WHERE project_id = ?
  `).get(project_id);
  
  const remaining_items = stats.total_items - stats.completed_items;
  const progress_percent = stats.total_items > 0 ? (stats.completed_items / stats.total_items * 100).toFixed(2) : 0;
  
  db.prepare(`
    UPDATE progress_monitors
    SET total_items = ?, completed_items = ?, remaining_items = ?, progress_percent = ?
    WHERE project_id = ? AND type = 'construction'
  `).run(stats.total_items, stats.completed_items, remaining_items, progress_percent, project_id);
}

module.exports = router;
