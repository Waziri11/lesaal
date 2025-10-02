import React, { useState } from 'react';
import './ServicesPage.css';

const ServicesPage = () => {
  const [expandedCard, setExpandedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const services = [
    {
      id: 1,
      title: "Brand Design",
      shortDescription: "Complete brand identity and visual design",
      price: "TZS 100,000",
      image: "🎨",
      realImage: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&h=600&fit=crop",
      fullDescription: "We create comprehensive brand identities that resonate with your target audience. Our brand design service includes logo design, color palette development, typography selection, and brand guidelines that ensure consistency across all touchpoints.",
      features: ["Logo Design", "Brand Guidelines", "Color Palette", "Typography Selection", "Brand Strategy"],
      testimonials: [
        {
          name: "Sarah Johnson",
          company: "TechStart Solutions",
          role: "CEO",
          image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
          quote: "Amazing brand transformation! Lesaal Marketing completely rebranded our company and we've seen a 200% increase in brand recognition."
        },
        {
          name: "Michael Chen",
          company: "GrowthCo",
          role: "Founder",
          image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
          quote: "Professional and creative team. They understood our vision and delivered beyond our expectations."
        },
        {
          name: "Emily Rodriguez",
          company: "InnovateLab",
          role: "Marketing Director",
          image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
          quote: "Exceeded our expectations. The brand guidelines they created are now our company standard."
        }
      ]
    },
    {
      id: 2,
      title: "Social Media Management",
      shortDescription: "Complete social media strategy and management",
      price: "TZS 200,000",
      image: "📱",
      realImage: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop",
      fullDescription: "Our social media management service helps you build a strong online presence across all platforms. We create engaging content, manage your accounts, and grow your following with strategic campaigns.",
      features: ["Content Creation", "Account Management", "Community Engagement", "Analytics & Reporting", "Growth Strategy"],
      testimonials: [
        {
          name: "David Thompson",
          company: "RetailMax",
          role: "Digital Marketing Manager",
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
          quote: "Our engagement increased by 300% in just 3 months. Lesaal's social media strategy transformed our online presence completely."
        },
        {
          name: "Lisa Wang",
          company: "Fashion Forward",
          role: "Brand Manager",
          image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
          quote: "Professional content quality that perfectly represents our brand. Our followers love the content they create."
        },
        {
          name: "James Wilson",
          company: "LocalBiz",
          role: "Owner",
          image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
          quote: "Great customer service and consistent results. They've helped us build a strong community around our brand."
        }
      ]
    },
    {
      id: 3,
      title: "Content Creation Services",
      shortDescription: "High-quality content for all your marketing needs",
      price: "TZS 200,000",
      image: "✍️",
      realImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
      fullDescription: "We create compelling content that drives engagement and conversions. From blog posts to video content, our team produces high-quality materials that align with your brand voice and marketing goals.",
      features: ["Blog Writing", "Video Production", "Graphic Design", "Copywriting", "Content Strategy"],
      testimonials: [
        {
          name: "Maria Garcia",
          company: "ContentHub",
          role: "Content Director",
          image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
          quote: "Content quality is outstanding. Their writing team creates engaging content that resonates with our audience and drives conversions."
        },
        {
          name: "Robert Kim",
          company: "TechBlog Pro",
          role: "SEO Manager",
          image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
          quote: "Helped us rank higher on Google. Their SEO-optimized content strategy increased our organic traffic by 400%."
        },
        {
          name: "Amanda Foster",
          company: "Creative Agency",
          role: "Creative Director",
          image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face",
          quote: "Creative and engaging content that tells our story perfectly. They understand our brand voice and deliver consistently."
        }
      ]
    },
    {
      id: 4,
      title: "Data Scraping & Analysis",
      shortDescription: "Client and competitor data collection and analysis",
      price: "TZS 325,000",
      image: "📊",
      realImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
      fullDescription: "Gain valuable insights with our data scraping and analysis services. We collect and analyze client and competitor data to help you make informed business decisions and stay ahead of the competition.",
      features: ["Competitor Analysis", "Market Research", "Data Collection", "Insights & Reports", "Strategic Recommendations"],
      testimonials: [
        {
          name: "Dr. Jennifer Lee",
          company: "MarketIntel",
          role: "Research Director",
          image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
          quote: "Invaluable market insights that helped us identify new opportunities. Their data analysis gave us a competitive edge."
        },
        {
          name: "Thomas Anderson",
          company: "StartupVenture",
          role: "CEO",
          image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
          quote: "Helped us understand our competition better than ever. The competitor analysis was comprehensive and actionable."
        },
        {
          name: "Rachel Green",
          company: "DataDriven Co",
          role: "Analytics Manager",
          image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
          quote: "Data-driven approach that transformed our decision-making process. Their insights are always accurate and timely."
        }
      ]
    },
    {
      id: 5,
      title: "WhatsApp Lead Generation",
      shortDescription: "Generate qualified leads through WhatsApp marketing",
      price: "TZS 200,000",
      image: "💬",
      realImage: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=600&fit=crop",
      fullDescription: "Leverage WhatsApp's massive user base to generate qualified leads for your business. Our WhatsApp marketing strategies help you connect with potential customers and convert them into paying clients.",
      features: ["Campaign Setup", "Message Automation", "Lead Qualification", "Follow-up Sequences", "Conversion Tracking"],
      testimonials: [
        {
          name: "Ahmed Hassan",
          company: "E-commerce Plus",
          role: "Marketing Manager",
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
          quote: "Generated 500+ leads in first month using their WhatsApp marketing strategy. The ROI was incredible!"
        },
        {
          name: "Priya Patel",
          company: "Local Services Hub",
          role: "Business Owner",
          image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
          quote: "High conversion rates from WhatsApp campaigns. Their approach is personal and effective."
        },
        {
          name: "Carlos Mendez",
          company: "Tech Solutions",
          role: "Sales Director",
          image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
          quote: "Easy to use system that integrates seamlessly with our existing processes. Highly recommended!"
        }
      ]
    },
    {
      id: 6,
      title: "Email Lead Generation",
      shortDescription: "Build your email list and nurture leads",
      price: "TZS 200,000",
      image: "📧",
      realImage: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop",
      fullDescription: "Build a strong email list and nurture leads with our email marketing services. We create compelling campaigns that convert visitors into subscribers and subscribers into customers.",
      features: ["List Building", "Email Campaigns", "Automation", "A/B Testing", "Analytics"],
      testimonials: [
        {
          name: "Sophie Turner",
          company: "Digital Agency",
          role: "Email Marketing Specialist",
          image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
          quote: "Email list grew by 1000% in just 6 months. Their lead generation strategies are incredibly effective."
        },
        {
          name: "Marcus Johnson",
          company: "Online Store",
          role: "E-commerce Manager",
          image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
          quote: "Great open and click rates on all campaigns. Their email designs are professional and engaging."
        },
        {
          name: "Elena Rodriguez",
          company: "SaaS Startup",
          role: "Growth Manager",
          image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face",
          quote: "Professional campaigns that convert. They understand our audience and deliver results consistently."
        }
      ]
    },
    {
      id: 7,
      title: "Logo Design",
      shortDescription: "Professional logo design for your brand",
      price: "TZS 30,000",
      image: "🏷️",
      realImage: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop",
      fullDescription: "Get a professional logo that represents your brand perfectly. Our logo design service includes multiple concepts, revisions, and final files in all formats you need.",
      features: ["Multiple Concepts", "Unlimited Revisions", "All File Formats", "Brand Guidelines", "Commercial Rights"],
      testimonials: ["Love our new logo!", "Quick turnaround", "Affordable and professional"]
    },
    {
      id: 8,
      title: "Search Engine Optimization",
      shortDescription: "Improve your website's search engine rankings",
      price: "TZS 300,000",
      image: "🔍",
      realImage: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800&h=600&fit=crop",
      fullDescription: "Boost your website's visibility in search engines with our comprehensive SEO services. We optimize your site for better rankings, increased traffic, and higher conversions.",
      features: ["Keyword Research", "On-Page SEO", "Technical SEO", "Link Building", "Performance Monitoring"],
      testimonials: ["Ranked #1 for our main keywords", "Traffic increased by 400%", "Great ROI"]
    },
    {
      id: 9,
      title: "Web Design",
      shortDescription: "Modern, responsive website design",
      price: "TZS 100,000",
      image: "💻",
      realImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
      fullDescription: "Get a modern, responsive website that converts visitors into customers. Our web design service focuses on user experience, mobile optimization, and conversion rate optimization.",
      features: ["Responsive Design", "User Experience", "Mobile Optimization", "Fast Loading", "SEO Ready"],
      testimonials: ["Beautiful and functional website", "Great user experience", "Mobile-friendly"]
    },
    {
      id: 10,
      title: "Mobile App Design",
      shortDescription: "User-friendly mobile app interface design",
      price: "TZS 100,000",
      image: "📱",
      realImage: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop",
      fullDescription: "Create intuitive and engaging mobile app interfaces that users love. Our mobile app design service focuses on usability, aesthetics, and platform-specific guidelines.",
      features: ["UI/UX Design", "Prototyping", "User Testing", "Platform Guidelines", "Design System"],
      testimonials: ["Intuitive app design", "Great user feedback", "Professional quality"]
    },
    {
      id: 11,
      title: "Paid Ads Management",
      shortDescription: "Manage your paid advertising campaigns",
      price: "TZS 100,000",
      image: "📢",
      realImage: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop",
      fullDescription: "Maximize your advertising ROI with our paid ads management service. We create and optimize campaigns across Google, Facebook, Instagram, and other platforms to drive qualified traffic and conversions.",
      features: ["Campaign Setup", "Ad Creation", "Bid Management", "A/B Testing", "Performance Optimization"],
      testimonials: ["ROI improved by 250%", "Lower cost per acquisition", "Professional management"]
    },
    {
      id: 12,
      title: "Event Creation",
      shortDescription: "Plan and execute successful marketing events",
      price: "TZS 500,000",
      image: "🎉",
      realImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop",
      fullDescription: "Create memorable marketing events that engage your audience and drive business results. From planning to execution, we handle every aspect of your event marketing.",
      features: ["Event Planning", "Venue Management", "Marketing Materials", "Digital Promotion", "Post-Event Analysis"],
      testimonials: ["Successful event with 500+ attendees", "Great organization", "Exceeded expectations"]
    },
    {
      id: 13,
      title: "Physical Marketing Campaign",
      shortDescription: "Traditional marketing campaigns for local reach",
      price: "TZS 500,000",
      image: "📋",
      realImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
      fullDescription: "Reach your local audience with effective physical marketing campaigns. We create and execute traditional marketing strategies including print ads, billboards, and promotional materials.",
      features: ["Print Advertising", "Billboard Design", "Promotional Materials", "Local Distribution", "Campaign Tracking"],
      testimonials: ["Great local visibility", "Professional materials", "Effective reach"]
    },
    {
      id: 14,
      title: "Business Cards (100 pcs)",
      shortDescription: "Professional business card design and printing",
      price: "TZS 50,000",
      image: "💳",
      realImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
      fullDescription: "Make a lasting impression with professionally designed and printed business cards. We create eye-catching designs that reflect your brand and help you network effectively.",
      features: ["Custom Design", "High-Quality Printing", "Multiple Finishes", "Fast Delivery", "Bulk Pricing"],
      testimonials: ["Professional quality cards", "Great design", "Fast delivery"]
    },
    {
      id: 15,
      title: "Signage",
      shortDescription: "Custom signage for your business",
      price: "TBD",
      image: "🚪",
      realImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
      fullDescription: "Create impactful signage that attracts customers and reinforces your brand. From storefront signs to interior displays, we design and produce signage that makes a statement.",
      features: ["Custom Design", "Multiple Materials", "Installation", "Maintenance", "Brand Consistency"],
      testimonials: ["Eye-catching signage", "Great visibility", "Professional installation"]
    },
    {
      id: 16,
      title: "Web Development",
      shortDescription: "Custom website development and programming",
      price: "TBD",
      image: "⚙️",
      realImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
      fullDescription: "Get a fully functional, custom website built to your specifications. Our web development service includes frontend and backend development, database integration, and ongoing maintenance.",
      features: ["Custom Development", "Database Integration", "API Development", "Security", "Maintenance"],
      testimonials: ["Fully functional website", "Great performance", "Ongoing support"]
    },
    {
      id: 17,
      title: "Mobile App Development",
      shortDescription: "Native and cross-platform mobile app development",
      price: "TBD",
      image: "📲",
      realImage: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop",
      fullDescription: "Bring your app idea to life with our mobile app development service. We create native and cross-platform apps that provide excellent user experience and performance.",
      features: ["Native Development", "Cross-Platform", "App Store Optimization", "Testing", "Maintenance"],
      testimonials: ["Smooth app performance", "Great user experience", "Professional development"]
    },
    {
      id: 18,
      title: "Marketing Advisory Session",
      shortDescription: "Expert marketing consultation and strategy",
      price: "TZS 50,000",
      image: "💡",
      realImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
      fullDescription: "Get expert marketing advice tailored to your business needs. Our marketing advisory sessions help you develop strategies, identify opportunities, and overcome marketing challenges.",
      features: ["Strategy Development", "Market Analysis", "Competitive Research", "Action Plan", "Follow-up Support"],
      testimonials: ["Valuable insights", "Clear action plan", "Expert advice"]
    }
  ];

  const toggleCard = (cardId) => {
    setExpandedCard(cardId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setExpandedCard(null);
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
            <p>We have a team of experts that we will be working together with for your business and setting goals that will be attained in the given time. The pricing includes a monthly fee with discounts for returning customers or for advance multi-month payments.</p>
          </div>

          <div className="services-grid">
            {services.map((service) => (
              <div 
                key={service.id} 
                className="service-card"
                onClick={() => toggleCard(service.id)}
              >
                <div className="service-card-header">
                  <div className="service-image">{service.image}</div>
                  <div className="service-info">
                    <h3>{service.title}</h3>
                    <p className="service-description">{service.shortDescription}</p>
                    <div className="service-price">{service.price}</div>
                  </div>
                  <div className="expand-icon">+</div>
                </div>
              </div>
            ))}
          </div>

          {/* Full Screen Modal */}
          {isModalOpen && expandedCard && (
            <div className="service-modal-overlay" onClick={closeModal}>
              <div className="service-modal" onClick={(e) => e.stopPropagation()}>
                {(() => {
                  const service = services.find(s => s.id === expandedCard);
                  return service ? (
                    <>
                      <div className="modal-header">
                        <div className="modal-image">
                          <img src={service.realImage} alt={service.title} />
                        </div>
                        <div className="modal-title-section">
                          <h2>{service.title}</h2>
                          <div className="modal-price">{service.price}</div>
                          <button className="close-button" onClick={closeModal}>×</button>
                        </div>
                      </div>

                      <div className="modal-content">
                        <div className="modal-description">
                          <h3>Description</h3>
                          <p>{service.fullDescription}</p>
                        </div>

                        <div className="modal-features">
                          <h3>What's Included</h3>
                          <div className="features-grid">
                            {service.features.map((feature, index) => (
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
                            {service.testimonials.map((testimonial, index) => (
                              <div key={index} className="testimonial-card">
                                <div className="testimonial-header">
                                  <img 
                                    src={testimonial.image} 
                                    alt={testimonial.name}
                                    className="testimonial-avatar"
                                  />
                                  <div className="testimonial-info">
                                    <h4>{testimonial.name}</h4>
                                    <p className="testimonial-company">{testimonial.company}</p>
                                    <p className="testimonial-role">{testimonial.role}</p>
                                  </div>
                                </div>
                                <div className="testimonial-quote">
                                  <span className="quote-icon">"</span>
                                  <p>{testimonial.quote}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="modal-cta">
                          <button className="modal-service-button">Get This Service</button>
                        </div>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
