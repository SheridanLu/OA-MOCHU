/**
 * 参数验证工具
 */

const validate = {
  // 必填字段
  required: (value, fieldName) => {
    if (value === undefined || value === null || value === '') {
      return { valid: false, message: `${fieldName}不能为空` };
    }
    return { valid: true };
  },

  // 数字范围
  numberRange: (value, min, max, fieldName) => {
    if (value === undefined || value === null) return { valid: true };
    const num = Number(value);
    if (isNaN(num)) {
      return { valid: false, message: `${fieldName}必须是数字` };
    }
    if (min !== undefined && num < min) {
      return { valid: false, message: `${fieldName}不能小于${min}` };
    }
    if (max !== undefined && num > max) {
      return { valid: false, message: `${fieldName}不能大于${max}` };
    }
    return { valid: true };
  },

  // 日期格式
  date: (value, fieldName) => {
    if (!value) return { valid: true };
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { valid: false, message: `${fieldName}日期格式无效` };
    }
    return { valid: true };
  },

  // 枚举值
  enum: (value, allowedValues, fieldName) => {
    if (!value) return { valid: true };
    if (!allowedValues.includes(value)) {
      return { valid: false, message: `${fieldName}必须是: ${allowedValues.join(', ')}` };
    }
    return { valid: true };
  },

  // 手机号
  phone: (value, fieldName) => {
    if (!value) return { valid: true };
    if (!/^1[3-9]\d{9}$/.test(value)) {
      return { valid: false, message: `${fieldName}格式无效` };
    }
    return { valid: true };
  },

  // 邮箱
  email: (value, fieldName) => {
    if (!value) return { valid: true };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { valid: false, message: `${fieldName}格式无效` };
    }
    return { valid: true };
  },

  // 批量验证
  batch: (validations) => {
    for (const v of validations) {
      if (!v.valid) return v;
    }
    return { valid: true };
  }
};

// 验证中间件工厂
const validateMiddleware = (rules) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = req.body[field] || req.query[field] || req.params[field];
      
      for (const rule of fieldRules) {
        let result = { valid: true };
        
        switch (rule.type) {
          case 'required':
            result = validate.required(value, rule.message || field);
            break;
          case 'numberRange':
            result = validate.numberRange(value, rule.min, rule.max, rule.message || field);
            break;
          case 'enum':
            result = validate.enum(value, rule.values, rule.message || field);
            break;
          case 'phone':
            result = validate.phone(value, rule.message || field);
            break;
          case 'email':
            result = validate.email(value, rule.message || field);
            break;
        }
        
        if (!result.valid) {
          errors.push({ field, message: result.message });
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        code: 422,
        message: '参数验证失败',
        errors,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

module.exports = { validate, validateMiddleware };
