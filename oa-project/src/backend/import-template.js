/**
 * 导入合同模板数据
 * 从 Excel 文件导入虚拟合同模板
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data/oa.db'));

// 虚拟合同模板字段
const TEMPLATE_FIELDS = [
  { key: 'name', label: '虚拟合同名称', required: true },
  { key: 'location', label: '合同地点', required: false },
  { key: 'amount', label: '合同含税金额（万元）', required: true },
  { key: 'party_a', label: '甲方单位名称', required: true },
  { key: 'contract_type', label: '合同类型', required: true, options: ['采购', '施工工程专业', '劳务', '技术服务', '其他'] },
  { key: 'project_limit', label: '拟投入项目金额限额', required: false }
];

// 创建默认模板
function createDefaultTemplate() {
  const existing = db.prepare("SELECT id FROM contract_templates WHERE type = 'expense' AND name = '虚拟合同模板'").get();
  
  if (!existing) {
    db.prepare(`
      INSERT INTO contract_templates (name, type, fields, status)
      VALUES (?, ?, ?, 'active')
    `).run('虚拟合同模板', 'expense', JSON.stringify(TEMPLATE_FIELDS));
    
    console.log('✅ 虚拟合同模板已创建');
  } else {
    console.log('ℹ️ 虚拟合同模板已存在');
  }
}

createDefaultTemplate();

db.close();
console.log('模板导入完成');
