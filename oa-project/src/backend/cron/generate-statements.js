/**
 * 定时任务 - 每月25日自动生成对账单
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data/oa.db'));

function generateMonthlyStatements() {
  const today = new Date();
  const day = today.getDate();
  
  // 只在25日执行
  if (day !== 25) {
    console.log('今天不是25日，跳过对账单生成');
    return;
  }

  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const period = `${year}-${String(month).padStart(2, '0')}`;

  // 获取所有活跃的实体项目
  const projects = db.prepare(`
    SELECT id FROM projects WHERE type = 'entity' AND status = 'active'
  `).all();

  // 生成对账单编号
  function genCode() {
    const c = db.prepare(`SELECT COUNT(*) as count FROM statements`).get();
    return `DZ${String(c.count + 1).padStart(5, '0')}`;
  }

  let count = 0;
  projects.forEach(p => {
    // 检查是否已生成
    const exists = db.prepare(`
      SELECT id FROM statements WHERE project_id = ? AND period = ?
    `).get(p.id, period);

    if (!exists) {
      const code = genCode();
      db.prepare(`
        INSERT INTO statements (code, project_id, period, status)
        VALUES (?, ?, ?, 'pending')
      `).run(code, p.id, period);
      count++;
    }
  });

  console.log(`对账单生成完成: ${period}，共生成 ${count} 条`);
  
  db.close();
}

generateMonthlyStatements();
