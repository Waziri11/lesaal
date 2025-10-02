import React from 'react';
import TestimonialCard from './TestimonialCard';

/**
 * ServiceModal component for displaying detailed service information
 * @param {Object} props - Component props
 * @param {Object} props.service - Service data object
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close modal handler
 * @returns {JSX.Element|null} ServiceModal component or null if not open
 */
const ServiceModal = ({ service, isOpen, onClose }) => {
  if (!isOpen || !service) return null;

  const { 
    title, 
    price, 
    realImage, 
    fullDescription, 
    features, 
    testimonials 
  } = service;

  return (
    <div className="service-modal-overlay" onClick={onClose}>
      <div className="service-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-image">
            <img src={realImage} alt={title} />
          </div>
          <div className="modal-title-section">
            <h2>{title}</h2>
            <div className="modal-price">{price}</div>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-content">
          <div className="modal-description">
            <h3>Description</h3>
            <p>{fullDescription}</p>
          </div>

          <div className="modal-features">
            <h3>What's Included</h3>
            <div className="features-grid">
              {features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-testimonials">
            <h3>Client Feedback</h3>
            <div className="testimonials-grid">
              {testimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={index}
                  name={testimonial.name}
                  company={testimonial.company}
                  role={testimonial.role}
                  image={testimonial.image}
                  quote={testimonial.quote}
                />
              ))}
            </div>
          </div>

          <div className="modal-cta">
            <button className="modal-service-button">Get This Service</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;
