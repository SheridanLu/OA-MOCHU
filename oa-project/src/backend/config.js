/**
 * 配置文件
 */

const path = require('path');

module.exports = {
  // JWT 配置
  JWT_SECRET: process.env.JWT_SECRET || 'oa-secret-key-change-in-production',
  JWT_EXPIRES_IN: '7d',
  
  // 数据库配置
  DATABASE_PATH: path.join(__dirname, '../../data/oa.db'),
  
  // 服务器配置
  PORT: process.env.PORT || 3001,
  
  // 前端地址（CORS）
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
};
