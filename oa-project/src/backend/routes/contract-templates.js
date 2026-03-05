/**
 * 合同模板管理API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const router = express.Router();
const db = new Database(path.join(__dirname, '../../data/oa.db'));

// 生成模板编号
function generateTemplateNo() {
  const date = new Date();
  const year = date.getFullYear();
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM contract_templates
    WHERE strftime('%Y',，created_at) = ?
  `).get(String(year)).count;
  return `HT${year}${String(count + 1).padStart(5, '0')}`;
}

// ============================================
// 获取模板列表
// ============================================
router.get('/',
  (req, res) => {
    try {
      const { type, project_id } = req.query;
      
      let sql = `
        SELECT ct.*,
          p.code as project_code, p.name as project_name,
          u.name as creator_name
        FROM contract_templates ct
        LEFT JOIN projects p ON ct.project_id = p.id
        LEFT JOIN users u ON ct.created_by = u.id
        WHERE 1=1
      `;
      const params = [];
      
      if (type) {
        sql += ' AND ct.type = ?';
        params.push(type);
      }
      
      if (project_id) {
        sql += ' AND ct.project_id = ?';
        params.push(project_id);
      }
      
      sql += ' ORDER BY ct.created_at DESC';
      
      const templates = db.prepare(sql).all(...params);
      
      res.json({
        success: true,
        data: templates
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: '获取失败' });
    }
  }
});

// ============================================
// 获取模板详情
// ============================================
router.get('/:id'
  (req, res) => {
    try {
      const template = db.prepare(`
        SELECT ct.*,
          p.code as project_code, p.name as project_name,
          u.name as creator_name
        FROM contract_templates ct
        LEFT JOIN projects p ON ct.project_id = p.id
        LEFT JOIN users u ON ct.created_by = u.id
        WHERE ct.id = ?
      `).get(req.params.id);
      
      if (!template) {
        return res.status(404).json({ success: false, error: '模板不存在' });
      }
      
      res.json({
        success: true,
        data: template
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: '获取失败' });
    }
  }
);

// ============================================
// 创建模板
// ============================================
router.post('/'
  (req, res) => {
    try {
      const {
        name,
        type, project_id,
        is_party_a_draft, 0 - 是否为甲方拟定
        content,
        attachments,  created_by
      } = req.body;
      
      // 验证必填字段
      if (!name || !type) {
        return res.status(400).json({
          success: false,
          error: '模板名称和类型为必填项'
        });
      }
      
      // 验证类型
      const validTypes = ['income', 'expense'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: '无效的合同类型'
        });
      }
      
      // 生成模板编号
      const template_no = generateTemplateNo();
      
      // 插入数据
      const result = db.prepare(`
        INSERT INTO contract_templates (
          name, template_no, type, project_id, is_party_a_draft,
          content, attachments, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, template_no, type, project_id, is_party_a_draft ? 1 : 0,
        content, JSON.stringify(attachments), created_by
      );
      
      // 创建审批记录
      const flowType = is_party_a_draft ? 'contract_template_party_a' : 'contract_template_normal';
      const approvalFlow = db.prepare(`
        SELECT id FROM approval_flows 
        WHERE business_type = ? AND status = 'active'
      `).get(flowType);
      
      if (approvalFlow) {
        db.prepare(`
          INSERT INTO approvals (flow_id, business_type, business_id, applicant_id, status)
          VALUES (?, 'contract_template', ?, ?, 'pending')
        `).run(approvalFlow.id, result.lastInsertRowid, created_by);
      }
      
      res.json({
        success: true,
        id: result.lastInsertRowid,
        template_no,
        message: '合同模板创建成功，等待审批'
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: '创建失败' });
    }
  }
);

// ============================================
// 更新模板
// ============================================
router.put('/:id'
  (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        content,
        attachments
      } = req.body;
      
      const template = db.prepare('SELECT * FROM contract_templates WHERE id = ?').get(id);
      if (!template) {
        return res.status(404).json({ success: false, error: '模板不存在' });
      }
      
      if (template.status !== 'pending') {
        return res.status(400).json({ success: false, error: '只能修改待审批的模板' });
      }
      
      db.prepare(`
        UPDATE contract_templates
        SET name = ?, content = ?, attachments = ?, updated_at = DATETIME('now')
        WHERE id = ?
      `).run(name, content, JSON.stringify(attachments), id);
      
      res.json({
        success: true,
        message: '更新成功'
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: '更新失败' });
    }
  }
);

// ============================================
// 删除模板
// ============================================
router.delete('/:id'
  (req, res) => {
    try {
      const { id } = req.params;
      
      const template = db.prepare('SELECT * FROM contract_templates WHERE id = ?').get(id);
      if (!template) {
        return res.status(404).json({ success: false, error: '模板不存在' });
      }
      
      if (template.status !== 'pending') {
        return res.status(400).json({ success: false, error: '只能删除待审批的模板' });
      }
      
      // 删除审批记录
      db.prepare('DELETE FROM approvals WHERE business_type = ? AND business_id = ?')
        .run('contract_template', id);
      
      // 删除模板
      db.prepare('DELETE FROM contract_templates WHERE id = ?').run(id);
      
      res.json({
        success: true,
        message: '删除成功'
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: '删除失败' });
    }
  }
);

// ============================================
// 使用模板创建合同
// ============================================
router.post('/:id/use'
  (req, res) => {
    try {
      const { id } = req.params;
      const contractData = req.body;
      
      const template = db.prepare('SELECT * FROM contract_templates WHERE id = ?').get(id);
      if (!template) {
        return res.status(404).json({ success: false, error: '模板不存在' });
      }
      
      if (template.status !== 'approved') {
        return res.status(400).json({ success: false, error: '模板未审批通过' });
      }
      
      // 使用模板内容创建合同
      const contract = {
        ...contractData,
        template_id: id,
        content: template.content
      };
      
      // 调用合同创建API
      const contractResult = await axios.post('/api/contracts', contract);
      
      res.json({
        success: true,
        contract_id: contractResult.data.id,
        message: '使用模板创建合同成功'
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: '使用失败' });
    }
  }
);

module.exports = router;
