import React, { useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, Upload, message, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select
const { TextArea } = Input

function ContractPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { const res = await axios.get('/contracts'); setData(res.data) } catch (e) { message.error('加载失败') }
    setLoading(false)
  }
  React.useEffect(() => { load() }, [])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await axios.post('/contracts', values)
      message.success('合同创建成功')
      setModal(false)
      load()
    } catch (e) { message.error(e.response?.data?.error || '创建失败') }
  }

  const columns = [
    { title: '合同编号', dataIndex: 'code', width: 130 },
    { title: '合同名称', dataIndex: 'name' },
    { title: '项目', dataIndex: 'project_name', width: 150 },
    { title: '类型', dataIndex: 'type', width: 80, render: v => <Tag color={v === 'income' ? 'green' : 'blue'}>{v === 'income' ? '收入' : '支出'}</Tag> },
    { title: '金额', dataIndex: 'amount', width: 120, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag>{v}</Tag> },
  ]

  return (
    <div>
      <Card title="合同管理" extra={<Space>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true) }}>新建合同</Button>
      </Space>}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>
      <Modal title="新建合同" open={modal} onOk={handleSubmit} onCancel={() => setModal(false)} width={700}>
        <Form form={form} layout="vertical">
          <Form.Item name="project_id" label="项目ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="type" label="合同类型" rules={[{ required: true }]}>
            <Select><Option value="income">收入合同</Option><Option value="expense">支出合同</Option></Select>
          </Form.Item>
          <Form.Item name="name" label="合同名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="party_a" label="甲方"><Input /></Form.Item>
          <Form.Item name="party_b" label="乙方"><Input /></Form.Item>
          <Form.Item name="amount" label="合同金额"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ContractPage
