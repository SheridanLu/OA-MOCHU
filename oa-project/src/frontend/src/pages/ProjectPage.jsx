import React, { useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker, message, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select
const { TextArea } = Input

function ProjectPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [form] = Form.useForm()
  const [projectType, setProjectType] = useState('entity')

  const load = async () => {
    setLoading(true)
    try { const res = await axios.get('/projects'); setData(res.data) } catch (e) { message.error('加载失败') }
    setLoading(false)
  }
  React.useEffect(() => { load() }, [])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await axios.post(`/projects/${projectType}`, values)
      message.success('项目创建成功')
      setModal(false)
      load()
    } catch (e) { message.error(e.response?.data?.error || '创建失败') }
  }

  const columns = [
    { title: '项目编号', dataIndex: 'code', width: 130 },
    { title: '项目名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', width: 80, render: v => <Tag color={v === 'entity' ? 'blue' : 'orange'}>{v === 'entity' ? '实体' : '虚拟'}</Tag> },
    { title: '甲方', dataIndex: 'party_a', width: 150 },
    { title: '合同金额', dataIndex: 'contract_amount', width: 120, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag color={v === 'active' ? 'green' : v === 'pending' ? 'blue' : 'default'}>{v}</Tag> },
  ]

  return (
    <div>
      <Card title="项目立项管理" extra={<Space>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setProjectType('entity'); setModal(true) }}>实体项目</Button>
        <Button icon={<PlusOutlined />} onClick={() => { form.resetFields(); setProjectType('virtual'); setModal(true) }}>虚拟项目</Button>
      </Space>}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>
      <Modal title={`新建${projectType === 'entity' ? '实体' : '虚拟'}项目`} open={modal} onOk={handleSubmit} onCancel={() => setModal(false)} width={700}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="alias" label="项目别名"><Input /></Form.Item>
          <Form.Item name="location" label="项目地点"><Input /></Form.Item>
          <Form.Item name="party_a" label="甲方"><Input /></Form.Item>
          {projectType === 'entity' && <>
            <Form.Item name="contract_amount" label="合同含税金额"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
            <Form.Item name="contract_type" label="合同类型">
              <Select><Option value="采购">采购</Option><Option value="施工工程专业">施工工程专业</Option><Option value="劳务">劳务</Option><Option value="技术服务">技术服务</Option></Select>
            </Form.Item>
          </>}
          {projectType === 'virtual' && <Form.Item name="virtual_limit" label="金额限额（万元）"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>}
        </Form>
      </Modal>
    </div>
  )
}

export default ProjectPage
