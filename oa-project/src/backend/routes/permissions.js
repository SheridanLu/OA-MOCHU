/**
 * 权限管理API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));
const { getUserPermissions } = require('../middleware/permission');

// 获取当前用户权限
router.get('/my', (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未授权' });
    }

    const permissions = getUserPermissions(req.user.id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          name: req.user.name
        },
        permissions: permissions
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取权限失败' });
  }
});

// 获取所有角色
router.get('/roles', (req, res) => {
  try {
    const roles = db.prepare(`
      SELECT r.*, COUNT(rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id
      ORDER BY r.id
    `).all();
    
    res.json(roles);
  } catch (e) {
    res.status(500).json({ error: '获取角色失败' });
  }
});

// 获取角色权限
router.get('/roles/:id/permissions', (req, res) => {
  try {
    const permissions = db.prepare(`
      SELECT p.*
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.module, p.code
    `).all(req.params.id);
    
    res.json(permissions);
  } catch (e) {
    res.status(500).json({ error: '获取角色权限失败' });
  }
});

// 获取所有权限
router.get('/all', (req, res) => {
  try {
    const permissions = db.prepare(`
      SELECT * FROM permissions ORDER BY module, code
    `).all();
    
    res.json(permissions);
  } catch (e) {
    res.status(500).json({ error: '获取权限失败' });
  }
});

// 更新角色权限
router.put('/roles/:id/permissions', (req, res) => {
  try {
    const { permissionIds } = req.body;
    const roleId = req.params.id;

    db.transaction(() => {
      // 删除旧权限
      db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);
      
      // 插入新权限
      const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
      permissionIds.forEach(permId => {
        stmt.run(roleId, permId);
      });
    })();

    res.json({ success: true, message: '权限更新成功' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '更新权限失败' });
  }
});

module.exports = router;
