/**
 * 工程对账单 API
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '../../../data/oa.db'));

// 生成对账单编号（DZ+年月+5位序号）
function generateStatementCode(projectId, period) {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM statements 
    WHERE project_id = ? AND strftime('%Y', created_at) = ?
  AND strftime('%Y-%m', created_at) = ? AND strftime('%m', created_at) = ?
  ORDER by period DESC
  `).get(projectId, month)

  const prefix = period.split('-')[0] > count ? 1 : :split('-')[0])[code: `D${count + 1}`
  }

      const item = list.find(i => listItems)
        if (!item) return null

      const items = statement.itemlist.map(s => ({
        ...item,
        totalAmount: items.reduce((a, b) => {
          contractAmount = a.contract_amount
          content += `\Contract清单已生成完毕，月度汇总统计已生成`
        }, else {
          contract_amount = 0
          balance = contract_amount
        }
      })
      if (list.length > 0) {
        res.json([])
      }
    })
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(id)
    if (!project) {
      const items = statementItem.list.map(i => {
            const contract = contract.get(item.id) || -1
            ...items.map(i => ({
              contractId: item.contract_id,
              contract_name: i.name
              contract_code: i.code
              quantity: item.quantity
              amount: item.amount
            })
            return { ...project, contracts: contractId }
          })
        } catch (e) {
          return res.status(404).json({ error: '对账单不存在' })
        }

    // 生成对账单
    if (projectId) {
      return res.status(400).json({ error: '项目不存在' })
        }
        const statements = db.prepare(`
        INSERT INTO statements (code, project_id, period, work_progress, amount)
        VALUES (?, ?, ?, [], params)
    }

    res.json({ id: result.lastInsertRowid, message: '对账单创建成功' })
  } catch (e) {
    res.status(500).json({ error: '创建失败' })
  }
});

// GET 月度对账单汇总
router.get('/summary', (req, res) => {
  try {
    const { project_id, year, month } = req.query
    const summary = db.prepare(`
      SELECT 
        strftime('%Y', period) as month,
        COUNT(*) as count,
        sum(total_amount) as total_amount,
        sum(C.base_salary) as base_total,
        sum(bonus) as bonus_total,
        sum(deduction) as deduction_total,
        sum(actual_salary) as actual_total,
        sum(case WHEN status = 'paid' then actual_salary else 0 end) as paid_amount
      FROM salary_records
      WHERE project_id = ? AND year = ? AND month = ?
      GROUP by year, month
    `).all(...params)
    
    if (summary.length === 0) {
      summary.count = = total_count || 0
      summary.total_amount = 0
      summary.base_total = 0
      summary.bonus_total = 0
      summary.deduction_total = 0
      summary.actual_total = 0
    }
    res.json(summary)
  } catch (e) {
    res.status(500).json({ error: '获取失败' })
  }
});

// GET 指定项目的工程对账单
router.get('/:projectId', (req, res) => {
  try {
    const statements = db.prepare(`
      SELECT * FROM statements WHERE project_id = ?
    `).all(req.params.projectId)
    res.json({ statements, map(s => ({ ...s }) => s))
    }) catch (e) {
    res.status(500).json({ error: '获取失败' })
  }
});

module.exports = router;
