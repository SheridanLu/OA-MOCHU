import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Space, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'

function ContractPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadContracts() }, [])

  const loadContracts = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/contracts')
      setContracts(res.data || [])
    } catch (err) {
      message.error('加载合同失败')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: '合同编号', dataIndex: 'code', width: 140 },
    { title: '合同名称', dataIndex: 'name' },
    { title: '项目', dataIndex: 'project_name', width: 150 },
    { title: '类型', dataIndex: 'type', width: 80, render: (v) => <Tag color={v === 'income' ? 'green' : 'blue'}>{v === 'income' ? '收入' : '支出'}</Tag> },
    { title: '金额', dataIndex: 'amount', width: 120, render: (v) => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: (v) => <Tag color={v === 'signed' ? 'green' : 'default'}>{v}</Tag> },
  ]

  return (
    <div>
      <Card title="合同管理" extra={<Button icon={<ReloadOutlined />} onClick={loadContracts}>刷新</Button>}>
        <Table dataSource={contracts} columns={columns} rowKey="id" loading={loading} />
      </Card>
    </div>
  )
}

export default ContractPage
