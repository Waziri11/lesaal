import React from 'react';

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
    <div className="testimonial-card">
      <div className="testimonial-header">
        <img 
          src={image} 
          alt={name}
          className="testimonial-avatar"
        />
        <div className="testimonial-info">
          <h4>{name}</h4>
          <p className="testimonial-company">{company}</p>
          <p className="testimonial-role">{role}</p>
        </div>
      </div>
      <div className="testimonial-quote">
        <span className="quote-icon">"</span>
        <p>{quote}</p>
      </div>
    </div>
  );
};

export default TestimonialCard;