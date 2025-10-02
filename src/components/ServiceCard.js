import React from 'react';

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
    <div 
      className="service-card"
      onClick={() => onClick(service)}
    >
      <div className="service-card-header">
        <div className="service-image">{image}</div>
        <div className="service-info">
          <h3>{title}</h3>
          <p className="service-description">{shortDescription}</p>
          <div className="service-price">{price}</div>
        </div>
        <div className="expand-icon">+</div>
      </div>
    </div>
  );
};

export default ServiceCard;
