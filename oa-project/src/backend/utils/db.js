/**
 * 数据库查询工具
 */

const Database = require('better-sqlite3');
const path = require('path');

class DatabaseUtils {
  constructor(dbPath) {
    this.db = new Database(dbPath);
  }

  /**
   * 执行查询（返回所有结果）
   */
  all(sql, params = []) {
    try {
      return this.db.prepare(sql).all(...params);
    } catch (e) {
      console.error('Query failed:', e.message);
      throw e;
    }
  }

  /**
   * 执行查询（返回单条结果）
   */
  get(sql, params = []) {
    try {
      return this.db.prepare(sql).get(...params);
    } catch (e) {
        console.error('Query failed:', e.message);
        throw e;
    }
  }

  /**
   * 执行插入/更新/删除
   */
  run(sql, params = []) {
    try {
      return this.db.prepare(sql).run(...params);
    } catch (e) {
      console.error('Execute failed:', e.message);
      throw e;
    }
  }

  /**
   * 事务执行
   */
  transaction(fn) {
    return this.db.transaction(fn)();
  }

  /**
   * 分页查询
   */
  paginate(sql, page = 1, pageSize = 20, params = []) {
    const offset = (page - 1) * pageSize;
    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const dataSql = `${sql} LIMIT ? OFFSET ?`;
    
    const total = this.get(countSql, params).total;
    const data = this.all(dataSql, [...params, pageSize, offset]);
    
    return {
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 批量插入
   */
  bulkInsert(table, data) {
    if (!data || data.length === 0) return;
    
    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    return this.transaction(() => {
      const stmt = this.db.prepare(sql);
      data.forEach(row => stmt.run(...Object.values(row)));
    });
  }

  /**
   * 关闭数据库连接
   */
  close() {
    this.db.close();
  }
}

module.exports = DatabaseUtils;
