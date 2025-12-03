import React from 'react';
import { Typography, Row, Col, Space } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { servicesData } from './data/servicesData';
import { useModal } from './hooks';
import { ServiceCard, ServiceModal } from './components';
import { useTheme } from './ThemeContext';
import './styles/ServicesPage.css';

const { Title, Paragraph } = Typography;

/**
 * ServicesPage component - Main page displaying all services
 * @returns {JSX.Element} ServicesPage component
 */
const ServicesPage = () => {
  const { isOpen, selectedItem, openModal, closeModal } = useModal();
  const { isDarkMode } = useTheme();

  /**
   * Handle service card click
   * @param {Object} service - Selected service data
   */
  const handleServiceClick = (service) => {
    openModal(service);
  };

  return (
    <div style={{ minHeight: '100vh', background: isDarkMode ? '#0a0a0a' : '#fafafa' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #f59e0b 100%)',
        color: '#fff',
        padding: '160px 48px 120px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          transform: 'translate(30%, -30%)'
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Space direction="vertical" size="large" align="center">
            <RocketOutlined style={{ fontSize: '64px', color: '#fff' }} />
            <Title level={1} style={{ color: '#fff', fontSize: 'clamp(40px, 5vw, 64px)', margin: 0, fontWeight: 700 }}>
              Our Services
            </Title>
            <Paragraph style={{ color: '#fff', fontSize: '22px', opacity: 0.95, maxWidth: 600, margin: 0 }}>
              Comprehensive marketing solutions to grow your business
            </Paragraph>
          </Space>
        </div>
      </div>

      <div style={{ padding: '120px 48px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80, maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
            <Title level={2} style={{ fontSize: 'clamp(32px, 4vw, 48px)', marginBottom: 24, fontWeight: 700 }}>
              What We Offer
            </Title>
            <Paragraph style={{ fontSize: '18px', lineHeight: 1.7, color: isDarkMode ? '#cbd5e1' : '#64748b' }}>
              We have a team of experts that we will be working together with for your business 
              and setting goals that will be attained in the given time. The pricing includes a 
              monthly fee with discounts for returning customers or for advance multi-month payments.
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            {servicesData.map((service) => (
              <Col key={service.id} xs={24} sm={12} lg={8}>
                <ServiceCard
                  service={service}
                  onClick={handleServiceClick}
                />
              </Col>
            ))}
          </Row>

          <ServiceModal
            service={selectedItem}
            isOpen={isOpen}
            onClose={closeModal}
          />
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
