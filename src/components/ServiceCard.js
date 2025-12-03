import React from 'react';
import { Card, Typography, Space, Avatar } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * ServiceCard component for displaying service information in grid
 * @param {Object} props - Component props
 * @param {Object} props.service - Service data object
 * @param {Function} props.onClick - Click handler function
 * @returns {JSX.Element} ServiceCard component
 */
const ServiceCard = ({ service, onClick }) => {
  const { title, shortDescription, price, image } = service;

  return (
    <Card
      hoverable
      onClick={() => onClick(service)}
      style={{
        cursor: 'pointer',
        height: '100%',
        borderRadius: '12px'
      }}
      bodyStyle={{ padding: '24px' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space size="middle" style={{ width: '100%' }}>
          <Avatar 
            size={60} 
            style={{ 
              fontSize: '32px',
              background: '#f0f9ff',
              color: '#0ea5e9',
              flexShrink: 0
            }}
          >
            {image}
          </Avatar>
          <Space direction="vertical" size={0} style={{ flex: 1 }}>
            <Title level={4} style={{ marginBottom: 8, fontSize: '20px' }}>
              {title}
            </Title>
            <Paragraph 
              type="secondary" 
              style={{ 
                marginBottom: 12,
                fontSize: '14px',
                lineHeight: 1.4
              }}
            >
              {shortDescription}
            </Paragraph>
            <Text 
              strong 
              style={{ 
                fontSize: '18px',
                color: '#f59e0b',
                background: '#f0f9ff',
                padding: '4px 12px',
                borderRadius: '6px',
                display: 'inline-block'
              }}
            >
              {price}
            </Text>
          </Space>
          <Avatar 
            size={30} 
            style={{ 
              background: '#f0f9ff',
              color: '#0ea5e9',
              flexShrink: 0
            }}
            icon={<PlusOutlined />}
          />
        </Space>
      </Space>
    </Card>
  );
};

export default ServiceCard;
