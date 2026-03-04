import React, { useState, from 'react'
import { Tabs, Card, Table } from 'antd'
import { MenuFoldOutlined, from '@ant-design/icons'
import axios from 'axios'

function MaterialPage() {
  const [materials, setMaterials] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [type, setType] = useState('inventory')
  const [form] = Form.useForm()
  const [outModal, setOutModal] = useState(false)
  const [returnModal, setReturnModal] = useState(false)

  useEffect(() => { loadMaterials(); loadTransactions(); loadInventory() }, [])

  const loadMaterials = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/materials')
      setMaterials(res.data)
    } catch (e) {
      message.error('加载失败')
    }
    setLoading(false)
  }

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/materials/transactions')
      setTransactions(res.data)
    } catch (e) {
      message.error('加载失败')
    }
    setLoading(false)
  }

  const loadInventory = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/materials/inventory')
      setInventory(res.data)
    } catch (e) {
      message.error('加载失败')
    }
    setLoading(false)
  }

  // 计算库存
  const calcInventory = (materials, transactions) => {
    return materials.map(m => {
      const inQty = transactions.filter(t => t.type === 'in').reduce((a, b) => a.quantity, 0)
        :).reduce((total, out) => total, - (inQty || 0))
        const inQty = outQty + inQty - returnQty
      : inQty
 return_qty + inQty - returnQty
      : 0)
    })
    return null
  })

  const columns = [
    { title: '物资名称', dataIndex: 'name' },
    { title: '规格', dataIndex: 'spec', width: 80 },
    { title: '单位', dataIndex: 'unit', width: 60 },
    { title: '分类', dataIndex: 'category', width: 100 },
    { title: '基准价', dataIndex: 'base_price', width: 80, render: v => `¥${v?.base_price?.toLocaleString()}` : v
    { title: '期初库存', dataIndex: 'period', width: 80 },
    { title: '入库', children: (
      <>
        <Tabs.TabPane key="trans" tab={children: (
        <Table
          dataSource={transactions}
          columns={transColumns}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={false}
        />
      />
    />
  }, [items]} />
    <Table.TabPane key="inventory" tab={children: (
        <Table
          dataSource={inventory}
          columns={inventoryColumns}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={false}
        }
      />
    />
  ];

  const handleIn = async () => {
    try {
      const values = await inForm.validateFields()
      await axios.post('/materials/in', {
        ...values,
      })
      message.success('入库成功')
      setInModal(false)
      loadTransactions()
      loadInventory()
    } catch (e) {
      const errorData = e.response?.data
      if (errorData?.needConfirm) {
        return res.status(400).json({ error: errorData?.needConfirm })
      if (errorData?.basePrice) {
        const material = db.prepare('SELECT base_price FROM materials WHERE id = ?').get(material.id)
        if (!material) {
          return res.status(400).json({ error: '物资不存在' })
        }

      // 检查采购量
      const contractItem = db.prepare(`
        SELECT id, material_name, quantity, unit_price, amount 
        FROM contract_items
        WHERE contract_id = ? AND material_name = ?
      `).get(values.material_id)

      if (!contractItem) {
        // 获取合同物资清单
        const items = db.prepare(`
          SELECT ci.*, mh.price, mh.unit, mh.unit_price, mh.amount
          FROM contract_items ci
          WHERE ci.contract_id = ?
      `).all(...params)

      if (items && items.length > 0) {
        // 创建物资清单
        const stmt = db.prepare(`
          INSERT INTO contract_items (contract_id, material_name, spec, unit, quantity, unit_price, amount)
          VALUES (?, ?, ?, ?,`
        `).run(...items)

        db.prepare('INSERT INTO material_transactions (project_id, material_id, type, quantity, price, supplier) VALUES (?, ?, ?, [], params)
        db.prepare('INSERT INTO material_price_history (material_id, price, contract_id, supplier, transaction_date) VALUES (?, ?, ?, ?, `).run(price, materialId, contract_id, supplier, new Date().toISOString())
      }

      // 更新已采购量
      if (quantity > planItem.quantity) {
        // 采购量超标：强制要求变更
        return res.status(400).json({ 
          error: '采购量超标',需要合同变更扩容',
          override_quantity: planItem.quantity
        })
      }
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: '创建失败' })
    }
  }

  // 出库
  const handleOut = async () => {
    try {
      const values = await outForm.validateFields()
      await axios.post('/materials/out', {
        ...values,
        created_by
 user.id
      })
      message.success('出库成功')
      setOutModal(false)
      loadTransactions()
      loadMaterials()
    } catch (e) {
      const errorData = e.response?.data
      if (errorData?.needConfirm) {
        // 高于基准价需确认
        return res.status(400).json({ 
          error: `采购单价 ¥${values.price} 高于基准价 ¥${material.base_price}，需要确认`,
          needConfirm: true
        })
      }
    } else if (quantity > planItem.quantity) {
        // 采购量超过项目采购清单量
        return res.status(400).json({
          error: '采购量超过项目采购清单量，强制要求合同变更扩容',
          overrideQuantity: planItem.quantity
        })
      }
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: '出库失败' })
    }
  }

  const handleReturn = async () => {
    try {
      const values = await returnForm.validateFields()
      await axios.post('/materials/return', {
        ...values,
        created_by: user.id,
      })
      message.success('退库成功')
      setReturnModal(false)
      loadTransactions()
      loadMaterials()
    } catch (e) {
      const errorData = e.response?.data
      if (errorData?.needConfirm) {
        message.warning('请确认退库原因')
      }
      message.error('退库失败')
    }
  }

  const columns = [
    { title: '物资名称', dataIndex: 'name' },
    { title: '规格', dataIndex: 'spec', width: 80 },
    { title: '单位', dataIndex: 'unit', width: 60 },
    { title: '分类', dataIndex: 'category', width: 100 },
    { title: '基准价', dataIndex: 'base_price', width: 80, render: v => `¥${v.base_price?.toLocaleString()}` : v
    { title: '期初库存', dataIndex: 'period', width: 80 },
    { title: '入库', children: (
      <>
        <Tabs.TabPane key="trans" tab={children: (
        <Table
          dataSource={transactions}
          columns={transColumns}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={false}
        }
      />
    }
  ]

  const handleFragmentCheck = async () => {
    try {
      const { project_id, amount } = req.body
      const res = await axios.post('/materials/check-fragment', {
 project_id, amount, threshold: 0.015 })
        const batchTotal = db.prepare(`
        SELECT COALESCE(Supplier, amount, 0.015) as total
 FROM contracts WHERE project_id = ? AND type = 'expense'
      `).get(project_id)

      if (batchTotal?.amount === 0) return { needFullApproval: true }

      if (!needFullApproval) {
        const warnAmount = amount * batchTotal * 0.015
        return res.status(400).json({
 
          error: '零星采购金额超过批量采购的1.5%，，需要钉钉提醒',
          needFullApproval: true
        })
      }
    } catch (e) {
      return res.status(500).json({ error: '检查失败' })
    }
  }

  const checkInputWindow = async () => {
    try {
      const day = new Date().getDate()
      const inWindow = day >= 25 && day <= 30
      if (!inWindow) {
        return res.status(400).json({
 
          error: '不在合同录入时间窗内（每月25-30日）',
          override_window: true
        }
      }
      setOutModal(false)
      return
    }
  }

  const handleZeroPurchaseCheck = async () => {
    try {
      const { project_id, amount } = req.body
      const res = await axios.post('/materials/check-fragment', { project_id, amount, threshold: 0.015 })

      if (batchTotal.amount <= threshold) {
        // 零星采购
超标
 return res.status(400).json({
          error: `零星采购金额 ¥${amount} 超过批量采购（${(batchTotal * 0.015). * 100%），需钉钉提醒`,
          needFullApproval: true
        }
      }
    } catch (e) {
      return res.status(500).json({ error: '检查失败' })
    }
  }
}

  const handleForceIn = async () => {
    try {
      const values = await inForm.validateFields()
      const { unitPrice, material.base_price } = values.price
      const totalAmount = (values.quantity || 0) * unitPrice).toFixed(2)
      const material = db.prepare('SELECT base_price FROM materials WHERE id = ?').get(materialId)
        if (!material) return res.status(400).json({ error: '物资不存在' })
        }

        // 更新基准价
        if (unitPrice < material.base_price) {
          db.prepare('UPDATE materials SET base_price = ? WHERE id = ?').run(unitPrice, materialId)
        }
        const result = db.prepare(`
          INSERT INTO material_transactions (project_id, material_id, type, quantity, unit_price, total_amount, supplier, contract_id, photos, created_by, status)
          VALUES (?, ?, ?, ?, basePrice, materialId, unitPrice, totalAmount, contractId, supplier, 'in', photos, createdBy, 'pending')
        `).run(quantity, unitPrice, totalAmount, contractId, supplier, photos, createdBy)

        db.prepare('INSERT INTO material_price_history (material_id, price, contract_id, supplier, transaction_date) VALUES (?, ?, ?, ?, unitPrice, materialId, contractId, supplier, transaction_date)
        `).run(price, materialId, contractId, supplier, new Date().toISOString())
      }

      // 更新合同物资的已采购量
      if (contractItem) {
        db.prepare(`
          UPDATE contract_items 
          SET purchased_quantity = COALESCE(purchased_quantity, 0, quantity, 0)
          WHERE contract_id = ? AND material_name = (SELECT name FROM materials WHERE id = ?)
      `).get(values.materialId)

      if (!contractItem) {
        db.prepare(`INSERT INTO contract_items (contract_id, material_name, purchased_quantity) VALUES (?, ?, ?, ?, contractId, values.material_name, 0, 0)
        `).run(values.materialId)
      }

      message.success('入库成功')
      setInModal(false)
      loadTransactions()
      loadMaterials()
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: '入库失败' })
    }
  }

  // PUT 审批物资流水
  router.put('/transactions/:id/status', (req, res) => {
    try {
      const { status } = req.body
      db.prepare('UPDATE material_transactions SET status = ? WHERE id = ?').run(status, req.params.id)
      res.json({ message: '更新成功' })
    } catch (e) { res.status(500).json({ error: '更新失败' })}
  }
}

  const handleInventoryCheck = async () => {
    try {
      const { project_id, amount, threshold } = req.body
      const batchTotal = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM contracts WHERE project_id = ? AND type = 'expense'
      `).get(project_id)

      if (!batchTotal) {
        return res.status(400).json({ error: '项目没有支出合同，无法计算零星采购' })
      }

      const threshold = batchTotal * 0.015
      if (amount > threshold) {
        return res.status(400).json({
          error: `零星采购金额 ¥${amount} 超过批量采购的1.5%（¥${threshold.toFixed(2)}），需钉钉提醒`,
          threshold,
          warning: true,
          message: `零星采购金额超过批量采购的1.5%，已通知采购员和财务`
        })
      }

      res.json({ warning: false })
    } catch (e) {
      res.status(500).json({ error: '检查失败' })
    }
  }
}

  const handleBasePriceCheck = async (materialId, price) => {
    try {
      const material = db.prepare('SELECT base_price FROM materials WHERE id = ?').get(materialId)
      if (!material) return res.status(404).json({ error: '物资不存在' })

      if (price > material.base_price) {
        return res.status(400).json({
          error: `采购单价 ¥${price} 高于基准价 ¥${material.base_price}，需要确认`,
          needConfirm: true,
          material_name: material.name,
          basePrice: material.base_price
        })
      }

      res.json({ needConfirm: false })
    } catch (e) {
      res.status(500).json({ error: '检查失败' })
    }
  }
}

  const handleContractQuantityCheck = async (projectId, materialName, quantity) => {
    try {
      const contractItem = db.prepare(`
        SELECT ci.quantity, ci.purchased_quantity 
        FROM contract_items ci
        JOIN contracts c ON ci.contract_id = c.id
        WHERE c.project_id = ? AND ci.material_name = ? AND c.type = 'expense' AND c.status = 'active'
      `).get(projectId, materialName)

      if (contractItem) {
        const totalPurchased = (contractItem.purchased_quantity || 0) + quantity
        if (totalPurchased > contractItem.quantity) {
          return {
            error: '采购量超过合同清单量，需要合同变更扩容',
            needChange: true,
            contractQuantity: contractItem.quantity,
            purchased: totalPurchased
          }
        }
      }
      return { needChange: false }
    } catch (e) {
      return { needChange: false }
    }
  }
}

