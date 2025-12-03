import React from 'react';
import { Modal, Typography, Row, Col, Card, Space, Button, Tag } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import TestimonialCard from './TestimonialCard';

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
      styles={{
        body: { padding: 0, maxHeight: '90vh', overflowY: 'auto' }
      }}
      style={{ top: 20 }}
    >
      <Row gutter={0}>
        <Col xs={24} md={12}>
          <div style={{
            width: '100%',
            height: '400px',
            overflow: 'hidden'
          }}>
            <img
              src={realImage}
              alt={title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div style={{ padding: '24px', position: 'relative' }}>
            <Title level={2} style={{ marginBottom: 16, fontSize: '32px' }}>
              {title}
            </Title>
            <Tag 
              color="orange" 
              style={{ 
                fontSize: '20px',
                padding: '8px 16px',
                marginBottom: 24
              }}
            >
              {price}
            </Tag>
            
            <div style={{ marginBottom: 32 }}>
              <Title level={4} style={{ marginBottom: 16 }}>Description</Title>
              <Paragraph style={{ fontSize: '16px', lineHeight: 1.6 }}>
                {fullDescription}
              </Paragraph>
            </div>

            <div style={{ marginBottom: 32 }}>
              <Title level={4} style={{ marginBottom: 16 }}>What's Included</Title>
              <Row gutter={[16, 16]}>
                {features.map((feature, index) => (
                  <Col xs={24} sm={12} key={index}>
                    <Card 
                      size="small"
                      style={{
                        borderLeft: '4px solid #f59e0b',
                        borderRadius: '8px'
                      }}
                    >
                      <Space>
                        <CheckOutlined style={{ color: '#f59e0b' }} />
                        <Text>{feature}</Text>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>

            <div style={{ marginBottom: 32 }}>
              <Title level={4} style={{ marginBottom: 16 }}>Client Feedback</Title>
              <Row gutter={[16, 16]}>
                {testimonials.map((testimonial, index) => (
                  <Col xs={24} key={index}>
                    <TestimonialCard
                      name={testimonial.name}
                      company={testimonial.company}
                      role={testimonial.role}
                      image={testimonial.image}
                      quote={testimonial.quote}
                    />
                  </Col>
                ))}
              </Row>
            </div>

            <div style={{ textAlign: 'center', paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
              <Button 
                type="primary" 
                size="large"
                style={{
                  background: '#0ea5e9',
                  borderColor: '#0ea5e9',
                  height: '48px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  padding: '0 32px'
                }}
              >
                Get This Service
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </Modal>
  );
};

export default ServiceModal;
