/**
 * 项目预算管理API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const router = express.Router();
const db = new Database(path.join(__dirname, '../../data/oa.db'));

// 配置文件上传
const upload = multer({ dest: 'uploads/' });

// ============================================
// 项目预算管理
// ============================================

// 获取预算列表
router.get('/', (req, res) => {
  try {
    const { project_id, budget_type } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    let sql = `
      SELECT b.*, u.name as creator_name, p.name as project_name
      FROM project_budgets b
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN projects p ON b.project_id = p.id
      WHERE b.project_id = ?
    `;
    const params = [project_id];
    
    if (budget_type) {
      sql += ' AND b.budget_type = ?';
      params.push(budget_type);
    }
    
    sql += ' ORDER BY b.created_at DESC';
    
    const budgets = db.prepare(sql).all(...params);
    
    res.json({
      success: true,
      data: budgets
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 创建预算（手动）
router.post('/', (req, res) => {
  try {
    const {
      project_id,
      budget_type,
      total_amount,
      items,
      created_by
    } = req.body;
    
    if (!project_id || !budget_type) {
      return res.status(400).json({ success: false, error: '项目和预算类型为必填项' });
    }
    
    const validTypes = ['preliminary', 'bidding', 'final'];
    if (!validTypes.includes(budget_type)) {
      return res.status(400).json({ success: false, error: '无效的预算类型' });
    }
    
    const result = db.prepare(`
      INSERT INTO project_budgets (
        project_id, budget_type, total_amount, items, created_by
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      project_id, budget_type, total_amount, JSON.stringify(items), created_by
    );
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: '预算创建成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

// 导入Excel预算
router.post('/import', upload.single('file'), (req, res) => {
  try {
    const { project_id, budget_type, created_by } = req.body;
    
    if (!project_id || !budget_type || !req.file) {
      return res.status(400).json({ success: false, error: '项目、预算类型和文件为必填项' });
    }
    
    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    // 计算总金额
    let total_amount = 0;
    const items = data.map(row => {
      const amount = parseFloat(row['金额'] || row['amount'] || 0);
      total_amount += amount;
      return {
        name: row['项目名称'] || row['name'],
        quantity: parseFloat(row['数量'] || row['quantity'] || 0),
        unit: row['单位'] || row['unit'],
        unit_price: parseFloat(row['单价'] || row['unit_price'] || 0),
        amount: amount
      };
    });
    
    // 保存预算
    const result = db.prepare(`
      INSERT INTO project_budgets (
        project_id, budget_type, total_amount, excel_file, items, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      project_id, budget_type, total_amount, req.file.path, JSON.stringify(items), created_by
    );
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      total_amount,
      item_count: items.length,
      message: '预算导入成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '导入失败' });
  }
});

// ============================================
// 项目采购清单
// ============================================

// 获取采购清单
router.get('/purchase-list', (req, res) => {
  try {
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ success: false, error: '项目ID必填' });
    }
    
    const items = db.prepare(`
      SELECT * FROM project_purchase_lists
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(project_id);
    
    res.json({
      success: true,
      data: items
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 添加采购项
router.post('/purchase-list', (req, res) => {
  try {
    const {
      project_id,
      material_name,
      specification,
      unit,
      quantity,
      unit_price,
      created_by
    } = req.body;
    
    if (!project_id || !material_name || !quantity) {
      return res.status(400).json({ success: false, error: '项目、材料名称、数量为必填项' });
    }
    
    const total_amount = (quantity * (unit_price || 0)).toFixed(2);
    
    const result = db.prepare(`
      INSERT INTO project_purchase_lists (
        project_id, material_name, specification, unit, quantity, unit_price, total_amount, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project_id, material_name, specification, unit, quantity, unit_price, total_amount, created_by
    );
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: '采购项添加成功'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '添加失败' });
  }
});

// ============================================
// 材料价格信息库
// ============================================

// 获取价格库
router.get('/price-library', (req, res) => {
  try {
    const { keyword } = req.query;
    
    let sql = 'SELECT * FROM material_price_library WHERE 1=1';
    const params = [];
    
    if (keyword) {
      sql += ' AND material_name LIKE ?';
      params.push(`%${keyword}%`);
    }
    
    sql += ' ORDER BY updated_at DESC';
    
    const items = db.prepare(sql).all(...params);
    
    res.json({
      success: true,
      data: items
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 添加/更新价格
router.post('/price-library', (req, res) => {
  try {
    const {
      material_name,
      specification,
      unit,
      latest_price,
      supplier
    } = req.body;
    
    if (!material_name || !latest_price) {
      return res.status(400).json({ success: false, error: '材料名称和价格为必填项' });
    }
    
    // 检查是否存在
    const existing = db.prepare(`
      SELECT * FROM material_price_library 
      WHERE material_name = ? AND specification = ?
    `).get(material_name, specification);
    
    if (existing) {
      // 更新价格
      const baseline_price = Math.min(existing.baseline_price, latest_price);
      
      db.prepare(`
        UPDATE material_price_library
        SET latest_price = ?, baseline_price = ?, supplier = ?, last_purchase_date = DATE('now'), updated_at = DATETIME('now')
        WHERE id = ?
      `).run(latest_price, baseline_price, supplier, existing.id);
      
      res.json({
        success: true,
        message: '价格更新成功',
        baseline_updated: baseline_price !== existing.baseline_price
      });
    } else {
      // 新增
      const result = db.prepare(`
        INSERT INTO material_price_library (
          material_name, specification, unit, baseline_price, latest_price, supplier, last_purchase_date
        ) VALUES (?, ?, ?, ?, ?, ?, DATE('now'))
      `).run(
        material_name, specification, unit, latest_price, latest_price, supplier
      );
      
      res.json({
        success: true,
        id: result.lastInsertRowid,
        message: '价格添加成功'
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// 价格比对
router.post('/compare-price', (req, res) => {
  try {
    const { material_name, specification, current_price } = req.body;
    
    const priceInfo = db.prepare(`
      SELECT * FROM material_price_library 
      WHERE material_name = ? AND specification = ?
    `).get(material_name, specification);
    
    if (!priceInfo) {
      return res.json({
        success: true,
        warning: false,
        message: '价格库中无此材料'
      });
    }
    
    if (current_price > priceInfo.baseline_price) {
      return res.json({
        success: true,
        warning: true,
        message: '当前价格高于基准价，请重新确认',
        baseline_price: priceInfo.baseline_price,
        current_price,
        diff: (current_price - priceInfo.baseline_price).toFixed(2)
      });
    }
    
    res.json({
      success: true,
      warning: false,
      message: '价格正常'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: '比对失败' });
  }
});

module.exports = router;
