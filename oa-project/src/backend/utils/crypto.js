/**
 * 数据加密工具
 */

const crypto = require('crypto');

// 加密配置
const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPT_SECRET || 'default-secret-key-change-in-production-32bytes!';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * 加密数据
 */
const encrypt = (text) => {
  if (!text) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
};

/**
 * 解密数据
 */
const decrypt = (encrypted) => {
  if (!encrypted) return null;
  
  try {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (e) {
    console.error('Decryption failed:', e.message);
    return null;
  }
};

/**
 * 哈希密码
 */
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

/**
 * 验证密码
 */
const verifyPassword = (password, storedHash) => {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

/**
 * 生成随机令牌
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * MD5 哈希（用于文件校验等非安全场景）
 */
const md5 = (text) => {
  return crypto.createHash('md5').update(text).digest('hex');
};

/**
 * SHA256 哈希
 */
const sha256 = (text) => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

module.exports = {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateToken,
  md5,
  sha256
};
