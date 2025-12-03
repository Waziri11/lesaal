import React from 'react';
import { Card, Avatar, Typography, Space } from 'antd';

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
  return (
    <Card
      hoverable
      style={{
        borderLeft: '4px solid #0ea5e9',
        borderRadius: '12px'
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space>
          <Avatar 
            src={image} 
            size={60}
            style={{ border: '3px solid #0ea5e9' }}
          />
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '16px' }}>{name}</Text>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 600 }}>
              {company}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {role}
            </Text>
          </Space>
        </Space>
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <Text 
            style={{ 
              fontSize: '32px',
              color: '#0ea5e9',
              fontWeight: 'bold',
              position: 'absolute',
              top: -8,
              left: 0
            }}
          >
            "
          </Text>
          <Paragraph 
            italic 
            style={{ 
              marginTop: 8,
              fontSize: '14px',
              lineHeight: 1.5,
              color: 'var(--text-secondary)'
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
