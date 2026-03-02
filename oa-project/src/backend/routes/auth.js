/**
 * 认证路由
 * 登录、获取当前用户、修改密码
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const { JWT_SECRET } = require('../config');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

/**
 * 登录
 * POST /api/auth/login
 */
router.post('/login', (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    // 查找用户
    const user = db.prepare(`
      SELECT u.*, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.username = ?
    `).get(username);
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 验证密码
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(403).json({ error: '账号已被停用' });
    }
    
    // 生成 token
    const expiresIn = rememberMe ? '7d' : '24h';
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn }
    );
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = user;
    
    res.json({ token, user: userInfo, expiresIn });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未认证' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare(`
      SELECT u.id, u.username, u.name, u.email, u.phone, u.role, 
             u.avatar, u.annual_leave, u.department_id, u.position, u.created_at,
             d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `).get(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(user);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期' });
    }
    res.status(401).json({ error: '无效的令牌' });
  }
});

/**
 * 修改密码
 * PUT /api/auth/password
 */
router.put('/password', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未认证' });
  }
  
  const token = authHeader.split(' ')[1];
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请提供旧密码和新密码' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    
    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(400).json({ error: '旧密码错误' });
    }
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(hashedPassword, decoded.id);
    
    res.json({ message: '密码修改成功' });
  } catch (err) {
    res.status(401).json({ error: '无效的令牌' });
  }
});

module.exports = router;
