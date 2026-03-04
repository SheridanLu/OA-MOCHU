/**
 * 资质预警与知识库 API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// ==================== 资质证书管理 ====================

// GET 资质列表
router.get('/qualifications', (req, res) => {
  try {
    const { type, status } = req.query;
    let sql = 'SELECT * FROM qualifications WHERE 1=1';
    const params = [];
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY expire_date ASC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// POST 添加资质
router.post('/qualifications', (req, res) => {
  try {
    const { type, name, cert_no, owner_type, owner_id, owner_name, issue_date, expire_date, remind_months, attachments } = req.body;
    const result = db.prepare(`
      INSERT INTO qualifications (type, name, cert_no, owner_type, owner_id, owner_name, issue_date, expire_date, remind_months, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(type, name, cert_no, owner_type, owner_id, owner_name, issue_date, expire_date, remind_months || 3, attachments);
    res.json({ id: result.lastInsertRowid, message: '添加成功' });
  } catch (e) {
    res.status(500).json({ error: '添加失败' });
  }
});

// GET 即将到期的资质（预警）
router.get('/qualifications/expiring', (req, res) => {
  try {
    // 查询3个月内到期的资质
    const list = db.prepare(`
      SELECT * FROM qualifications
      WHERE status = 'valid'
      AND date(expire_date) <= date('now', '+3 months')
      AND date(expire_date) >= date('now')
      ORDER BY expire_date ASC
    `).all();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// PUT 标记已续期
router.put('/qualifications/:id/renew', (req, res) => {
  try {
    const { new_expire_date, new_cert_no } = req.body;
    db.prepare('UPDATE qualifications SET expire_date = ?, cert_no = ?, status = ? WHERE id = ?')
      .run(new_expire_date, new_cert_no, 'valid', req.params.id);
    res.json({ message: '续期成功' });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

// ==================== 资质提醒（定时任务调用）====================

// GET/POST 执行资质检查（可被cron调用）
router.post('/qualifications/check', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 查找需要提醒的资质
    const toRemind = db.prepare(`
      SELECT q.*, q.remind_months,
        CASE WHEN q.remind_months IS NULL THEN 3 ELSE q.remind_months END as months
      FROM qualifications q
      WHERE q.status = 'valid'
      AND date(q.expire_date) <= date('now', '+' || (CASE WHEN q.remind_months IS NULL THEN 3 ELSE q.remind_months END) || ' months')
      AND date(q.expire_date) >= date('now')
    `).all();
    
    // 创建提醒记录
    const insertReminder = db.prepare(`
      INSERT INTO qualification_reminders (qualification_id, remind_date, status)
      VALUES (?, ?, 'pending')
    `);
    
    toRemind.forEach(q => {
      // 检查本月是否已提醒
      const exists = db.prepare(`
        SELECT id FROM qualification_reminders
        WHERE qualification_id = ?
        AND strftime('%Y-%m', remind_date) = strftime('%Y-%m', 'now')
      `).get(q.id);
      
      if (!exists) {
        insertReminder.run(q.id, today);
      }
    });
    
    res.json({ 
      checked: toRemind.length,
      message: `发现 ${toRemind.length} 项资质需要续期` 
    });
  } catch (e) {
    res.status(500).json({ error: '检查失败' });
  }
});

// GET 待处理提醒
router.get('/qualifications/reminders', (req, res) => {
  try {
    res.json(db.prepare(`
      SELECT qr.*, q.name, q.cert_no, q.expire_date, q.owner_name, q.owner_type
      FROM qualification_reminders qr
      JOIN qualifications q ON qr.qualification_id = q.id
      WHERE qr.status = 'pending'
      ORDER BY q.expire_date ASC
    `).all());
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// PUT 处理提醒
router.put('/qualifications/reminders/:id', (req, res) => {
  try {
    const { handler_id, status } = req.body;
    db.prepare('UPDATE qualification_reminders SET handler_id = ?, status = ? WHERE id = ?')
      .run(handler_id, status || 'handled', req.params.id);
    res.json({ message: '处理成功' });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

// ==================== 知识库管理 ====================

// GET 知识库列表
router.get('/knowledge', (req, res) => {
  try {
    const { category } = req.query;
    let sql = `
      SELECT kb.*, u.name as uploader_name
      FROM knowledge_base kb
      LEFT JOIN users u ON kb.uploader_id = u.id
      WHERE kb.status = 'active'
    `;
    const params = [];
    if (category) { sql += ' AND kb.category = ?'; params.push(category); }
    sql += ' ORDER BY kb.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// POST 上传知识文档
router.post('/knowledge', (req, res) => {
  try {
    const { title, content, category, uploader_id, attachments, view_permissions } = req.body;
    const result = db.prepare(`
      INSERT INTO knowledge_base (title, content, category, uploader_id, attachments, view_permissions)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, content, category, uploader_id, attachments, view_permissions);
    res.json({ id: result.lastInsertRowid, message: '上传成功' });
  } catch (e) {
    res.status(500).json({ error: '上传失败' });
  }
});

// PUT 更新查看权限
router.put('/knowledge/:id/permissions', (req, res) => {
  try {
    const { view_permissions } = req.body;
    db.prepare('UPDATE knowledge_base SET view_permissions = ? WHERE id = ?').run(view_permissions, req.params.id);
    res.json({ message: '权限更新成功' });
  } catch (e) {
    res.status(500).json({ error: '更新失败' });
  }
});

// DELETE 删除文档
router.delete('/knowledge/:id', (req, res) => {
  try {
    db.prepare('UPDATE knowledge_base SET status = ? WHERE id = ?').run('deleted', req.params.id);
    res.json({ message: '删除成功' });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
