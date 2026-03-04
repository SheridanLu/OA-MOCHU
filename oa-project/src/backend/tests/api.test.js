/**
 * 后端API测试（简化版）
 */

const request = require('supertest');

// 测试真实的后端服务
const API_BASE = 'http://localhost:3001/api';

describe('健康检查', () => {
  it('应该返回正常状态', async () => {
    const res = await request(API_BASE).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('用户认证', () => {
  it('应该能够成功登录', async () => {
    const res = await request(API_BASE)
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
  
  it('登录失败应该返回错误', async () => {
    const res = await request(API_BASE)
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'wrong_password'
      });
    
    expect(res.status).toBe(401);
  });
});

describe('项目管理', () => {
  it('应该能够获取项目列表', async () => {
    const res = await request(API_BASE)
      .get('/projects');
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// 运行测试
console.log('运行测试...');
