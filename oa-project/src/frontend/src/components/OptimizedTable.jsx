/**
 * 表格优化组件（分页+虚拟滚动）
 */

import React from 'react';
import { Table } from 'antd';

const OptimizedTable = ({ 
  columns, 
  dataSource, 
  loading = false,
  pageSize = 20,
  showSizeChanger = true,
  ...props 
}) => {
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: pageSize,
    total: 0,
  });

  React.useEffect(() => {
    if (dataSource) {
      const total = dataSource.length;
      setPagination(prev => ({ ...prev, total }));
    }
  }, [dataSource]);

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const { current, pageSize, total } = pagination;
  const startIndex = (current - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = dataSource?.slice(startIndex, endIndex);

  return (
    <Table
      columns={columns}
      dataSource={paginatedData}
      loading={loading}
      pagination={{
        current,
        pageSize,
        total,
        showTotal: true,
        showSizeChanger,
        showQuickJumper: true,
        onChange={handleTableChange}
      {...props}
    />
  );
};

export default OptimizedTable;
