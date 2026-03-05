import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Upload, message, Card, Row, Col, Statistic, DatePicker, InputNumber } from 'antd';
import { PlusOutlined, UploadOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

const LaborReportPage = () => {
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [form] = Form.useForm();
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
    fetchProjects();
    fetchReports();
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

  const fetchReports = async (projectId = null) => {
    setLoading(true);
    try {
      const params = projectId ? { project_id: projectId } : {};
      const res = await axios.get('/api/labor-reports', { params });
      if (res.data.success) {
        setReports(res.data.data);
      }
    } catch (error) {
      message.error('获取劳务提报列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async (projectId) => {
    try {
      const res = await axios.get('/api/contracts', { params: { project_id: projectId } });
      if (res.data.success) {
        setContracts(res.data.data);
      }
    } catch (error) {
      message.error('获取合同列表失败');
    }
  };

  const fetchStatistics = async (projectId) => {
    try {
      const res = await axios.get('/api/labor-reports/statistics/by-project', {
        params: { project_id: projectId }
      });
      if (res.data.success) {
        setStatistics(res.data.data);
      }
    } catch (error) {
      message.error('获取统计数据失败');
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setCurrentReport(record);
    form.setFieldsValue({
      ...record,
      photos: record.photos ? JSON.parse(record.photos) : []
    });
    setModalVisible(true);
  };

  const handleView = (record) => {
    setCurrentReport(record);
    setDetailVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条劳务提报记录吗？',
      onOk: async () => {
        try {
          const res = await axios.delete(`/api/labor-reports/${id}`);
          if (res.data.success) {
            message.success('删除成功');
            fetchReports();
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
        photos: values.photos ? values.photos.map(f => f.name || f.url) : [],
        created_by: 1 // TODO: 从登录状态获取
      };

      let res;
      if (currentReport) {
        res = await axios.put(`/api/labor-reports/${currentReport.id}`, data);
      } else {
        res = await axios.post('/api/labor-reports', data);
      }

      if (res.data.success) {
        message.success(currentReport ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchReports();
        if (values.project_id) {
          fetchStatistics(values.project_id);
        }
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleProjectChange = (projectId) => {
    fetchContracts(projectId);
    fetchStatistics(projectId);
  };

  const columns = [
    {
      title: '报告编号',
      dataIndex: 'report_no',
      key: 'report_no',
      width: 120
    },
    {
      title: '项目名称',
      dataIndex: 'project_name',
      key: 'project_name',
      ellipsis: true
    },
    {
      title: '合同名称',
      dataIndex: 'contract_name',
      key: 'contract_name',
      ellipsis: true
    },
    {
      title: '工程量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (val) => val?.toLocaleString()
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      render: (val) => val ? `¥${val.toLocaleString()}` : '-'
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (val) => `¥${val?.toLocaleString()}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => {
        const statusMap = {
          pending: { text: '待审批', color: 'orange' },
          approved: { text: '已通过', color: 'green' },
          rejected: { text: '已拒绝', color: 'red' }
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <span style={{ color }}>{text}</span>;
      }
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
      <Card title="劳务提报工程量核算">
        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="总提报数" value={statistics.total_reports || 0} />
          </Col>
          <Col span={6}>
            <Statistic title="待审批" value={statistics.pending_count || 0} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col span={6}>
            <Statistic title="已通过" value={statistics.approved_count || 0} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic
              title="总金额"
              value={statistics.total_amount || 0}
              precision={2}
              prefix="¥"
            />
          </Col>
        </Row>

        {/* 操作按钮 */}
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建提报
          </Button>
        </div>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={currentReport ? '编辑劳务提报' : '新建劳务提报'}
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
              onChange={handleProjectChange}
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
            label="合同"
            name="contract_id"
            rules={[{ required: true, message: '请选择合同' }]}
          >
            <Select placeholder="请选择合同">
              {contracts.map(c => (
                <Option key={c.id} value={c.id}>{c.code} - {c.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="关联对账单" name="statement_id">
            <Select placeholder="请选择对账单（可选）" allowClear>
              <Option value={1}>2026年1月对账单</Option>
              <Option value={2}>2026年2月对账单</Option>
            </Select>
          </Form.Item>

          <Form.Item label="工程量计算式" name="calculation_formula">
            <TextArea rows={3} placeholder="请输入工程量计算式" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="工程量"
                name="quantity"
                rules={[{ required: true, message: '请输入工程量' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="单价" name="unit_price">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="金额"
                name="amount"
                rules={[{ required: true, message: '请输入金额' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="隐蔽工程照片" name="photos">
            <Upload
              listType="picture"
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />}>上传照片</Button>
            </Upload>
          </Form.Item>

          <Form.Item label="说明" name="description">
            <TextArea rows={2} placeholder="请输入说明" />
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
        title="劳务提报详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {currentReport && (
          <div>
            <p><strong>报告编号：</strong>{currentReport.report_no}</p>
            <p><strong>项目：</strong>{currentReport.project_name}</p>
            <p><strong>合同：</strong>{currentReport.contract_name}</p>
            <p><strong>工程量：</strong>{currentReport.quantity?.toLocaleString()}</p>
            <p><strong>单价：</strong>{currentReport.unit_price ? `¥${currentReport.unit_price.toLocaleString()}` : '-'}</p>
            <p><strong>金额：</strong>¥{currentReport.amount?.toLocaleString()}</p>
            <p><strong>计算式：</strong>{currentReport.calculation_formula || '-'}</p>
            <p><strong>说明：</strong>{currentReport.description || '-'}</p>
            <p><strong>状态：</strong>{currentReport.status}</p>
            <p><strong>创建人：</strong>{currentReport.creator_name}</p>
            <p><strong>创建时间：</strong>{currentReport.created_at}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LaborReportPage;
