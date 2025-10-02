import React, { useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider, useTheme } from './ThemeContext';
import ServicesPage from './ServicesPage';

function AppContent() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (currentPage === 'services') {
    return (
      <div className="App">
        {/* Header */}
        <header className="header">
          <div className="container">
            <div className="nav">
              <div className="logo" onClick={() => setCurrentPage('home')} style={{cursor: 'pointer'}}>
                <span className="logo-arrow">&gt;</span>
                <span className="logo-main">LESAAL</span>
                <span className="logo-sub">MARKETING</span>
              </div>
              <nav className="nav-links">
                <button 
                  className="nav-link-button" 
                  onClick={() => setCurrentPage('home')}
                >
                  ← BACK TO HOME
                </button>
              </nav>
              <button className="theme-toggle" onClick={toggleTheme}>
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </header>
        <ServicesPage />
      </div>
    );
  }

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="nav">
            <div className="logo">
              <span className="logo-arrow">&gt;</span>
              <span className="logo-main">LESAAL</span>
              <span className="logo-sub">MARKETING</span>
            </div>
            <nav className="nav-links">
              <a href="#work">OUR WORK</a>
              <button 
                className="nav-link-button" 
                onClick={() => setCurrentPage('services')}
              >
                ALL SERVICES
              </button>
              <a href="#social">SOCIAL MEDIA</a>
              <a href="#website">WEBSITE & SEO</a>
              <a href="#linkedin">LINKEDIN</a>
              <a href="#blogs">BLOGS ↓</a>
            </nav>
            <button className="theme-toggle" onClick={toggleTheme}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button className="cta-button">LET'S TALK</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>
                Turning <span className="highlight">online</span> attention into paying <span className="highlight">customers</span>
              </h1>
              <p>
                Likes don't pay the bills. Opportunities do. We help your business turn its online presence into a client magnet. 
                No corporate red tape. No hype marketing. Just real momentum.
              </p>
              <div className="benefits-list">
                <div className="benefit-item">
                  <span className="checkmark">✓</span>
                  <span>Turn social reach into qualified leads</span>
                </div>
                <div className="benefit-item">
                  <span className="checkmark">✓</span>
                  <span>Get a website that works as hard as you do</span>
                </div>
                <div className="benefit-item">
                  <span className="checkmark">✓</span>
                  <span>Earn authority in your market</span>
                </div>
              </div>
              <button className="hero-cta">
                Work with Us <span className="arrow">↗</span>
              </button>
            </div>
            <div className="hero-illustration">
              <div className="illustration-elements">
                <div className="tree"></div>
                <div className="cloud"></div>
                <div className="person"></div>
                <div className="social-icons">
                  <div className="social-icon facebook">f</div>
                  <div className="social-icon pinterest">P</div>
                  <div className="social-icon linkedin">in</div>
                  <div className="social-icon instagram">📷</div>
                  <div className="social-icon twitter">🐦</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className="problems-section" id="problems">
        <div className="container">
          <h2>What <span className="highlight">problems</span> do we <span className="highlight">solve</span>?</h2>
          <p>We fix marketing problems that <strong>cost you</strong> a name, sales, and customers online.</p>
          
          <div className="problems-grid">
            <div className="problem-card green">
              <div className="problem-icon">📱</div>
              <h3>Your social media feels like a ghost town</h3>
              <p>Your posts get ignored, and engagement is dead. We fix that with smart, persuasive content that grabs attention and sparks conversations.</p>
            </div>
            
            <div className="problem-card blue">
              <div className="problem-icon">🧲</div>
              <h3>Leads aren't consistently flowing in</h3>
              <p>Relying on referrals is risky. We help you create an online presence that attracts the right customers—so you're no longer waiting and hoping.</p>
            </div>
            
            <div className="problem-card green">
              <div className="problem-icon">📊</div>
              <h3>Marketing feels like a full-time job</h3>
              <p>Digital marketing is a daily game—you pause, you lose! Don't let time or lack of expertise hold you back. Outsource to us, and we'll keep you consistent.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="solutions-section" id="solutions">
        <div className="container">
          <h2>What we <span className="highlight">make happen</span></h2>
          <p>We don't sell tactics. We move the numbers that matter.</p>
          
          <div className="solutions-grid">
            <div className="solution-card">
              <div className="solution-image leads"></div>
              <h3>Get More Leads</h3>
            </div>
            
            <div className="solution-card">
              <div className="solution-image sales"></div>
              <h3>Sell More Online</h3>
            </div>
            
            <div className="solution-card">
              <div className="solution-image brand"></div>
              <h3>Build a Personal Brand</h3>
            </div>
            
            <div className="solution-card">
              <div className="solution-image clarity"></div>
              <h3>Gain Strategic Clarity</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section" id="testimonials">
        <div className="container">
          <h2>Real businesses. <span className="highlight">Real results</span></h2>
          <p>We've helped 30+ SMEs and 100s of Personal Brands.</p>
          
          <div className="client-logos">
            <div className="logo-item">Client 1</div>
            <div className="logo-item">Client 2</div>
            <div className="logo-item">Client 3</div>
            <div className="logo-item">Client 4</div>
            <div className="logo-item">Client 5</div>
            <div className="logo-item">Client 6</div>
            <div className="logo-item">Client 7</div>
          </div>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar"></div>
                <div className="testimonial-info">
                  <h4>Sarah Johnson</h4>
                  <p>CEO, TechStart Solutions</p>
                  <span className="testimonial-date">2 weeks ago</span>
                </div>
              </div>
              <div className="testimonial-content">
                <p>"Lesaal Marketing transformed our online presence completely. Our lead generation increased by 300% in just 3 months. Their strategic approach and consistent execution made all the difference."</p>
              </div>
              <div className="testimonial-source">As seen on LinkedIn</div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar"></div>
                <div className="testimonial-info">
                  <h4>Michael Chen</h4>
                  <p>Founder, GrowthCo</p>
                  <span className="testimonial-date">1 month ago</span>
                </div>
              </div>
              <div className="testimonial-content">
                <p>"Working with Lesaal Marketing was a game-changer. They understood our business goals and delivered results that exceeded our expectations. Highly recommend their services!"</p>
              </div>
              <div className="testimonial-source">As seen on LinkedIn</div>
            </div>
          </div>

          <div className="testimonial-quotes">
            <div className="quote-item">
              <div className="quote-icon">„</div>
              <h3>Took the burden off</h3>
              <p>Lesaal took over our content and made sure we consistently delivered value to our audience.</p>
            </div>
            
            <div className="quote-item">
              <div className="quote-icon">„</div>
              <h3>Worth every penny</h3>
              <p>I was one of Lesaal's early clients. They redesigned my website and transformed my online presence completely.</p>
            </div>
            
            <div className="quote-item">
              <div className="quote-icon">„</div>
              <h3>Highly recommend</h3>
              <p>Hear it from me, Lesaal Marketing gets how to sell online. No "sales pitch" - just real results.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="success-stories" id="work">
        <div className="container">
          <div className="section-header">
            <h3>Our Work</h3>
            <h2>Success Stories</h2>
          </div>
          
          <div className="stories-grid">
            <div className="story-card">
              <div className="story-image team"></div>
              <div className="story-content">
                <p>We revamped the Foundation's website for speed & SEO</p>
              </div>
            </div>
            
            <div className="story-card">
              <div className="story-image growth"></div>
              <div className="story-content">
                <p>How Lesaal grew Company's social media by 95,000+ reach</p>
              </div>
            </div>
            
            <div className="story-card">
              <div className="story-image engagement"></div>
              <div className="story-content">
                <p>Boosted Client's engagement with a new content strategy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="why-us" id="how">
        <div className="container">
          <div className="why-content">
            <div className="why-text">
              <h2>How we work to get you up and <span className="highlight">attracting customers</span></h2>
              <p>
                We start by understanding your business. Your problem, your dream customers, and what sets you apart. 
                Then, we craft a content strategy designed to increase your chances of being the first choice when your service is needed. 
                We track results, refine strategies, and keep building momentum.
              </p>
              <button className="why-cta">
                Work with Us <span className="arrow">↗</span>
              </button>
            </div>
            <div className="why-illustration">
              <div className="illustration-person"></div>
              <div className="illustration-block"></div>
              <div className="illustration-arrow">→</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Lesaal Section */}
      <section className="why-lesaal" id="why">
        <div className="container">
          <h2>Why <span className="highlight">Lesaal Marketing</span>?</h2>
          <p>We're not a bloated agency chasing big-name clients. We're built for hands-on business owners who want real results without corporate nonsense.</p>
          
          <div className="benefits-list">
            <div className="benefit-item">
              <span className="checkmark">✓</span>
              <span>We cut through the noise – No jargon, no buzzwords—just marketing that works.</span>
            </div>
            <div className="benefit-item">
              <span className="checkmark">✓</span>
              <span>You work directly with decision-makers – No middle managers. No layers of approvals. Just fast, effective execution.</span>
            </div>
            <div className="benefit-item">
              <span className="checkmark">✓</span>
              <span>We walk the talk – Ranked on Google. Dominating social media. Building real authority.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta" id="contact">
        <div className="container">
          <div className="cta-content">
            <h2>Stop losing business to bad marketing</h2>
            <p>If you're not investing in digital marketing, you're already paying for it—in lost customers and missed opportunities. Let's fix that.</p>
            <a href="mailto:hello@lesaalmarketing.com" className="final-cta-button">
              Work With Us →
            </a>
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button className="scroll-top" onClick={scrollToTop}>
          ↑
        </button>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;