/**
 * 社保管理 API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 初始化社保表
db.exec(`
  CREATE TABLE IF NOT EXISTS social_insurance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    pension_base DECIMAL(10,2) DEFAULT 0,
    pension_personal DECIMAL(10,2) DEFAULT 0,
    pension_company DECIMAL(10,2) DEFAULT 0,
    medical_base DECIMAL(10,2) DEFAULT 0,
    medical_personal DECIMAL(10,2) DEFAULT 0,
    medical_company DECIMAL(10,2) DEFAULT 0,
    unemployment_base DECIMAL(10,2) DEFAULT 0,
    unemployment_personal DECIMAL(10,2) DEFAULT 0,
    unemployment_company DECIMAL(10,2) DEFAULT 0,
    injury_base DECIMAL(10,2) DEFAULT 0,
    injury_company DECIMAL(10,2) DEFAULT 0,
    maternity_base DECIMAL(10,2) DEFAULT 0,
    maternity_company DECIMAL(10,2) DEFAULT 0,
    housing_fund_base DECIMAL(10,2) DEFAULT 0,
    housing_fund_personal DECIMAL(10,2) DEFAULT 0,
    housing_fund_company DECIMAL(10,2) DEFAULT 0,
    total_personal DECIMAL(10,2) DEFAULT 0,
    total_company DECIMAL(10,2) DEFAULT 0,
    effective_date DATE,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// 默认社保比例配置
const DEFAULT_RATES = {
  pension_personal: 0.08,
  pension_company: 0.16,
  medical_personal: 0.02,
  medical_company: 0.098,
  unemployment_personal: 0.002,
  unemployment_company: 0.005,
  injury_company: 0.002,
  maternity_company: 0.001,
  housing_fund_personal: 0.12,
  housing_fund_company: 0.12
};

// GET 社保列表
router.get('/', (req, res) => {
  try {
    const { department_id, status } = req.query;
    let sql = `
      SELECT si.*, u.name as user_name, u.employee_no, d.name as department_name
      FROM social_insurance si
      JOIN users u ON si.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (department_id) { sql += ' AND u.department_id = ?'; params.push(department_id); }
    if (status) { sql += ' AND si.status = ?'; params.push(status); }
    sql += ' ORDER BY u.department_id, u.id';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// GET 单人社保详情
router.get('/user/:userId', (req, res) => {
  try {
    const record = db.prepare(`
      SELECT si.*, u.name as user_name, u.employee_no
      FROM social_insurance si
      JOIN users u ON si.user_id = u.id
      WHERE si.user_id = ?
    `).get(req.params.userId);
    if (!record) return res.status(404).json({ error: '记录不存在' });
    res.json(record);
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// POST 创建/更新社保记录
router.post('/', (req, res) => {
  try {
    const {
      user_id, pension_base, medical_base, unemployment_base, injury_base, maternity_base, housing_fund_base
    } = req.body;

    // 计算各项金额
    const pension_personal = pension_base * DEFAULT_RATES.pension_personal;
    const pension_company = pension_base * DEFAULT_RATES.pension_company;
    const medical_personal = medical_base * DEFAULT_RATES.medical_personal;
    const medical_company = medical_base * DEFAULT_RATES.medical_company;
    const unemployment_personal = unemployment_base * DEFAULT_RATES.unemployment_personal;
    const unemployment_company = unemployment_base * DEFAULT_RATES.unemployment_company;
    const injury_company = injury_base * DEFAULT_RATES.injury_company;
    const maternity_company = maternity_base * DEFAULT_RATES.maternity_company;
    const housing_fund_personal = housing_fund_base * DEFAULT_RATES.housing_fund_personal;
    const housing_fund_company = housing_fund_base * DEFAULT_RATES.housing_fund_company;

    const total_personal = pension_personal + medical_personal + unemployment_personal + housing_fund_personal;
    const total_company = pension_company + medical_company + unemployment_company + injury_company + maternity_company + housing_fund_company;

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM social_insurance WHERE user_id = ?').get(user_id);

    if (existing) {
      db.prepare(`
        UPDATE social_insurance SET
          pension_base = ?, pension_personal = ?, pension_company = ?,
          medical_base = ?, medical_personal = ?, medical_company = ?,
          unemployment_base = ?, unemployment_personal = ?, unemployment_company = ?,
          injury_base = ?, injury_company = ?,
          maternity_base = ?, maternity_company = ?,
          housing_fund_base = ?, housing_fund_personal = ?, housing_fund_company = ?,
          total_personal = ?, total_company = ?, updated_at = DATETIME('now')
        WHERE user_id = ?
      `).run(pension_base, pension_personal, pension_company,
        medical_base, medical_personal, medical_company,
        unemployment_base, unemployment_personal, unemployment_company,
        injury_base, injury_company,
        maternity_base, maternity_company,
        housing_fund_base, housing_fund_personal, housing_fund_company,
        total_personal, total_company, user_id);
      res.json({ message: '更新成功' });
    } else {
      db.prepare(`
        INSERT INTO social_insurance (
          user_id, pension_base, pension_personal, pension_company,
          medical_base, medical_personal, medical_company,
          unemployment_base, unemployment_personal, unemployment_company,
          injury_base, injury_company,
          maternity_base, maternity_company,
          housing_fund_base, housing_fund_personal, housing_fund_company,
          total_personal, total_company, effective_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
      `).run(user_id, pension_base, pension_personal, pension_company,
        medical_base, medical_personal, medical_company,
        unemployment_base, unemployment_personal, unemployment_company,
        injury_base, injury_company,
        maternity_base, maternity_company,
        housing_fund_base, housing_fund_personal, housing_fund_company,
        total_personal, total_company);
      res.json({ message: '创建成功' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '操作失败' });
  }
});

// GET 社保统计
router.get('/summary', (req, res) => {
  try {
    const { year, month } = req.query;
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_count,
        SUM(total_personal) as total_personal,
        SUM(total_company) as total_company,
        SUM(total_personal + total_company) as grand_total
      FROM social_insurance
      WHERE status = 'active'
    `).get();
    res.json(summary);
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

module.exports = router;
