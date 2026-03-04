/**
 * 后端API测试
 */

const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

// 创建测试应用
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // 路由
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/projects', require('../routes/projects'));
  
  return app;
};

describe('健康检查', () => {
  it('应该返回正常状态', async () => {
    const res = await request(createTestApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('用户认证', () => {
  it('应该能够成功登录', async () => {
    const res = await request(createTestApp())
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
  
  it('登录失败应该返回错误', async () => {
    const res = await request(createTestApp())
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'wrong_password'
      });
    
    expect(res.status).toBe(401);
  });
});

describe('项目管理', () => {
  it('应该能够获取项目列表', async () => {
    const res = await request(createTestApp())
      .get('/api/projects');
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
  
  it('应该能够创建虚拟项目', async () => {
    const res = await request(createTestApp())
      .post('/api/projects/virtual')
      .send({
        name: '测试虚拟项目',
        contract_amount: 100,
        virtual_limit: 50,
        contract_type: '采购',
        created_by: 1
      });
    
    expect(res.status).toBe(200);
    expect(res.body.code).toMatch(/^V\d{4}$/);
  });
  
  it('应该能够创建实体项目', async () => {
    const res = await request(createTestApp())
      .post('/api/projects/entity')
      .send({
        name: '测试实体项目',
        contract_amount: 200,
        party_a: '测试甲方',
        contract_type: '施工工程专业',
        created_by: 1
      });
    
    expect(res.status).toBe(200);
    expect(res.body.code).toMatch(/^P\d{10}$/);
  });
});

// 运行测试
console.log('运行测试...');
