import React from 'react';
import { Card, Avatar, Typography, Space } from 'antd';
import { useTheme } from '../ThemeContext';

const { Paragraph, Text } = Typography;

/**
 * TestimonialCard component for displaying client testimonials
 * @param {Object} props - Component props
 * @param {string} props.name - Client name
 * @param {string} props.company - Client company
 * @param {string} props.role - Client role/position
 * @param {string} props.image - Client profile image URL
 * @param {string} props.quote - Testimonial quote
 * @returns {JSX.Element} TestimonialCard component
 */
const TestimonialCard = ({ name, company, role, image, quote }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <Card
      style={{
        borderLeft: '4px solid #0ea5e9',
        borderRadius: '12px',
        background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
        border: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space size="middle">
          <Avatar 
            src={image} 
            size={56}
            style={{ 
              border: '3px solid #0ea5e9',
              flexShrink: 0
            }}
            onError={() => {
              // Fallback to initials if image fails
              return false;
            }}
          >
            {name.split(' ').map(n => n[0]).join('')}
          </Avatar>
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>{name}</Text>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 600, display: 'block' }}>
              {company}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
              {role}
            </Text>
          </Space>
        </Space>
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <Text 
            style={{ 
              fontSize: '36px',
              color: '#0ea5e9',
              fontWeight: 'bold',
              position: 'absolute',
              top: -8,
              left: 0,
              lineHeight: 1
            }}
          >
            "
          </Text>
          <Paragraph 
            italic 
            style={{ 
              marginTop: 8,
              fontSize: '15px',
              lineHeight: 1.6,
              color: isDarkMode ? '#cbd5e1' : '#475569',
              margin: 0
            }}
          >
            {quote}
          </Paragraph>
        </div>
      </Space>
    </Card>
  );
};

export default TestimonialCard;
