/**
 * 简单内存缓存
 */

class Cache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  // 设置缓存
  set(key, value, ttlSeconds = 60) {
    // 清除旧定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // 设置缓存
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });

    // 设置过期定时器
    this.timers.set(key, setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttlSeconds * 1000));
  }

  // 获取缓存
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  // 删除缓存
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  // 清空缓存
  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
  }

  // 缓存中间件
  middleware(ttlSeconds = 60) {
    return (req, res, next) => {
      // 只缓存GET请求
      if (req.method !== 'GET') return next();

      const key = `${req.originalUrl}`;
      const cached = this.get(key);
      
      if (cached) {
        return res.json({
          ...cached,
          _cached: true
        });
      }

      // 拦截res.json
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (res.statusCode === 200) {
          this.set(key, data, ttlSeconds);
        }
        return originalJson(data);
      };

      next();
    };
  }

  // 获取统计
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new Cache();
