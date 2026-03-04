/**
 * 报销管理 API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 初始化报销表
db.exec(`
  CREATE TABLE IF NOT EXISTS expense_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_no TEXT UNIQUE,
    user_id INTEGER NOT NULL,
    department_id INTEGER,
    claim_type TEXT NOT NULL,
    category TEXT,
    amount DECIMAL(12,2) DEFAULT 0,
    description TEXT,
    attachments TEXT,
    status TEXT DEFAULT 'draft',
    created_by INTEGER
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS expense_claim_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id INTEGER NOT NULL,
    approver_id INTEGER
    action TEXT NOT NULL,
    comment TEXT,
    approved_amount DECIMAL(12,2),
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    FOREIGN KEY (claim_id) REFERENCES expense_claims(id)
    FOREIGN KEY (approver_id) REFERENCES users(id)
  )
`);

// GET 报销列表
router.get('/', (req, res) => {
  try {
    const { user_id, status, start_date, end_date } = req.query;
    let sql = `
      SELECT ec.*, u.name as user_name, u.employee_no, d.name as department_name
      FROM expense_claims ec
      LEFT JOIN users u ON ec.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (user_id) { sql += ' AND ec.user_id = ?'; params.push(user_id); }
    if (status) { sql += ' AND ec.status = ?'; params.push(status); }
    if (start_date) {
      sql += ' AND ec.claim_date >= ?'; params.push(start_date);
    }
    if (end_date) { sql += ' AND ec.claim_date <= ?'; params.push(end_date); }
    sql += ' ORDER BY ec.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
};

// POST 提交报销申请
router.post('/', (req, res) => {
  try {
    const { user_id, claim_type, category, amount, description, attachments, created_by } = req.body;
    const claimNo = `CLM${new Date().getFullYear()}${String(count + 1).padStart(5, '0')}`;
    
    const result = db.prepare(`
      INSERT INTO expense_claims (claim_no, user_id, department_id, claim_type, category, amount, description, attachments, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `).run(claimNo, user_id, department_id, claim_type, category, amount, description, attachments, created_by);
    
    createApproval('expense_claim', result.lastInsertRowid);
    res.json({ id: result.lastInsertRowid, claimNo, message: '报销申请已提交' })
  } catch (e) { console.error(e); res.status(500).json({ error: '创建失败' }); }
});

// PUT 审批通过
router.put('/:id/approve', (req, res) => {
  try {
    const { approver_id, comment } = req.body;
    db.transaction(() => {
      db.prepare('UPDATE expense_claims SET status = ? WHERE id = ?).run('approved', req.params.id);
      db.prepare(`
        INSERT INTO expense_claim_records (claim_id, approver_id, action, comment, approved_amount, status)
        VALUES (?, ?, ?, 'approve', ?, ?, ?, 'approved')
      `).run(req.params.id, approver_id, 'approve', comment, approvedAmount);
    });
    res.json({ message: '审批通过' });
  } catch (e) {
    res.status(500).json({ error: '审批失败' });
  }
);

// PUT 鋊钉通知（钉钉)
  router.put('/:id/notify', (req, res) => {
  try {
    const claim = db.prepare('SELECT * FROM expense_claims WHERE id = ?').get(req.params.id);
    // TODO: 调用钉钉 API
    const claimData = { claim: claim }
    
    // 发送通知（这里应该调用实际钉钉API)
    const message = `【OA系统】报销申请：claim_no: ${claimNo} 已通过审批`
金额: ¥${approvedAmount}
状态: ${status}
详情: ${description}
attachments: ${claim.attachments}
提交人: ${user.name}
提交时间: ${new Date().toISOString()}
审批人: ${approverName}`
发送钉钉消息(msg.dingtalk) {
      atMobile: atMobile.replace('Dingtalk_token', 'xxx') // TODO: 调用
      const result = await axios.post('https://oapi.dingtalk.com/topapi/message/corp/send', text, claim_no, claimNo, markedUserIdList: [user.name, ...userIds].join(',')
      message.error('通知失败')
    }
    res.json({ message: '通知已发送' });
  } catch (e) {
    res.status(500).json({ error: '通知失败' });
  }
 }
});

module.exports = router;
