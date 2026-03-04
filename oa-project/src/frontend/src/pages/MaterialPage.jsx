import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, Upload, message, Tabs, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select
const { TextArea } = Input

function MaterialPage() {
  const [materials, setMaterials] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [inModal, setInModal] = useState(false)
  const [outModal, setOutModal] = useState(false)
  const [returnModal, setReturnModal] = useState(false)
  const [inForm] = Form.useForm()
  const [outForm] = Form.useForm()
  const [returnForm] = Form.useForm()

  useEffect(() => { loadMaterials(); loadTransactions() }, [])

  const loadMaterials = async () => {
    try { const res = await axios.get('/materials'); setMaterials(res.data) } catch (e) {}
  }

  const loadTransactions = async () => {
    setLoading(true)
    try { const res = await axios.get('/materials/transactions'); setTransactions(res.data) } catch (e) { message.error('加载失败') }
    setLoading(false)
  }

  // 入库
  const handleIn = async () => {
    try {
      const values = await inForm.validateFields()
      await axios.post('/materials/in', values)
      message.success('入库成功')
      setInModal(false)
      loadTransactions()
    } catch (e) { message.error(e.response?.data?.error || '入库失败') }
  }

  // 出库
  const handleOut = async () => {
    try {
      const values = await outForm.validateFields()
      await axios.post('/materials/out', values)
      message.success('出库成功')
      setOutModal(false)
      loadTransactions()
    } catch (e) { message.error(e.response?.data?.error || '出库失败') }
  }

  // 退库
  const handleReturn = async () => {
    try {
      const values = await returnForm.validateFields()
      await axios.post('/materials/return', values)
      message.success('退库成功')
      setReturnModal(false)
      loadTransactions()
    } catch (e) { message.error(e.response?.data?.error || '退库失败') }
  }

  const materialColumns = [
    { title: '物资名称', dataIndex: 'name' },
    { title: '规格', dataIndex: 'spec', width: 100 },
    { title: '单位', dataIndex: 'unit', width: 80 },
    { title: '分类', dataIndex: 'category', width: 100 },
    { title: '基准价', dataIndex: 'base_price', width: 100, render: v => v ? `¥${v}` : '-' },
  ]

  const transactionColumns = [
    { title: '项目', dataIndex: 'project_name', width: 150 },
    { title: '物资', dataIndex: 'material_name', width: 150 },
    { title: '类型', dataIndex: 'type', width: 80, render: v => {
      const map = { in: <Tag color="green">入库</Tag>, out: <Tag color="blue">出库</Tag>, return: <Tag color="orange">退库</Tag> }
      return map[v] || v
    }},
    { title: '数量', dataIndex: 'quantity', width: 100 },
    { title: '单价', dataIndex: 'price', width: 100, render: v => v ? `¥${v}` : '-' },
    { title: '金额', dataIndex: 'amount', width: 120, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '供应商', dataIndex: 'supplier', width: 150 },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag color={v === 'approved' ? 'green' : 'blue'}>{v}</Tag> },
    { title: '操作人', dataIndex: 'creator_name', width: 100 },
    { title: '时间', dataIndex: 'created_at', width: 160, render: v => v?.substring(0, 16).replace('T', ' ') },
  ]

  return (
    <div>
      <Card title="物资进消存管理" extra={<Space>
        <Button icon={<ReloadOutlined />} onClick={() => { loadMaterials(); loadTransactions() }}>刷新</Button>
        <Button type="primary" onClick={() => { inForm.resetFields(); setInModal(true) }}>入库</Button>
        <Button onClick={() => { outForm.resetFields(); setOutModal(true) }}>出库</Button>
        <Button danger onClick={() => { returnForm.resetFields(); setReturnModal(true) }}>退库</Button>
      </Space>}>
        <Tabs items={[
          { key: 'trans', label: '出入库记录', children: <Table dataSource={transactions} columns={transactionColumns} rowKey="id" loading={loading} scroll={{ x: 1400 }} /> },
          { key: 'list', label: '物资清单', children: <Table dataSource={materials} columns={materialColumns} rowKey="id" /> },
        ]} />
      </Card>

      {/* 入库弹窗 */}
      <Modal title="物资入库" open={inModal} onOk={handleIn} onCancel={() => setInModal(false)} width={600}>
        <Form form={inForm} layout="vertical">
          <Form.Item name="project_id" label="项目ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="material_id" label="物资ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="price" label="单价"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="supplier" label="供应商"><Input /></Form.Item>
          <Form.Item name="contract_id" label="合同ID"><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="photos" label="到货照片链接"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* 出库弹窗 */}
      <Modal title="物资出库" open={outModal} onOk={handleOut} onCancel={() => setOutModal(false)} width={600}>
        <Form form={outForm} layout="vertical">
          <Form.Item name="project_id" label="项目ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="material_id" label="物资ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="photos" label="现场照片链接"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* 退库弹窗 */}
      <Modal title="物资退库" open={returnModal} onOk={handleReturn} onCancel={() => setReturnModal(false)} width={600}>
        <Form form={returnForm} layout="vertical">
          <Form.Item name="project_id" label="项目ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="material_id" label="物资ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MaterialPage
