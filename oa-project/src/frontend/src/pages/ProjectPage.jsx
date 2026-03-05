import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker, message, Tag, Divider, Row, Col, Tooltip } from 'antd'
import { PlusOutlined, ReloadOutlined, InfoCircleOutlined, EyeOutlined } from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import ProjectDetailModal from '../components/ProjectDetailModal'

const { Option } = Select
const { TextArea } = Input

function ProjectPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [entityModal, setEntityModal] = useState(false)
  const [virtualModal, setVirtualModal] = useState(false)
  const [suspendModal, setSuspendModal] = useState(false)
  const [convertModal, setConvertModal] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [entityForm] = Form.useForm()
  const [virtualForm] = Form.useForm()
  const [suspendForm] = Form.useForm()
  const [convertForm] = Form.useForm()
  const [entityProjects, setEntityProjects] = useState([])
  const [currentProject, setCurrentProject] = useState(null)
  const [paymentPlans, setPaymentPlans] = useState([])

  const [detailModal, setDetailModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(null)

  const handleViewDetail = (projectId) => {
    setSelectedProjectId(projectId)
    setDetailModal(true)
  }
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/projects')
      setData(res.data)
      setEntityProjects(res.data.filter(p => p.type === 'entity' && p.status === 'approved'))
    } catch (e) { message.error('加载失败') }
    setLoading(false)
  }

  // 添加付款计划
  const addPaymentPlan = () => {
    setPaymentPlans([...paymentPlans, { batch_no: paymentPlans.length + 1, planned_date: null, amount: 0, plan_ratio: 0 }])
  }

  // 删除付款计划
  const removePaymentPlan = (index) => {
    setPaymentPlans(paymentPlans.filter((_, i) => i !== index))
  }

  // 创建实体项目
  const handleEntitySubmit = async () => {
    try {
      const values = await entityForm.validateFields()
      values.payment_plans = paymentPlans
      values.created_by = user.id
      
      await axios.post('/projects/entity', values)
      message.success('实体项目创建成功')
      setEntityModal(false)
      setPaymentPlans([])
      load()
    } catch (e) {
      message.error(e.response?.data?.error || '创建失败')
    }
  }

  // 创建虚拟项目
  const handleVirtualSubmit = async () => {
    try {
      const values = await virtualForm.validateFields()
      values.created_by = user.id
      
      await axios.post('/projects/virtual', values)
      message.success('虚拟项目创建成功')
      setVirtualModal(false)
      load()
    } catch (e) {
      message.error(e.response?.data?.error || '创建失败')
    }
  }

  // 查看项目详情
  const handleViewDetail = (projectId) => {
    setSelectedProjectId(projectId)
    setDetailModal(true)
  }

  // 项目中止
  const handleSuspend = async () => {
    try {
      const values = await suspendForm.validateFields()
      await axios.post(`/projects/${currentProject.id}/suspend`, values)
      message.success('项目已中止')
      setSuspendModal(false)
      load()
    } catch (e) {
      message.error(e.response?.data?.error || '操作失败')
    }
  }

  // 虚拟转实体
  const handleConvert = async () => {
    try {
      const values = await convertForm.validateFields()
      await axios.post(`/projects/${currentProject.id}/convert`, values)
      message.success('转换申请已提交')
      setConvertModal(false)
      load()
    } catch (e) {
      message.error(e.response?.data?.error || '操作失败')
    }
  }

  const columns = [
    { title: '项目编号', dataIndex: 'code', width: 130, render: (v, r) => (
      <Tag color={r.type === 'entity' ? 'blue' : 'orange'}>{v}</Tag>
    )},
    { title: '项目名称', dataIndex: 'name', ellipsis: true },
    { title: '类型', dataIndex: 'type', width: 80, render: v => v === 'entity' ? '实体' : '虚拟' },
    { title: '甲方', dataIndex: 'party_a', width: 150, ellipsis: true },
    { title: '金额(万)', dataIndex: 'contract_amount', width: 100, render: v => v?.toLocaleString() },
    { title: '状态', dataIndex: 'status', width: 90, render: v => {
      const map = { pending: '待审批', approved: '已立项', suspended: '已中止', converting: '转换中' }
      const colors = { pending: 'orange', approved: 'green', suspended: 'default', converting: 'blue' }
      return <Tag color={colors[v]}>{map[v] || v}</Tag>
    }},
    { title: '操作', width: 280, render: (_, r) => (
      <Space size="small">
        <Button 
          size="small" 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => handleViewDetail(r.id)}
        >
          详情
        </Button>
        {r.type === 'virtual' && r.status === 'approved' && (
          <>
            <Button size="small" onClick={() => { setCurrentProject(r); convertForm.resetFields(); setConvertModal(true) }}>转实体</Button>
            <Button size="small" danger onClick={() => { setCurrentProject(r); suspendForm.resetFields(); setSuspendModal(true) }}>中止</Button>
          </>
        )}
      </Space>
    )}
  ]

  return (
    <div>
      <Card title="项目立项管理" extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button onClick={() => { virtualForm.resetFields(); setVirtualModal(true) }}>虚拟项目</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { entityForm.resetFields(); setPaymentPlans([]); setEntityModal(true) }}>实体项目</Button>
        </Space>
      }>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>

      {/* 实体项目立项弹窗 */}
      <Modal title="实体项目立项" open={entityModal} onOk={handleEntitySubmit} onCancel={() => setEntityModal(false)} width={900} okText="提交" destroyOnClose>
        <Form form={entityForm} layout="vertical">
          <Divider>基本信息</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="合同名称" rules={[{ required: true, message: '请输入合同名称' }]}>
                <Input placeholder="如：华为极目项目消防工程" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="alias" label={<span>项目别名 <Tooltip title="可选，用于快速识别"><InfoCircleOutlined /></Tooltip></span>}>
                <Input placeholder="如：华为消防" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="location" label="项目地点">
                <Input placeholder="如：深圳市南山区" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contract_type" label="合同类型" rules={[{ required: true }]}>
                <Select placeholder="请选择">
                  <Option value="采购">采购</Option>
                  <Option value="施工工程专业">施工工程专业</Option>
                  <Option value="劳务">劳务</Option>
                  <Option value="技术服务">技术服务</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>金额信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="contract_amount" label="合同含税金额（万元）" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="amount_no_tax" label="不含税金额（万元）">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="tax_rate" label="税率（%）">
                <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="tax_amount" label="税金（万元）">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>甲方信息</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="party_a" label="甲方单位名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="party_a_bank" label={<span>甲方银行信息 <Tooltip title="银行账号、开户行等"><InfoCircleOutlined /></Tooltip></span>}>
                <Input placeholder="如：招商银行深圳分行 1234567890" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="party_a_contact" label="甲方联系人">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="party_a_phone" label="甲方电话">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="party_a_address" label="甲方地址">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider>时间与保修</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="start_date" label="开始时间">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="end_date" label="结束时间">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="warranty_period" label="保修期（月）">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>回款计划</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="return_plan_time" label="回款计划时间">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="return_plan_amount" label="回款计划金额（万元）">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>
            付款批次计划
            <Button type="link" onClick={addPaymentPlan}>+ 添加批次</Button>
          </Divider>
          {paymentPlans.map((plan, index) => (
            <Row gutter={16} key={index} style={{ marginBottom: 8 }}>
              <Col span={4}>
                <InputNumber addonBefore="第" addonAfter="批" value={plan.batch_no} disabled style={{ width: '100%' }} />
              </Col>
              <Col span={7}>
                <DatePicker placeholder="计划时间" style={{ width: '100%' }} onChange={(d) => {
                  const plans = [...paymentPlans]
                  plans[index].planned_date = d?.format('YYYY-MM-DD')
                  setPaymentPlans(plans)
                }} />
              </Col>
              <Col span={6}>
                <InputNumber placeholder="金额(万)" style={{ width: '100%' }} min={0} onChange={(v) => {
                  const plans = [...paymentPlans]
                  plans[index].amount = v
                  setPaymentPlans(plans)
                }} />
              </Col>
              <Col span={5}>
                <InputNumber placeholder="比例(%)" style={{ width: '100%' }} min={0} max={100} onChange={(v) => {
                  const plans = [...paymentPlans]
                  plans[index].plan_ratio = v
                  setPaymentPlans(plans)
                }} />
              </Col>
              <Col span={2}>
                <Button danger onClick={() => removePaymentPlan(index)}>删除</Button>
              </Col>
            </Row>
          ))}
        </Form>
      </Modal>

      {/* 虚拟项目立项弹窗 */}
      <Modal title="虚拟项目立项" open={virtualModal} onOk={handleVirtualSubmit} onCancel={() => setVirtualModal(false)} width={700}>
        <Form form={virtualForm} layout="vertical">
          <Form.Item name="name" label="虚拟合同名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="location" label="合同地点">
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contract_amount" label="合同含税金额（万元）" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="virtual_limit" label="拟投入项目金额限额（万元）" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="party_a" label="甲方单位名称">
            <Input />
          </Form.Item>
          <Form.Item name="contract_type" label="合同类型" rules={[{ required: true }]}>
            <Select>
              <Option value="采购">采购</Option>
              <Option value="施工工程专业">施工工程专业</Option>
              <Option value="劳务">劳务</Option>
              <Option value="技术服务">技术服务</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 项目中止弹窗 */}
      <Modal title="虚拟项目中止" open={suspendModal} onOk={handleSuspend} onCancel={() => setSuspendModal(false)}>
        {currentProject && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <div><strong>项目编号：</strong>{currentProject.code}</div>
            <div><strong>项目名称：</strong>{currentProject.name}</div>
            <div><strong>合同金额：</strong>{currentProject.contract_amount} 万元</div>
          </div>
        )}
        <Form form={suspendForm} layout="vertical">
          <Form.Item name="target_project_id" label="成本下挂目标" rules={[{ required: true, message: '请选择成本下挂目标' }]}>
            <Select placeholder="选择实体项目或公司综合成本" allowClear>
              <Option value={null}>公司综合成本</Option>
              {entityProjects.map(p => (
                <Option key={p.id} value={p.id}>{p.code} - {p.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="中止原因">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 虚拟转实体弹窗 */}
      <Modal title="虚拟转实体" open={convertModal} onOk={handleConvert} onCancel={() => setConvertModal(false)}>
        {currentProject && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <div><strong>当前编号：</strong>{currentProject.code}（8位虚拟）</div>
            <div><strong>转换后：</strong>将生成10位实体编号</div>
          </div>
        )}
        <Form form={convertForm} layout="vertical">
          <Form.Item name="win_notice_attachment" label="中标通知书" rules={[{ required: true, message: '必须上传中标通知书' }]}>
            <Input placeholder="请输入文件链接" />
          </Form.Item>
        </Form>
      </Modal>
      {/* 项目详情弹窗 */}
      <ProjectDetailModal
        visible={detailModal}
        projectId={selectedProjectId}
        onClose={() => setDetailModal(false)}
      />
    </div>
  )
}


export default ProjectPage
