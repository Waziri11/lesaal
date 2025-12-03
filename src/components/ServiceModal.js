import React from 'react';
import { Modal, Typography, Row, Col, Card, Space, Button, Tag, Divider } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import TestimonialCard from './TestimonialCard';
import { useTheme } from '../ThemeContext';

const { Title, Paragraph, Text } = Typography;

/**
 * ServiceModal component for displaying detailed service information
 * @param {Object} props - Component props
 * @param {Object} props.service - Service data object
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close modal handler
 * @returns {JSX.Element|null} ServiceModal component or null if not open
 */
const ServiceModal = ({ service, isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  
  if (!service) return null;

  const { 
    title, 
    price, 
    realImage, 
    fullDescription, 
    features, 
    testimonials 
  } = service;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={1200}
      closeIcon={<CloseOutlined style={{ fontSize: '20px' }} />}
      styles={{
        body: { padding: 0, maxHeight: '90vh', overflowY: 'auto' },
        content: { borderRadius: '24px', overflow: 'hidden' }
      }}
      style={{ top: 20 }}
    >
      <Row gutter={0}>
        <Col xs={24} md={12}>
          <div style={{
            width: '100%',
            height: '500px',
            overflow: 'hidden',
            background: isDarkMode ? '#1a1a1a' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src={realImage}
              alt={title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `<div style="font-size: 64px; color: ${isDarkMode ? '#475569' : '#cbd5e1'}">${service.image || '📦'}</div>`;
              }}
            />
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div style={{ 
            padding: '48px', 
            position: 'relative',
            background: isDarkMode ? '#0a0a0a' : '#ffffff',
            height: '500px',
            overflowY: 'auto'
          }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={2} style={{ marginBottom: 16, fontSize: '32px', fontWeight: 700 }}>
                  {title}
                </Title>
                <Tag 
                  color="orange" 
                  style={{ 
                    fontSize: '20px',
                    fontWeight: 600,
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none'
                  }}
                >
                  {price}
                </Tag>
              </div>
              
              <Divider style={{ margin: '24px 0' }} />
              
              <div>
                <Title level={4} style={{ marginBottom: 16, fontSize: '18px', fontWeight: 600 }}>
                  Description
                </Title>
                <Paragraph style={{ 
                  fontSize: '16px', 
                  lineHeight: 1.7,
                  color: isDarkMode ? '#cbd5e1' : '#475569',
                  margin: 0
                }}>
                  {fullDescription}
                </Paragraph>
              </div>

              <div>
                <Title level={4} style={{ marginBottom: 16, fontSize: '18px', fontWeight: 600 }}>
                  What's Included
                </Title>
                <Row gutter={[12, 12]}>
                  {features.map((feature, index) => (
                    <Col xs={24} sm={12} key={index}>
                      <Card 
                        size="small"
                        style={{
                          borderLeft: '4px solid #f59e0b',
                          borderRadius: '8px',
                          background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                          border: 'none'
                        }}
                        bodyStyle={{ padding: '12px 16px' }}
                      >
                        <Space size="small">
                          <CheckOutlined style={{ color: '#f59e0b' }} />
                          <Text style={{ fontSize: '14px' }}>{feature}</Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>

              {testimonials && testimonials.length > 0 && (
                <div>
                  <Title level={4} style={{ marginBottom: 16, fontSize: '18px', fontWeight: 600 }}>
                    Client Feedback
                  </Title>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {testimonials.slice(0, 2).map((testimonial, index) => (
                      <TestimonialCard
                        key={index}
                        name={testimonial.name}
                        company={testimonial.company}
                        role={testimonial.role}
                        image={testimonial.image}
                        quote={testimonial.quote}
                      />
                    ))}
                  </Space>
                </div>
              )}

              <div style={{ paddingTop: '24px', borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}` }}>
                <Button 
                  type="primary" 
                  size="large"
                  block
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                    border: 'none',
                    height: '52px',
                    fontSize: '18px',
                    fontWeight: 600,
                    boxShadow: '0 8px 24px rgba(14, 165, 233, 0.3)'
                  }}
                >
                  Get This Service
                </Button>
              </div>
            </Space>
          </div>
        </Col>
      </Row>
    </Modal>
  );
};

export default ServiceModal;
