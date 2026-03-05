/**
 * 权限检查中间件
 */

const Database = require('better-sqlite3');
const path = require('path');

const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    // 检查用户是否登录
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: '未授权访问'
      });
    }

    // 超级管理员拥有所有权限
    if (req.user.role_id === 1 || req.user.username === 'admin') {
      return next();
    }

    // 查询用户权限
    const db = new Database(path.join(__dirname, '../../../data/oa.db'));
    
    const hasPermission = db.prepare(`
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.id = ? AND p.code = ?
    `).get(req.user.id, requiredPermission);

    db.close();

    if (!hasPermission || hasPermission.count === 0) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: '权限不足，无法执行此操作'
      });
    }

    next();
  };
};

// 检查多个权限（满足任一即可）
const checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: '未授权访问'
      });
    }

    if (req.user.role_id === 1 || req.user.username === 'admin') {
      return next();
    }

    const db = new Database(path.join(__dirname, '../../../data/oa.db'));
    
    const placeholders = permissions.map(() => '?').join(',');
    const hasPermission = db.prepare(`
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.id = ? AND p.code IN (${placeholders})
    `).get(req.user.id, ...permissions);

    db.close();

    if (!hasPermission || hasPermission.count === 0) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: '权限不足，无法执行此操作'
      });
    }

    next();
  };
};

// 获取用户权限列表
const getUserPermissions = (userId) => {
  const db = new Database(path.join(__dirname, '../../../data/oa.db'));
  
  const permissions = db.prepare(`
    SELECT DISTINCT p.code, p.name, p.module
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN users u ON u.role_id = rp.role_id
    WHERE u.id = ?
    ORDER BY p.module, p.code
  `).all(userId);

  db.close();
  return permissions;
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  getUserPermissions
};
