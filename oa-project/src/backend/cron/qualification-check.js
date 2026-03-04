/**
 * 定时任务 - 资质预警检查
 * 每天早上9点执行
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data/oa.db'));

function checkQualifications() {
  const today = new Date().toISOString().split('T')[0];
  
  // 查找需要提醒的资质（3个月内到期）
  const toRemind = db.prepare(`
    SELECT q.*, 
      CASE WHEN q.remind_months IS NULL THEN 3 ELSE q.remind_months END as months
    FROM qualifications q
    WHERE q.status = 'valid'
    AND date(q.expire_date) <= date('now', '+' || 
      CASE WHEN q.remind_months IS NULL THEN 3 ELSE q.remind_months END || ' months')
    AND date(q.expire_date) >= date('now')
  `).all();

  // 创建提醒记录
  const insertReminder = db.prepare(`
    INSERT INTO qualification_reminders (qualification_id, remind_date, status)
    VALUES (?, ?, 'pending')
  `);

  let count = 0;
  toRemind.forEach(q => {
    // 检查本月是否已提醒
    const exists = db.prepare(`
      SELECT id FROM qualification_reminders
      WHERE qualification_id = ?
      AND strftime('%Y-%m', remind_date) = strftime('%Y-%m', 'now')
    `).get(q.id);
    
    if (!exists) {
      insertReminder.run(q.id, today);
      count++;
      
      // TODO: 发送钉钉/邮件通知
      console.log(`资质预警: ${q.name} 将于 ${q.expire_date} 到期`);
    }
  });

  console.log(`检查完成: 发现 ${toRemind.length} 项资质需要续期，新增 ${count} 条提醒`);
  
  // TODO: 调用钉钉API发送通知
  // sendDingTalkNotification(toRemind);
  
  db.close();
}

checkQualifications();
