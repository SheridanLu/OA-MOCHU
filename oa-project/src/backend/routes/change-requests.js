/**
 * 变更签证管理API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const router = express.Router();
const db = new Database(path.join(__dirname, '../../data/oa.db'));

// 生成变更编号
function generateChangeNo(type) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const typeCode = {
    'over_purchase': 'OP',
    'new_material': 'NM',
    'site_visa': 'SV',
    'design_change': 'DC'
  }[type] || 'CH';
  
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM change_requests
    WHERE type = ? AND strftime('%Y%m', created_at) = ?
  `).get(type, `${year}${month}`).count;
  
  return `${typeCode}${year}${month}${String(count + 1).padStart(4, '0')}`;
}

// ============================================
// 获取列表
// ============================================
router.get('/', (req, res) => {
  try {
    const { project_id, type, status, keyword } = req.query;
    
    let sql = `
      SELECT c.*,
        p.code as project_code, p.name as project_name,
        u.name as creator_name
      FROM change_requests c
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (project_id) {
      sql += ' AND c.project_id = ?';
      params.push(project_id);
    }
    
    if (type) {
      sql += ' AND c.type = ?';
      params.push(type);
    }
    
    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }
    
    if (keyword) {
      sql += ' AND (p.name LIKE ? OR p.code LIKE ? OR c.code LIKE ? OR c.reason LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }
    
    sql += ' ORDER BY c.created_at DESC';
    
    const data = db.prepare(sql).all(...params);
    
    // 添加类型说明
    const typeMap = {
      'over_purchase': '超量采购',
      'new_material': '新增设备/材料',
      'site_visa': '现场签证',
      'design_change': '设计变更'
    };
    
    data.forEach(item => {
      item.type_name = typeMap[item.type] || item.type;
    });
    
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
    const change = db.prepare(`
      SELECT c.*,
        p.code as project_code, p.name as project_name,
        u.name as creator_name
      FROM change_requests c
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `).get(req.params.id);
    
    if (!change) {
      return res.status(404).json({ success: false, error: '变更记录不存在' });
    }
    
    // 添加类型说明
    const typeMap = {
      'over_purchase': '超量采购',
      'new_material': '新增设备/材料',
      'site_visa': '现场签证',
      'design_change': '设计变更'
    };
    change.type_name = typeMap[change.type] || change.type;
    
    res.json({
      success: true,
      data: change
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// ============================================
// 创建变更申请
// ============================================
router.post('/', (req, res) => {
  try {
    const {
      project_id,
      type,              // over_purchase/new_material/site_visa/design_change
      reason,
      amount,
      attachments,       // JSON数组
      created_by
    } = req.body;
    
    // 验证必填字段
    if (!project_id || !type || !reason) {
      return res.status(400).json({
        success: false,
        error: '项目、类型、原因为必填项'
      });
    }
    
    // 验证类型
    const validTypes = ['over_purchase', 'new_material', 'site_visa', 'design_change'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: '无效的变更类型'
      });
    }
    
    // 验证项目状态
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
    if (!project) {
      return res.status(400).json({ success: false, error: '项目不存在' });
    }
    
    if (project.status !== 'approved') {
      return res.status(400).json({ success: false, error: '项目未开工，无法申请变更' });
    }
    
    // 生成变更编号
    const code = generateChangeNo(type);
    
    // 插入数据
    const result = db.prepare(`
      INSERT INTO change_requests (
        code, project_id, type, reason, amount, attachments, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      code, project_id, type, reason, amount || 0, JSON.stringify(attachments), created_by
    );
    
    // 创建审批记录
    const approvalFlow = db.prepare(`
      SELECT id FROM approval_flows 
      WHERE business_type = 'change_request' AND status = 'active'
    `).get();
    
    if (approvalFlow) {
      db.prepare(`
        INSERT INTO approvals (flow_id, business_type, business_id, applicant_id, status)
        VALUES (?, 'change_request', ?, ?, 'pending')
      `).run(approvalFlow.id, result.lastInsertRowid, created_by);
    }
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      code,
      message: '变更申请创建成功，等待审批'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

// ============================================
// 更新变更申请
// ============================================
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      reason,
      amount,
      attachments
    } = req.body;
    
    const change = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(id);
    if (!change) {
      return res.status(404).json({ success: false, error: '变更记录不存在' });
    }
    
    if (change.status !== 'pending') {
      return res.status(400).json({ success: false, error: '只能修改待审批的申请' });
    }
    
    db.prepare(`
      UPDATE change_requests
      SET reason = ?, amount = ?, attachments = ?
      WHERE id = ?
    `).run(reason, amount || 0, JSON.stringify(attachments), id);
    
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
// 删除变更申请
// ============================================
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const change = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(id);
    if (!change) {
      return res.status(404).json({ success: false, error: '变更记录不存在' });
    }
    
    if (change.status !== 'pending') {
      return res.status(400).json({ success: false, error: '只能删除待审批的申请' });
    }
    
    // 删除审批记录
    db.prepare('DELETE FROM approvals WHERE business_type = ? AND business_id = ?')
      .run('change_request', id);
    
    // 删除变更记录
    db.prepare('DELETE FROM change_requests WHERE id = ?').run(id);
    
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
// 按类型统计
// ============================================
router.get('/statistics/by-type', (req, res) => {
  try {
    const { project_id } = req.query;
    
    let sql = `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count
      FROM change_requests
      WHERE 1=1
    `;
    const params = [];
    
    if (project_id) {
      sql += ' AND project_id = ?';
      params.push(project_id);
    }
    
    sql += ' GROUP BY type';
    
    const stats = db.prepare(sql).all(...params);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '统计失败' });
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
        COUNT(*) as total_changes,
        SUM(amount) as total_amount,
        SUM(CASE WHEN type = 'over_purchase' THEN 1 ELSE 0 END) as over_purchase_count,
        SUM(CASE WHEN type = 'new_material' THEN 1 ELSE 0 END) as new_material_count,
        SUM(CASE WHEN type = 'site_visa' THEN 1 ELSE 0 END) as site_visa_count,
        SUM(CASE WHEN type = 'design_change' THEN 1 ELSE 0 END) as design_change_count
      FROM change_requests
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
