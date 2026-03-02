/**
 * OA 系统后端服务
 * 技术栈: Express + SQLite + JWT
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ============================================
// API 路由
// ============================================

// 认证路由
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 部门路由
const departmentRoutes = require('./routes/departments');
app.use('/api/departments', departmentRoutes);

// 用户路由
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// 项目路由
const projectRoutes = require('./routes/projects');
app.use('/api/projects', projectRoutes);

// 合同路由
const contractRoutes = require('./routes/contracts');
app.use('/api/contracts', contractRoutes);

// 仪表盘路由
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// ============================================
// 健康检查
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// 404 处理
// ============================================
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// ============================================
// 错误处理
// ============================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// ============================================
// 启动服务器
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 OA 后端服务运行在 http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
});

module.exports = app;
