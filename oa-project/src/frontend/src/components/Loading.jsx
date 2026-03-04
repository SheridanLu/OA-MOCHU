/**
 * Loading 组件
 */

import React from 'react';
import { Spin } from 'antd';

const Loading = ({ tip = '加载中...', size = 'default' }) => {
  return (
    <div style={{ textAlign: 'center', padding: '100px 0' }}>
      <Spin size={size} />
      <span style={{ marginLeft: 8 }}>{tip}</span>
    </div>
  );
};

export default Loading;
