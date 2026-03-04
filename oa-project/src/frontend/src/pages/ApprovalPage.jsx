import React, { useState, useEffect } from 'react'
import { Card, Table, Tabs, Button, Space, Modal, Form, Input, message, Tag, Badge } from 'antd'
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'

const { TabPane } = Tabs
const { TextArea } = Input

function ApprovalPage() {
  const [pending, setPending] = useState([])
  const [done, setDone] = useState([])
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentApproval, setCurrentApproval] = useState(null)
  const [comment, setComment] = useState('')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => { loadPending(); loadDone() }, [])

  const loadPending = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/approvals/pending?roleCode=${user.role_code}`)
      setPending(res.data)
    } catch (e) {}
    setLoading(false)
  }

  const loadDone = async () => {
    try {
      const res = await axios.get(`/approvals/done?userId=${user.id}`)
      setDone(res.data)
    } catch (e) {}
  }

  const handleApprove = async (id) => {
    try {
      await axios.post(`/approvals/${id}/approve`, { userId: user.id, comment })
      message.success('审批通过')
      setDetailVisible(false)
      setComment('')
      loadPending()
      loadDone()
    } catch (e) {
      message.error(e.response?.data?.error || '操作失败')
    }
  }

  const handleReject = async (id) => {
    if (!comment) {
      message.warning('请填写拒绝原因')
      return
    }
    try {
      await axios.post(`/approvals/${id}/reject`, { userId: user.id, comment })
      message.success('已拒绝')
      setDetailVisible(false)
      setComment('')
      loadPending()
      loadDone()
    } catch (e) {
      message.error(e.response?.data?.error || '操作失败')
    }
  }

  const showDetail = async (id) => {
    try {
      const res = await axios.get(`/approvals/${id}`)
      setCurrentApproval(res.data)
      setDetailVisible(true)
    } catch (e) {
      message.error('获取详情失败')
    }
  }

  const businessTypeMap = {
    'project': '项目立项',
    'project_convert': '项目转换',
    'contract_income': '收入合同',
    'contract_expense': '支出合同',
    'change': '变更签证',
    'payment': '付款申请',
    'hr_onboard': '入职审批'
  }

  const columns = [
    { title: '类型', dataIndex: 'business_type', width: 100, render: v => <Tag color="blue">{businessTypeMap[v] || v}</Tag> },
    { title: '业务名称', dataIndex: 'business_name' },
    { title: '流程', dataIndex: 'flow_name', width: 150 },
    { title: '当前节点', dataIndex: 'current_step', width: 80, render: v => `第${v}步` },
    { title: '提交时间', dataIndex: 'created_at', width: 160, render: v => v?.substring(0, 16).replace('T', ' ') },
    { title: '操作', width: 100, render: (_, r) => <Button type="link" onClick={() => showDetail(r.id)}>处理</Button> }
  ]

  const doneColumns = [
    { title: '类型', dataIndex: 'business_type', width: 100, render: v => <Tag>{businessTypeMap[v] || v}</Tag> },
    { title: '流程', dataIndex: 'flow_name', width: 150 },
    { title: '操作', dataIndex: 'action', width: 80, render: v => <Tag color={v === 'approve' ? 'green' : 'red'}>{v === 'approve' ? '通过' : '拒绝'}</Tag> },
    { title: '意见', dataIndex: 'comment', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', width: 160, render: v => v?.substring(0, 16).replace('T', ' ') }
  ]

  return (
    <div>
      <Card title="我的审批" extra={<Button icon={<ReloadOutlined />} onClick={() => { loadPending(); loadDone() }}>刷新</Button>}>
        <Tabs>
          <TabPane tab={<Badge count={pending.length} offset={[10, 0]}>待办</Badge>} key="pending">
            <Table dataSource={pending} columns={columns} rowKey="id" loading={loading} />
          </TabPane>
          <TabPane tab="已办" key="done">
            <Table dataSource={done} columns={doneColumns} rowKey="id" />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="审批详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {currentApproval && (
          <div>
            <p><strong>流程：</strong>{currentApproval.flow_name}</p>
            <p><strong>业务类型：</strong>{businessTypeMap[currentApproval.business_type]}</p>
            <p><strong>当前节点：</strong>第 {currentApproval.current_step} 步</p>
            
            <div style={{ margin: '16px 0' }}>
              <strong>审批记录：</strong>
              {currentApproval.records?.map((r, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Tag color={r.action === 'approve' ? 'green' : 'red'}>{r.action === 'approve' ? '通过' : '拒绝'}</Tag>
                  <span>{r.approver_name}：{r.comment || '无意见'}</span>
                </div>
              ))}
            </div>

            <Form.Item label="审批意见">
              <TextArea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="请输入审批意见（拒绝时必填）" />
            </Form.Item>

            <Space>
              <Button type="primary" icon={<CheckOutlined />} onClick={() => handleApprove(currentApproval.id)}>通过</Button>
              <Button danger icon={<CloseOutlined />} onClick={() => handleReject(currentApproval.id)}>拒绝</Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ApprovalPage
