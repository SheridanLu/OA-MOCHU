import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, Upload, message, Tag, Steps, Alert } from 'antd'
import { PlusOutlined, ReloadOutlined, UploadOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select
const { TextArea } = Input

function CompletionPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [form] = Form.useForm()
  const [projects, setProjects] = useState([])
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => { loadProjects(); loadData() }, [])

  const loadProjects = async () => {
    try {
      const res = await axios.get('/projects?type=entity&status=active')
      setProjects(res.data)
    } catch (e) {}
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/completion/docs')
      setData(res.data)
    } catch (e) {}
    setLoading(false)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // 前置条件检查
      if (values.type === 'drawing') {
        if (!values.design_issues_cleared) {
          return message.error('设计进度监控看板中的图纸修改遗留问题必须清零')
        }
      }
      
      if (values.type === 'settlement') {
        if (!values.all_statements_generated) {
          return message.error('系统的工程对账单必须全部生成完毕')
        }
      }
      
      await axios.post('/completion/docs', { ...values, created_by: user.id })
      message.success('提交成功')
      setModal(false)
      loadData()
    } catch (e) {
      message.error(e.response?.data?.error || '提交失败')
    }
  }

  const handleApprove = async (id) => {
    try {
      await axios.put(`/completion/docs/${id}/approve`)
      message.success('审核通过')
      loadData()
    } catch (e) {}
  }

  const columns = [
    { title: '项目', dataIndex: 'project_name', width: 150 },
    { title: '类型', dataIndex: 'type', width: 100, render: v => (
      <Tag color={v === 'drawing' ? 'blue' : 'green'}>{v === 'drawing' ? '竣工图纸' : '结算文件'}</Tag>
    )},
    { title: '标题', dataIndex: 'title' },
    { title: '设计问题清零', dataIndex: 'design_issues_cleared', width: 100, render: v => 
      v ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <WarningOutlined style={{ color: '#faad14' }} />
    },
    { title: '对账单完成', dataIndex: 'all_statements_generated', width: 100, render: v => 
      v ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <WarningOutlined style={{ color: '#faad14' }} />
    },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag color={v === 'approved' ? 'green' : 'blue'}>{v}</Tag> },
    { title: '操作', width: 100, render: (_, r) => r.status === 'pending' && (
      <Button type="link" onClick={() => handleApprove(r.id)}>审核</Button>
    )}
  ]

  return (
    <div>
      <Card title="竣工管理" extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true) }}>提交文档</Button>
        </Space>
      }>
        <Alert 
          message="前置条件说明" 
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li><strong>竣工图纸审批：</strong>设计进度监控看板中的图纸修改遗留问题必须清零</li>
              <li><strong>竣工结算文件审批：</strong>系统的工程对账单（每月25日自动生成的5位数编号表单）必须全部生成完毕</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal title="提交竣工文档" open={modal} onOk={handleSubmit} onCancel={() => setModal(false)} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="project_id" label="项目" rules={[{ required: true }]}>
            <Select>
              {projects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="文档类型" rules={[{ required: true }]}>
            <Select onChange={(v) => {
              if (v === 'settlement') {
                form.setFieldsValue({ design_issues_cleared: true })
              } else {
                form.setFieldsValue({ all_statements_generated: true })
              }
            }}>
              <Option value="drawing">竣工图纸</Option>
              <Option value="settlement">结算文件</Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="content" label="内容说明"><TextArea rows={3} /></Form.Item>
          <Form.Item name="attachments" label="附件链接"><Input /></Form.Item>
          
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const type = getFieldValue('type')
              return <>
                {type === 'drawing' && (
                  <Form.Item name="design_issues_cleared" valuePropName="checked" initialValue={false}>
                    <Input type="checkbox" /> 设计问题已清零
                  </Form.Item>
                )}
                {type === 'settlement' && (
                  <Form.Item name="all_statements_generated" valuePropName="checked" initialValue={false}>
                    <Input type="checkbox" /> 所有对账单已生成
                  </Form.Item>
                )}
              </>
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CompletionPage
