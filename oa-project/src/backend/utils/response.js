/**
 * API工具函数 - 统一响应格式
 */

// 成功响应
const success = (data = null, message = '操作成功') => ({
  success: true,
  code: 200,
  message,
  data,
  timestamp: new Date().toISOString()
});

// 失败响应
const error = (message = '操作失败', code = 400, errors = null) => ({
  success: false,
  code,
  message,
  errors,
  timestamp: new Date().toISOString()
});

// 分页响应
const paginated = (data, total, page, pageSize) => ({
  success: true,
  code: 200,
  data: {
    list: data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  },
  timestamp: new Date().toISOString()
});

// 参数验证错误
const validationError = (errors) => ({
  success: false,
  code: 422,
  message: '参数验证失败',
  errors,
  timestamp: new Date().toISOString()
});

// 未授权
const unauthorized = (message = '未授权访问') => ({
  success: false,
  code: 401,
  message,
  timestamp: new Date().toISOString()
});

// 禁止访问
const forbidden = (message = '禁止访问') => ({
  success: false,
  code: 403,
  message,
  timestamp: new Date().toISOString()
});

// 资源不存在
const notFound = (message = '资源不存在') => ({
  success: false,
  code: 404,
  message,
  timestamp: new Date().toISOString()
});

// 服务器错误
const serverError = (message = '服务器内部错误') => ({
  success: false,
  code: 500,
  message,
  timestamp: new Date().toISOString()
});

module.exports = {
  success,
  error,
  paginated,
  validationError,
  unauthorized,
  forbidden,
  notFound,
  serverError
};
