/**
 * OA 系统后端入口 - 终版（含资产、报销、社保、安全加固）
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { 
  helmet, 
  sqlInjectionCheck, 
  xssFilter, 
  rateLimit, 
  logRequest 
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全+性能中间件
app.use(compression()); // Gzip压缩
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(sqlInjectionCheck);
app.use(xssFilter);
app.use(rateLimit(100, 60000)); // 100次/分钟
app.use(logRequest);

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
app.use('/api/assets', require('./routes/assets'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/change-requests', require('./routes/change-requests'));
app.use('/api/labor-reports', require('./routes/labor-reports'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/change-requests', require('./routes/change-requests'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/social-insurance', require('./routes/social-insurance'));

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
