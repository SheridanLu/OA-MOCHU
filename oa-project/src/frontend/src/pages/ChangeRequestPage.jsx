import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Upload, message, Card, Row, Col, Statistic, InputNumber, Tag, Tabs } from 'antd';
import { PlusOutlined, UploadOutlined, EyeOutlined, EditOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const ChangeRequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [form] = Form.useForm();
  const [statistics, setStatistics] = useState({});
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchProjects();
    fetchRequests();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (res.data.success) {
        setProjects(res.data.data);
      }
    } catch (error) {
      message.error('获取项目列表失败');
    }
  };

  const fetchRequests = async (type = null, projectId = null) => {
    setLoading(true);
    try {
      const params = {};
      if (type && type !== 'all') params.type = type;
      if (projectId) params.project_id = projectId;

      const res = await axios.get('/api/change-requests', { params });
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (error) {
      message.error('获取变更签证列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const res = await axios.get('/api/change-requests/statistics/by-type');
      if (res.data.success) {
        const stats = {};
        res.data.data.forEach(item => {
          stats[item.type] = item;
        });
        setStatistics(stats);
      }
    } catch (error) {
      console.error('获取统计数据失败');
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setCurrentRequest(null);
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setCurrentRequest(record);
    form.setFieldsValue({
      ...record,
      attachments: record.attachments ? JSON.parse(record.attachments) : []
    });
    setModalVisible(true);
  };

  const handleView = (record) => {
    setCurrentRequest(record);
    setDetailVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条变更签证记录吗？',
      onOk: async () => {
        try {
          const res = await axios.delete(`/api/change-requests/${id}`);
          if (res.data.success) {
            message.success('删除成功');
            fetchRequests(activeTab);
          }
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleSubmit = async (values) => {
    try {
      const data = {
        ...values,
        attachments: values.attachments ? values.attachments.map(f => f.name || f.url) : [],
        created_by: 1 // TODO: 从登录状态获取
      };

      let res;
      if (currentRequest) {
        res = await axios.put(`/api/change-requests/${currentRequest.id}`, data);
      } else {
        res = await axios.post('/api/change-requests', data);
      }

      if (res.data.success) {
        message.success(currentRequest ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchRequests(activeTab);
        fetchStatistics();
      }
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    fetchRequests(key);
  };

  const getTypeTag = (type) => {
    const typeMap = {
      over_purchase: { text: '超量采购', color: 'orange' },
      new_material: { text: '新增材料', color: 'blue' },
      site_visa: { text: '现场签证', color: 'green' },
      design_change: { text: '设计变更', color: 'purple' }
    };
    const { text, color } = typeMap[type] || { text: type, color: 'default' };
    return <Tag color={color}>{text}</Tag>;
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { text: '待审批', color: 'orange' },
      approved: { text: '已通过', color: 'green' },
      rejected: { text: '已拒绝', color: 'red' }
    };
    const { text, color } = statusMap[status] || { text: status, color: 'default' };
    return <Tag color={color}>{text}</Tag>;
  };

  const columns = [
    {
      title: '变更编号',
      dataIndex: 'code',
      key: 'code',
      width: 120
    },
    {
      title: '变更类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => getTypeTag(type)
    },
    {
      title: '项目名称',
      dataIndex: 'project_name',
      key: 'project_name',
      ellipsis: true
    },
    {
      title: '变更原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      width: 200
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (val) => val ? `¥${val.toLocaleString()}` : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (val) => val?.substring(0, 16)
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <span>
          <Button type="link" size="small" onClick={() => handleView(record)}>
            <EyeOutlined /> 查看
          </Button>
          {record.status === 'pending' && (
            <>
              <Button type="link" size="small" onClick={() => handleEdit(record)}>
                <EditOutlined /> 编辑
              </Button>
              <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>
                <DeleteOutlined /> 删除
              </Button>
            </>
          )}
        </span>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="变更签证管理">
        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic
              title="超量采购"
              value={statistics.over_purchase?.count || 0}
              suffix="项"
              prefix={statistics.over_purchase?.count > 0 && <WarningOutlined style={{ color: '#faad14' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="新增材料"
              value={statistics.new_material?.count || 0}
              suffix="项"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="现场签证"
              value={statistics.site_visa?.count || 0}
              suffix="项"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="设计变更"
              value={statistics.design_change?.count || 0}
              suffix="项"
            />
          </Col>
        </Row>

        {/* 标签页 */}
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane tab="全部" key="all" />
          <TabPane tab="超量采购" key="over_purchase" />
          <TabPane tab="新增材料" key="new_material" />
          <TabPane tab="现场签证" key="site_visa" />
          <TabPane tab="设计变更" key="design_change" />
        </Tabs>

        {/* 操作按钮 */}
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建变更申请
          </Button>
        </div>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={currentRequest ? '编辑变更申请' : '新建变更申请'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="项目"
            name="project_id"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select
              placeholder="请选择项目"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {projects.map(p => (
                <Option key={p.id} value={p.id}>{p.code} - {p.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="变更类型"
            name="type"
            rules={[{ required: true, message: '请选择变更类型' }]}
          >
            <Select placeholder="请选择变更类型">
              <Option value="over_purchase">超量采购</Option>
              <Option value="new_material">新增设备/材料</Option>
              <Option value="site_visa">现场签证</Option>
              <Option value="design_change">设计变更</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="变更原因"
            name="reason"
            rules={[{ required: true, message: '请输入变更原因' }]}
          >
            <TextArea rows={4} placeholder="请详细描述变更原因" />
          </Form.Item>

          <Form.Item label="涉及金额" name="amount">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\¥\s?|(,*)/g, '')}
              placeholder="请输入涉及金额（可选）"
            />
          </Form.Item>

          <Form.Item label="附件" name="attachments">
            <Upload
              listType="picture"
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />}>上传附件</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              提交审批
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => setModalVisible(false)}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看详情弹窗 */}
      <Modal
        title="变更签证详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {currentRequest && (
          <div>
            <p><strong>变更编号：</strong>{currentRequest.code}</p>
            <p><strong>变更类型：</strong>{getTypeTag(currentRequest.type)}</p>
            <p><strong>项目：</strong>{currentRequest.project_name}</p>
            <p><strong>变更原因：</strong>{currentRequest.reason}</p>
            <p><strong>涉及金额：</strong>{currentRequest.amount ? `¥${currentRequest.amount.toLocaleString()}` : '-'}</p>
            <p><strong>状态：</strong>{getStatusTag(currentRequest.status)}</p>
            <p><strong>创建人：</strong>{currentRequest.creator_name}</p>
            <p><strong>创建时间：</strong>{currentRequest.created_at}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ChangeRequestPage;
