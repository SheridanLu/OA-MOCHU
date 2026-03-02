import React, { useState } from 'react'
import { Card, Table, Tabs } from 'antd'
import axios from 'axios'

function MaterialPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try { const res = await axios.get('/materials'); setData(res.data) } catch (e) {}
    setLoading(false)
  }
  React.useEffect(() => { load() }, [])

  const columns = [
    { title: '物资名称', dataIndex: 'name' },
    { title: '规格', dataIndex: 'spec', width: 100 },
    { title: '单位', dataIndex: 'unit', width: 80 },
    { title: '分类', dataIndex: 'category', width: 100 },
    { title: '基准价', dataIndex: 'base_price', width: 100, render: v => v ? `¥${v}` : '-' },
  ]

  return (
    <Card title="物资进消存管理">
      <Tabs items={[
        { key: 'list', label: '物资列表', children: <Table dataSource={data} columns={columns} rowKey="id" loading={loading} /> },
        { key: 'in', label: '入库记录', children: <div>入库功能开发中...</div> },
        { key: 'out', label: '出库记录', children: <div>出库功能开发中...</div> },
      ]} />
    </Card>
  )
}

export default MaterialPage
