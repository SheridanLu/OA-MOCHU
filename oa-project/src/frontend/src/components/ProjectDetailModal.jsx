import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Row, Col, Statistic, Table, Tag, Progress, Descriptions, Empty, Spin, message } from 'antd';
import { 
  DollarOutlined, FileTextOutlined, BarChartOutlined, 
  ToolOutlined, WarningOutlined, CheckCircleOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { TabPane } = Tabs;

const ProjectDetailModal = ({ visible, projectId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState(null);

  useEffect(() => {
    if (visible && projectId) {
      fetchProjectDetail();
    }
  }, [visible, projectId]);

  const fetchProjectDetail = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/projects/${projectId}/overview`);
      if (res.data.success) {
        setProjectData(res.data.data);
      }
    } catch (error) {
      message.error('获取项目详情失败');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { text: '待审批', color: 'orange' },
      approved: { text: '已批准', color: 'green' },
      rejected: { text: '已拒绝', color: 'red' },
      suspended: { text: '已中止', color: 'default' },
      completed: { text: '已完成', color: 'blue' }
    };
    const { text, color } = statusMap[status] || { text: status, color: 'default' };
    return <Tag color={color}>{text}</Tag>;
  };

  const getProjectTypeTag = (type) => {
    const typeMap = {
      entity: { text: '实体项目', color: 'blue' },
      virtual: { text: '虚拟项目', color: 'purple' }
    };
    const { text, color } = typeMap[type] || { text: type, color: 'default' };
    return <Tag color={color}>{text}</Tag>;
  };

  const contractColumns = [
    {
      title: '合同编号',
      dataIndex: 'code',
      key: 'code',
      width: 120
    },
    {
      title: '合同名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => type === 'income' ? '收入' : '支出'
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
      width: 100,
      render: (status) => getStatusTag(status)
    }
  ];

  const milestoneColumns = [
    {
      title: '里程碑',
      dataIndex: 'milestone_name',
      key: 'milestone_name'
    },
    {
      title: '计划结束',
      dataIndex: 'planned_end_date',
      key: 'planned_end_date',
      width: 110
    },
    {
      title: '进度',
      dataIndex: 'progress_percent',
      key: 'progress_percent',
      width: 150,
      render: (percent) => (
        <Progress percent={percent || 0} size="small" />
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    }
  ];

  return (
    <Modal
      title={projectData?.project?.name || '项目详情'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      style={{ top: 20 }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : projectData ? (
        <Tabs defaultActiveKey="overview">
          {/* 概览 */}
          <TabPane tab="项目概览" key="overview">
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="项目编号">{projectData.project.code}</Descriptions.Item>
              <Descriptions.Item label="项目类型">{getProjectTypeTag(projectData.project.type)}</Descriptions.Item>
              <Descriptions.Item label="项目名称" span={2}>{projectData.project.name}</Descriptions.Item>
              <Descriptions.Item label="项目地点">{projectData.project.location || '-'}</Descriptions.Item>
              <Descriptions.Item label="合同金额">
                ¥{projectData.project.amount?.toLocaleString() || 0}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">{projectData.project.start_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="结束时间">{projectData.project.end_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="项目状态">{getStatusTag(projectData.project.status)}</Descriptions.Item>
              <Descriptions.Item label="整体进度">
                <Progress percent={projectData.project.progress_percent || 0} size="small" />
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="收入合同"
                    value={projectData.statistics.contracts.total_income || 0}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="支出合同"
                    value={projectData.statistics.contracts.total_expense || 0}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="劳务提报"
                    value={projectData.statistics.labor.total_amount || 0}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="待审批合同"
                    value={projectData.statistics.contracts.pending_contracts || 0}
                    suffix="个"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 合同信息 */}
          <TabPane tab="合同信息" key="contracts">
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="合同总数"
                    value={projectData.statistics.contracts.total_contracts || 0}
                    suffix="个"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="已批准"
                    value={projectData.statistics.contracts.approved_contracts || 0}
                    suffix="个"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="待审批"
                    value={projectData.statistics.contracts.pending_contracts || 0}
                    suffix="个"
                  />
                </Card>
              </Col>
            </Row>

            <Card title="合同列表">
              <Table
                columns={contractColumns}
                dataSource={projectData.details.contracts}
                rowKey="id"
                pagination={false}
              />
            </Card>
          </TabPane>

          {/* 项目进度 */}
          <TabPane tab="项目进度" key="progress">
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="设计进度">
                  {projectData.statistics.progress.design ? (
                    <div>
                      <Progress
                        percent={projectData.statistics.progress.design.progress_percent || 0}
                        status="active"
                      />
                      <div style={{ marginTop: 16 }}>
                        <Tag>总需求: {projectData.statistics.progress.design.total_items || 0}</Tag>
                        <Tag color="green">已完成: {projectData.statistics.progress.design.completed_items || 0}</Tag>
                        <Tag color="orange">剩余: {projectData.statistics.progress.design.remaining_items || 0}</Tag>
                      </div>
                    </div>
                  ) : (
                    <Empty description="暂无设计进度数据" />
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card title="施工进度">
                  {projectData.statistics.progress.construction ? (
                    <div>
                      <Progress
                        percent={projectData.statistics.progress.construction.progress_percent || 0}
                        status="active"
                        strokeColor="#52c41a"
                      />
                      <div style={{ marginTop: 16 }}>
                        <Tag>总里程碑: {projectData.statistics.progress.construction.total_items || 0}</Tag>
                        <Tag color="green">已完成: {projectData.statistics.progress.construction.completed_items || 0}</Tag>
                        <Tag color="orange">剩余: {projectData.statistics.progress.construction.remaining_items || 0}</Tag>
                      </div>
                    </div>
                  ) : (
                    <Empty description="暂无施工进度数据" />
                  )}
                </Card>
              </Col>
            </Row>

            <Card title="里程碑进度" style={{ marginTop: 16 }}>
              {projectData.details.milestones.length > 0 ? (
                <Table
                  columns={milestoneColumns}
                  dataSource={projectData.details.milestones}
                  rowKey="id"
                  pagination={false}
                />
              ) : (
                <Empty description="暂无里程碑数据" />
              )}
            </Card>
          </TabPane>

          {/* 财务数据 */}
          <TabPane tab="财务数据" key="finance">
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总收入"
                    value={projectData.statistics.contracts.total_income || 0}
                    precision={2}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总支出"
                    value={projectData.statistics.contracts.total_expense || 0}
                    precision={2}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="劳务提报"
                    value={projectData.statistics.labor.total_amount || 0}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="对账单数"
                    value={projectData.statistics.statements.total_statements || 0}
                    suffix="个"
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 变更签证 */}
          <TabPane tab="变更签证" key="changes">
            {projectData.details.changeRequests.length > 0 ? (
              <Row gutter={16}>
                {projectData.details.changeRequests.map(item => (
                  <Col span={6} key={item.type}>
                    <Card>
                      <Statistic
                        title={item.type === 'over_purchase' ? '超量采购' : 
                               item.type === 'new_material' ? '新增材料' :
                               item.type === 'site_visa' ? '现场签证' : '设计变更'}
                        value={item.count}
                        suffix="项"
                      />
                      <div style={{ marginTop: 8 }}>
                        金额: ¥{(item.total_amount || 0).toLocaleString()}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="暂无变更签证数据" />
            )}
          </TabPane>

          {/* 物资情况 */}
          <TabPane tab="物资情况" key="materials">
            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="采购清单项"
                    value={projectData.statistics.purchase.total_items || 0}
                    suffix="项"
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="采购总金额"
                    value={projectData.statistics.purchase.total_amount || 0}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="已采购"
                    value={projectData.statistics.purchase.purchased_items || 0}
                    suffix="项"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      ) : (
        <Empty description="无法加载项目数据" />
      )}
    </Modal>
  );
};

export default ProjectDetailModal;
