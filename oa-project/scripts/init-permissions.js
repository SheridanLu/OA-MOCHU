/**
 * 初始化权限系统
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/oa.db'));

// 权限定义
const permissions = [
  // 项目管理
  { code: 'project:view', name: '查看项目', module: '项目管理' },
  { code: 'project:create', name: '创建项目', module: '项目管理' },
  { code: 'project:edit', name: '编辑项目', module: '项目管理' },
  { code: 'project:delete', name: '删除项目', module: '项目管理' },
  { code: 'project:approve', name: '审批项目', module: '项目管理' },

  // 合同管理
  { code: 'contract:view', name: '查看合同', module: '合同管理' },
  { code: 'contract:create', name: '创建合同', module: '合同管理' },
  { code: 'contract:edit', name: '编辑合同', module: '合同管理' },
  { code: 'contract:delete', name: '删除合同', module: '合同管理' },
  { code: 'contract:approve', name: '审批合同', module: '合同管理' },

  // 物资管理
  { code: 'material:view', name: '查看物资', module: '物资管理' },
  { code: 'material:purchase', name: '采购物资', module: '物资管理' },
  { code: 'material:in', name: '物资入库', module: '物资管理' },
  { code: 'material:out', name: '物资出库', module: '物资管理' },

  // 施工管理
  { code: 'construction:view', name: '查看施工', module: '施工管理' },
  { code: 'construction:statement', name: '创建对账单', module: '施工管理' },
  { code: 'construction:payment', name: '申请工程款', module: '施工管理' },

  // 人力资源管理
  { code: 'hr:view', name: '查看员工', module: '人力资源' },
  { code: 'hr:create', name: '添加员工', module: '人力资源' },
  { code: 'hr:edit', name: '编辑员工', module: '人力资源' },
  { code: 'hr:salary', name: '薪资管理', module: '人力资源' },
  { code: 'hr:approve', name: '审批人事', module: '人力资源' },

  // 财务管理
  { code: 'finance:view', name: '查看财务', module: '财务管理' },
  { code: 'finance:expense', name: '报销申请', module: '财务管理' },
  { code: 'finance:approve', name: '审批报销', module: '财务管理' },

  // 报表管理
  { code: 'report:view', name: '查看报表', module: '报表管理' },
  { code: 'report:export', name: '导出报表', module: '报表管理' },

  // 系统管理
  { code: 'system:user', name: '用户管理', module: '系统管理' },
  { code: 'system:role', name: '角色管理', module: '系统管理' },
  { code: 'system:config', name: '系统配置', module: '系统管理' },
  { code: 'system:approve', name: '审批流配置', module: '系统管理' }
];

// 角色权限分配
const rolePermissions = {
  '总经理': [
    // 所有权限
    'project:*', 'contract:*', 'material:*', 'construction:*',
    'hr:*', 'finance:*', 'report:*', 'system:*'
  ],
  '项目经理': [
    'project:view', 'project:create', 'project:edit',
    'contract:view', 'contract:create', 'contract:edit',
    'material:view', 'material:purchase',
    'construction:view', 'construction:statement', 'construction:payment',
    'hr:view',
    'report:view', 'report:export'
  ],
  '预算员': [
    'project:view', 'project:create', 'project:edit',
    'contract:view', 'contract:approve',
    'material:view',
    'construction:view', 'construction:statement',
    'report:view', 'report:export'
  ],
  '采购员': [
    'project:view', 'project:create',
    'contract:view', 'contract:create',
    'material:view', 'material:purchase', 'material:in', 'material:out',
    'construction:view',
    'report:view'
  ],
  '资料员': [
    'project:view',
    'contract:view',
    'material:view',
    'construction:view',
    'report:view'
  ],
  '财务人员': [
    'project:view',
    'contract:view', 'contract:approve',
    'material:view',
    'construction:view', 'construction:payment',
    'hr:salary',
    'finance:view', 'finance:expense', 'finance:approve',
    'report:view', 'report:export'
  ],
  '普通员工': [
    'project:view',
    'material:view',
    'finance:expense',
    'report:view'
  ]
};

console.log('开始初始化权限系统...');

// 插入权限
const insertPerm = db.prepare('INSERT INTO permissions (code, name, module) VALUES (?, ?, ?)');
permissions.forEach(perm => {
  try {
    insertPerm.run(perm.code, perm.name, perm.module);
  } catch (e) {
    // 忽略重复
  }
});

console.log(`✅ 已插入 ${permissions.length} 个权限`);

// 获取权限ID映射
const permMap = {};
db.prepare('SELECT id, code FROM permissions').all().forEach(p => {
  permMap[p.code] = p.id;
});

// 获取角色ID映射
const roleMap = {};
db.prepare('SELECT id, name FROM roles').all().forEach(r => {
  roleMap[r.name] = r.id;
});

// 分配角色权限
const insertRolePerm = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');

Object.entries(rolePermissions).forEach(([roleName, perms]) => {
  const roleId = roleMap[roleName];
  if (!roleId) return;

  perms.forEach(permCode => {
    if (permCode.endsWith('*')) {
      // 通配符权限：分配该模块所有权限
      const module = permCode.split(':')[0];
      Object.keys(permMap).forEach(code => {
        if (code.startsWith(module + ':')) {
          try {
            insertRolePerm.run(roleId, permMap[code]);
          } catch (e) {
            // 忽略重复
          }
        }
      });
    } else {
      // 具体权限
      const permId = permMap[permCode];
      if (permId) {
        try {
          insertRolePerm.run(roleId, permId);
        } catch (e) {
          // 忽略重复
        }
      }
    }
  });

  const count = db.prepare('SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ?').get(roleId).count;
  console.log(`✅ ${roleName}: ${count} 个权限`);
});

console.log('\n✅ 权限系统初始化完成！');

db.close();
