import React from 'react';
import { Card, Typography, Space, Avatar, Tag } from 'antd';
import { PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useTheme } from '../ThemeContext';

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
  const { isDarkMode } = useTheme();

  return (
    <Card
      hoverable
      onClick={() => onClick(service)}
      style={{
        cursor: 'pointer',
        height: '100%',
        borderRadius: '20px',
        border: 'none',
        background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease'
      }}
      bodyStyle={{ padding: '32px' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space size="middle" style={{ width: '100%', alignItems: 'flex-start' }}>
          <Avatar 
            size={64} 
            style={{ 
              fontSize: '36px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #f59e0b 100%)',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
            }}
          >
            {image}
          </Avatar>
          <Space direction="vertical" size="small" style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, fontSize: '22px', fontWeight: 600, lineHeight: 1.3 }}>
              {title}
            </Title>
            <Paragraph 
              type="secondary" 
              style={{ 
                margin: 0,
                fontSize: '15px',
                lineHeight: 1.6,
                color: isDarkMode ? '#94a3b8' : '#64748b'
              }}
              ellipsis={{ rows: 2 }}
            >
              {shortDescription}
            </Paragraph>
          </Space>
        </Space>
        
        <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tag 
            color="orange"
            style={{ 
              fontSize: '18px',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '8px',
              margin: 0,
              border: 'none'
            }}
          >
            {price}
          </Tag>
          <Avatar 
            size={36} 
            style={{ 
              background: 'linear-gradient(135deg, #0ea5e9 0%, #f59e0b 100%)',
              color: '#fff',
              flexShrink: 0
            }}
            icon={<ArrowRightOutlined />}
          />
        </Space>
      </Space>
    </Card>
  );
};

export default ServiceCard;
