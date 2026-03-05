/**
 * 报表权限校验中间件
 */

const checkReportPermission = (req, res, next) => {
  // 超级管理员拥有所有权限
  if (req.user.role_id === 1 || req.user.username === 'admin') {
    return next();
  }

  // 检查用户是否有报表查看权限
  const db = require('better-sqlite3')(require('path').join(__dirname, '../../data/oa.db'));
  
  const hasPermission = db.prepare(`
    SELECT COUNT(*) as count
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    JOIN users u ON u.role_id = rp.role_id
    WHERE u.id = ? AND p.code = 'report:view'
  `).get(req.user.id);

  db.close();

  if (!hasPermission || hasPermission.count === 0) {
    return res.status(403).json({
      success: false,
      code: 403,
      message: '无权查看报表'
    });
  }

  next();
};

// 检查特定报表的可见性
const checkReportVisibility = (req, res, next) => {
  const reportId = req.params.id;
  
  if (!reportId) {
    return next();
  }

  const db = require('better-sqlite3')(require('path').join(__dirname, '../../data/oa.db'));
  
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
  db.close();

  if (!report) {
    return res.status(404).json({
      success: false,
      message: '报表不存在'
    });
  }

  // 超级管理员可以查看所有报表
  if (req.user.role_id === 1 || req.user.username === 'admin') {
    return next();
  }

  // 解析可见人列表
  let visibleTo = [];
  try {
    visibleTo = JSON.parse(report.visible_to || '[]');
  } catch (e) {
    visibleTo = [];
  }

  // 检查用户是否在可见人列表中
  if (visibleTo.length > 0 && !visibleTo.includes(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: '无权查看此报表'
    });
  }

  next();
};

module.exports = {
  checkReportPermission,
  checkReportVisibility
};
