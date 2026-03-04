/**
 * OA 系统后端入口 - 终版
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/statements', require('./routes/construction'));
app.use('/api/payments', require('./routes/construction'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/changes', require('./routes/changes'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/hr', require('./routes/hr'));
app.use('/api/salary', require('./routes/salary'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/completion', require('./routes/completion'));

// 健康检查
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: '接口不存在' }));

// 错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器错误' });
});

app.listen(PORT, () => console.log(`🚀 后端: http://localhost:${PORT}`));

module.exports = app;
