import React from 'react';
import { servicesData } from './data/servicesData';
import { useModal } from './hooks';
import { ServiceCard, ServiceModal } from './components';
import './styles/ServicesPage.css';

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
    <div className="services-page">
      <div className="services-hero">
        <div className="container">
          <h1>Our Services</h1>
          <p>Comprehensive marketing solutions to grow your business</p>
        </div>
      </div>

      <div className="services-content">
        <div className="container">
          <div className="services-intro">
            <h2>What We Offer</h2>
            <p>
              We have a team of experts that we will be working together with for your business 
              and setting goals that will be attained in the given time. The pricing includes a 
              monthly fee with discounts for returning customers or for advance multi-month payments.
            </p>
          </div>

          <div className="services-grid">
            {servicesData.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onClick={handleServiceClick}
              />
            ))}
          </div>

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