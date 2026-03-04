/**
 * 资产管理 API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 初始化资产表
db.exec(`
  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    spec TEXT,
    brand TEXT,
    model TEXT,
    serial_no TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(12,2) DEFAULT 0,
    warranty_end DATE,
    department_id INTEGER,
    current_holder_id INTEGER,
    status TEXT DEFAULT 'in_stock',
    location TEXT,
    remarks TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (current_holder_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS asset_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    from_user_id INTEGER,
    to_user_id INTEGER,
    from_department_id INTEGER,
    to_department_id INTEGER,
    transfer_type TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id),
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
  )
`);

// 生成资产编号
function generateCode(type) {
  const prefix = type === 'office' ? 'OA' : 'EA';
  const year = new Date().getFullYear();
  const count = db.prepare(`SELECT COUNT(*) as count FROM assets WHERE type = ?`).get(type);
  return `${prefix}${year}${String(count.count + 1).padStart(4, '0')}`;
}

// GET 资产列表
router.get('/', (req, res) => {
  try {
    const { type, department_id, status, keyword } = req.query;
    let sql = `
      SELECT a.*, d.name as department_name, u.name as holder_name
      FROM assets a
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN users u ON a.current_holder_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (type) { sql += ' AND a.type = ?'; params.push(type); }
    if (department_id) { sql += ' AND a.department_id = ?'; params.push(department_id); }
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    if (keyword) { sql += ' AND (a.name LIKE ? OR a.code LIKE ?)'; const k = `%${keyword}%`; params.push(k, k); }
    sql += ' ORDER BY a.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// POST 创建资产
router.post('/', (req, res) => {
  try {
    const { name, type, category, spec, brand, model, serial_no, purchase_date, purchase_price, warranty_end, department_id, location, remarks, created_by } = req.body;
    const code = generateCode(type);
    const result = db.prepare(`
      INSERT INTO assets (code, name, type, category, spec, brand, model, serial_no, purchase_date, purchase_price, warranty_end, department_id, location, remarks, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code, name, type, category, spec, brand, model, serial_no, purchase_date, purchase_price, warranty_end, department_id, location, remarks, created_by);
    res.json({ id: result.lastInsertRowid, code, message: '资产创建成功' });
  } catch (e) { console.error(e); res.status(500).json({ error: '创建失败' }); }
});

// POST 资产领用
router.post('/:id/claim', (req, res) => {
  try {
    const { to_user_id, to_department_id, reason, created_by } = req.body;
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    if (!asset) return res.status(404).json({ error: '资产不存在' });
    if (asset.status !== 'in_stock') return res.status(400).json({ error: '资产不在库中' });
    
    db.transaction(() => {
      // 更新资产状态
      db.prepare('UPDATE assets SET current_holder_id = ?, department_id = ?, status = ? WHERE id = ?')
        .run(to_user_id, to_department_id, 'in_use', req.params.id);
      
      // 记录移交
      db.prepare(`
        INSERT INTO asset_transfers (asset_id, to_user_id, to_department_id, transfer_type, reason, status, created_by)
        VALUES (?, ?, ?, 'claim', ?, 'completed', ?)
      `).run(req.params.id, to_user_id, to_department_id, reason, created_by);
    })();
    
    res.json({ message: '领用成功' });
  } catch (e) { res.status(500).json({ error: '领用失败' }); }
});

// POST 资产归还
router.post('/:id/return', (req, res) => {
  try {
    const { reason, created_by } = req.body;
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    if (!asset) return res.status(404).json({ error: '资产不存在' });
    
    db.transaction(() => {
      db.prepare('UPDATE assets SET current_holder_id = NULL, status = ? WHERE id = ?').run('in_stock', req.params.id);
      
      db.prepare(`
        INSERT INTO asset_transfers (asset_id, from_user_id, transfer_type, reason, status, created_by)
        VALUES (?, ?, 'return', ?, 'completed', ?)
      `).run(req.params.id, asset.current_holder_id, reason, created_by);
    })();
    
    res.json({ message: '归还成功' });
  } catch (e) { res.status(500).json({ error: '归还失败' }); }
});

// POST 资产移交
router.post('/:id/transfer', (req, res) => {
  try {
    const { to_user_id, to_department_id, reason, created_by } = req.body;
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    if (!asset) return res.status(404).json({ error: '资产不存在' });
    
    db.transaction(() => {
      db.prepare('UPDATE assets SET current_holder_id = ?, department_id = ? WHERE id = ?')
        .run(to_user_id, to_department_id, req.params.id);
      
      db.prepare(`
        INSERT INTO asset_transfers (asset_id, from_user_id, to_user_id, from_department_id, to_department_id, transfer_type, reason, status, created_by)
        VALUES (?, ?, ?, ?, ?, 'transfer', ?, 'completed', ?)
      `).run(req.params.id, asset.current_holder_id, to_user_id, asset.department_id, to_department_id, reason, created_by);
    })();
    
    res.json({ message: '移交成功' });
  } catch (e) { res.status(500).json({ error: '移交失败' }); }
});

// GET 移交记录
router.get('/transfers', (req, res) => {
  try {
    const { asset_id } = req.query;
    let sql = `
      SELECT t.*, a.code as asset_code, a.name as asset_name,
        fu.name as from_user, tu.name as to_user,
        fd.name as from_dept, td.name as to_dept
      FROM asset_transfers t
      LEFT JOIN assets a ON t.asset_id = a.id
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      LEFT JOIN departments fd ON t.from_department_id = fd.id
      LEFT JOIN departments td ON t.to_department_id = td.id
      WHERE 1=1
    `;
    const params = [];
    if (asset_id) { sql += ' AND t.asset_id = ?'; params.push(asset_id); }
    sql += ' ORDER BY t.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

module.exports = router;
