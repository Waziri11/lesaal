import React from 'react';
import { Typography, Row, Col } from 'antd';
import { servicesData } from './data/servicesData';
import { useModal } from './hooks';
import { ServiceCard, ServiceModal } from './components';
import './styles/ServicesPage.css';

const { Title, Paragraph } = Typography;

/**
 * ServicesPage component - Main page displaying all services
 * @returns {JSX.Element} ServicesPage component
 */
const ServicesPage = () => {
  const { isOpen, selectedItem, openModal, closeModal } = useModal();

  /**
   * Handle service card click
   * @param {Object} service - Selected service data
   */
  const handleServiceClick = (service) => {
    openModal(service);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #f59e0b 100%)',
        color: '#fff',
        padding: '120px 24px 80px',
        textAlign: 'center'
      }}>
        <Title level={1} style={{ color: '#fff', fontSize: '56px', marginBottom: 16 }}>
          Our Services
        </Title>
        <Paragraph style={{ color: '#fff', fontSize: '20px', opacity: 0.9 }}>
          Comprehensive marketing solutions to grow your business
        </Paragraph>
      </div>

      <div style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48, maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
            <Title level={2} style={{ fontSize: '40px', marginBottom: 24 }}>
              What We Offer
            </Title>
            <Paragraph style={{ fontSize: '18px', lineHeight: 1.6 }}>
              We have a team of experts that we will be working together with for your business 
              and setting goals that will be attained in the given time. The pricing includes a 
              monthly fee with discounts for returning customers or for advance multi-month payments.
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
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