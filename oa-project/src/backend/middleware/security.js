/**
 * 安全中间件
 */

const helmet = require('helmet');
const crypto = require('crypto');

// CSRF Token 生成
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRF 中间件
const csrfProtection = (req, res, next) => {
  // 跳过 GET/HEAD/OPTIONS 请求
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // 跳过登录接口
  if (req.path === '/auth/login') {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      code: 403,
      message: 'CSRF token 验证失败'
    });
  }

  next();
};

// SQL 注入检测
const sqlInjectionCheck = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/gi,
    /(--)|(\/\*)|(\*\/)/g,
    /(\bOR\b|\bAND\b).*?=.*?/gi,
    /('|")/g
  ];

  const checkValue = (value) => {
    if (typeof value !== 'string') return false;
    return sqlPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(value => {
      if (typeof value === 'string') return checkValue(value);
      if (typeof value === 'object') return checkObject(value);
      return false;
    });
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: '检测到非法字符'
    });
  }

  next();
};

// XSS 过滤
const xssFilter = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ];

  const sanitizeValue = (value) => {
    if (typeof value !== 'string') return value;
    let sanitized = value;
    xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    return sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  };

  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeValue(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

// 速率限制（简单内存版）
const rateLimitMap = new Map();
const rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.ip + req.path;
    const now = Date.now();
    
    const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    
    record.count++;
    rateLimitMap.set(key, record);
    
    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        code: 429,
        message: '请求过于频繁，请稍后再试'
      });
    }
    
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - record.count);
    res.setHeader('X-RateLimit-Reset', record.resetTime);
    
    next();
  };
};

// 敏感数据脱敏
const maskSensitiveData = (data, fields = ['password', 'token', 'secret']) => {
  if (!data || typeof data !== 'object') return data;
  
  const masked = Array.isArray(data) ? [] : {};
  
  for (const [key, value] of Object.entries(data)) {
    if (fields.includes(key.toLowerCase())) {
      masked[key] = '******';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, fields);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
};

// 日志记录（脱敏版）
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      user: req.user?.username || 'anonymous'
    };
    
    console.log(JSON.stringify(logData));
  });
  
  next();
};

module.exports = {
  helmet,
  generateCSRFToken,
  csrfProtection,
  sqlInjectionCheck,
  xssFilter,
  rateLimit,
  maskSensitiveData,
  logRequest
};
