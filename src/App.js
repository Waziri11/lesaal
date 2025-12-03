import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Typography, Button, Card, Row, Col, Space, Avatar, FloatButton, theme, Badge, Statistic, Divider } from 'antd';
import { BulbOutlined, SunOutlined, ArrowUpOutlined, ArrowRightOutlined, CheckCircleOutlined, RocketOutlined, TrophyOutlined, TeamOutlined, ThunderboltOutlined, StarOutlined } from '@ant-design/icons';
import { ThemeProvider, useTheme } from './ThemeContext';
import ServicesPage from './ServicesPage';
import './styles/App.css';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;
const { darkAlgorithm } = theme;

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (currentPage === 'services') {
    return (
      <ConfigProvider theme={isDarkMode ? { algorithm: darkAlgorithm } : {}}>
        <Layout style={{ minHeight: '100vh', background: isDarkMode ? '#0a0a0a' : '#fafafa' }}>
          <Header style={{ 
            position: 'fixed', 
            top: 0, 
            width: '100%', 
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 48px',
            background: isDarkMode ? 'rgba(10, 10, 10, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`
          }}>
            <Button 
              type="text" 
              style={{ fontSize: '20px', fontWeight: 700, padding: 0, height: 'auto' }}
                  onClick={() => setCurrentPage('home')}
                >
              <Text style={{ color: '#f59e0b', fontSize: '24px' }}>›</Text>
              <Text style={{ marginLeft: 8 }}>LESAAL</Text>
              <Text type="secondary" style={{ fontSize: '14px', marginLeft: 8, fontWeight: 400 }}>MARKETING</Text>
            </Button>
            <Space size="large">
              <Button type="text" onClick={() => setCurrentPage('home')} style={{ fontWeight: 500 }}>
                ← Back to Home
              </Button>
              <Button 
                type="text" 
                icon={isDarkMode ? <SunOutlined /> : <BulbOutlined />}
                onClick={toggleTheme}
                style={{ fontSize: '18px' }}
              />
            </Space>
          </Header>
          <Content style={{ marginTop: 80 }}>
        <ServicesPage />
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={isDarkMode ? { algorithm: darkAlgorithm } : {}}>
      <Layout style={{ minHeight: '100vh', background: isDarkMode ? '#0a0a0a' : '#ffffff' }}>
        <Header style={{ 
          position: 'fixed', 
          top: 0, 
          width: '100%', 
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
          background: isDarkMode ? 'rgba(10, 10, 10, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`
        }}>
          <Button 
            type="text" 
            style={{ fontSize: '20px', fontWeight: 700, padding: 0, height: 'auto' }}
          >
            <Text style={{ color: '#f59e0b', fontSize: '24px' }}>›</Text>
            <Text style={{ marginLeft: 8 }}>LESAAL</Text>
            <Text type="secondary" style={{ fontSize: '14px', marginLeft: 8, fontWeight: 400 }}>MARKETING</Text>
          </Button>
          <Space size="middle" wrap>
            <Button type="text" href="#work" style={{ fontWeight: 500 }}>Our Work</Button>
            <Button type="text" onClick={() => setCurrentPage('services')} style={{ fontWeight: 500 }}>Services</Button>
            <Button type="text" href="#testimonials" style={{ fontWeight: 500 }}>Testimonials</Button>
            <Button 
              type="text" 
              icon={isDarkMode ? <SunOutlined /> : <BulbOutlined />}
              onClick={toggleTheme}
              style={{ fontSize: '18px' }}
            />
            <Button 
              type="primary" 
              style={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                border: 'none',
                height: '40px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}
            >
              Let's Talk
            </Button>
          </Space>
        </Header>

        <Content>
          {/* Hero Section */}
          <div style={{ 
            padding: '160px 48px 120px',
            background: isDarkMode 
              ? 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)' 
              : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '600px',
              height: '600px',
              background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(30%, -30%)'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(-30%, 30%)'
            }}></div>
            
            <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
              <Row gutter={[64, 48]} align="middle">
                <Col xs={24} lg={12}>
                  <Badge.Ribbon text="Marketing Experts" color="#f59e0b" style={{ fontSize: '12px' }}>
                    <div style={{ marginBottom: 24 }}>
                      <Text style={{ 
                        fontSize: '16px', 
                        fontWeight: 600,
                        color: '#f59e0b',
                        textTransform: 'uppercase',
                        letterSpacing: '2px'
                      }}>
                        Turn Visitors Into Customers
                      </Text>
          </div>
                  </Badge.Ribbon>
                  
                  <Title level={1} style={{ 
                    fontSize: 'clamp(36px, 5vw, 72px)', 
                    lineHeight: 1.1, 
                    marginBottom: 32,
                    fontWeight: 800,
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)'
                      : 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Turning <span style={{ color: '#f59e0b' }}>online</span> attention into paying <span style={{ color: '#0ea5e9' }}>customers</span>
                  </Title>
                  
                  <Paragraph style={{ 
                    fontSize: '20px', 
                    marginBottom: 40, 
                    lineHeight: 1.7,
                    color: isDarkMode ? '#cbd5e1' : '#64748b',
                    maxWidth: '90%'
                  }}>
                Likes don't pay the bills. Opportunities do. We help your business turn its online presence into a client magnet. 
                No corporate red tape. No hype marketing. Just real momentum.
                  </Paragraph>
                  
                  <Space direction="vertical" size="large" style={{ marginBottom: 48, width: '100%' }}>
                    {[
                      'Turn social reach into qualified leads',
                      'Get a website that works as hard as you do',
                      'Earn authority in your market'
                    ].map((item, idx) => (
                      <Space key={idx} size="middle" style={{ width: '100%' }}>
                        <CheckCircleOutlined style={{ color: '#f59e0b', fontSize: '24px' }} />
                        <Text style={{ fontSize: '18px', fontWeight: 500 }}>{item}</Text>
                      </Space>
                    ))}
                  </Space>
                  
                  <Space size="large" wrap>
                    <Button 
                      type="primary" 
                      size="large"
                      style={{ 
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                        border: 'none',
                        height: '56px',
                        fontSize: '18px',
                        fontWeight: 600,
                        padding: '0 40px',
                        boxShadow: '0 8px 24px rgba(14, 165, 233, 0.3)'
                      }}
                      icon={<RocketOutlined />}
                    >
                      Work with Us
                    </Button>
                    <Button 
                      size="large"
                      style={{ 
                        height: '56px',
                        fontSize: '18px',
                        fontWeight: 500,
                        padding: '0 32px'
                      }}
                      onClick={() => setCurrentPage('services')}
                    >
                      View Services
                    </Button>
                  </Space>
                </Col>
                
                <Col xs={24} lg={12}>
                  <div style={{ 
                    position: 'relative',
                    height: '500px'
                  }}>
                    <Card
                      style={{
                        height: '100%',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                          : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        border: 'none',
                        borderRadius: '24px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
                      }}
                      bodyStyle={{ padding: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Space direction="vertical" size="large" align="center" style={{ width: '100%' }}>
                        <Row gutter={[16, 16]} justify="center" style={{ width: '100%' }}>
                          {['📱', '💬', '❤️', '⭐', '📊', '🎯'].map((emoji, idx) => (
                            <Col key={idx}>
                              <Avatar 
                                size={64}
                                style={{
                                  background: idx % 2 === 0 
                                    ? 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)'
                                    : 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                                  fontSize: '32px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}
                              >
                                {emoji}
                              </Avatar>
                            </Col>
                          ))}
                        </Row>
                        <Statistic
                          title={<Text type="secondary">Average Growth</Text>}
                          value={300}
                          suffix="%"
                          valueStyle={{ color: '#f59e0b', fontSize: '48px', fontWeight: 700 }}
                        />
                        <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                          Lead generation increase in first 3 months
                        </Text>
                      </Space>
                    </Card>
                </div>
                </Col>
              </Row>
            </div>
          </div>

      {/* Problems Section */}
          <div id="problems" style={{ 
            padding: '120px 48px',
            background: isDarkMode ? '#0f0f0f' : '#ffffff'
          }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 64 }}>
                <Text style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#f59e0b',
                  textTransform: 'uppercase',
                  letterSpacing: '2px'
                }}>
                  What We Solve
                </Text>
                <Title level={2} style={{ 
                  fontSize: 'clamp(32px, 4vw, 48px)', 
                  marginTop: 16,
                  marginBottom: 16,
                  fontWeight: 700
                }}>
                  What <span style={{ color: '#f59e0b' }}>problems</span> do we <span style={{ color: '#0ea5e9' }}>solve</span>?
                </Title>
                <Paragraph style={{ fontSize: '18px', color: isDarkMode ? '#94a3b8' : '#64748b', maxWidth: 700, margin: '0 auto' }}>
                  We fix marketing problems that <strong>cost you</strong> a name, sales, and customers online.
                </Paragraph>
            </div>
            
              <Row gutter={[32, 32]}>
                {[
                  {
                    icon: '📱',
                    title: 'Your social media feels like a ghost town',
                    desc: 'Your posts get ignored, and engagement is dead. We fix that with smart, persuasive content that grabs attention and sparks conversations.',
                    color: '#f59e0b'
                  },
                  {
                    icon: '🧲',
                    title: 'Leads aren\'t consistently flowing in',
                    desc: 'Relying on referrals is risky. We help you create an online presence that attracts the right customers—so you\'re no longer waiting and hoping.',
                    color: '#0ea5e9'
                  },
                  {
                    icon: '📊',
                    title: 'Marketing feels like a full-time job',
                    desc: 'Digital marketing is a daily game—you pause, you lose! Don\'t let time or lack of expertise hold you back. Outsource to us, and we\'ll keep you consistent.',
                    color: '#f59e0b'
                  }
                ].map((item, idx) => (
                  <Col xs={24} md={8} key={idx}>
                    <Card
                      hoverable
                      style={{
                        height: '100%',
                        borderRadius: '20px',
                        border: 'none',
                        background: idx === 1 
                          ? (isDarkMode ? 'rgba(14, 165, 233, 0.1)' : 'rgba(14, 165, 233, 0.05)')
                          : (isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)'),
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        transition: 'all 0.3s ease'
                      }}
                      bodyStyle={{ padding: '40px' }}
                    >
                      <div style={{ fontSize: '64px', marginBottom: 24, textAlign: 'center' }}>{item.icon}</div>
                      <Title level={3} style={{ 
                        fontSize: '24px', 
                        marginBottom: 16,
                        textAlign: 'center',
                        fontWeight: 600
                      }}>
                        {item.title}
                      </Title>
                      <Paragraph style={{ 
                        fontSize: '16px', 
                        lineHeight: 1.7,
                        color: isDarkMode ? '#cbd5e1' : '#64748b',
                        textAlign: 'center'
                      }}>
                        {item.desc}
                      </Paragraph>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </div>

      {/* Solutions Section */}
          <div id="solutions" style={{ 
            padding: '120px 48px',
            background: isDarkMode ? '#1a1a1a' : '#f8fafc'
          }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 64 }}>
                <Text style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#0ea5e9',
                  textTransform: 'uppercase',
                  letterSpacing: '2px'
                }}>
                  Our Results
                </Text>
                <Title level={2} style={{ 
                  fontSize: 'clamp(32px, 4vw, 48px)', 
                  marginTop: 16,
                  marginBottom: 16,
                  fontWeight: 700
                }}>
                  What we <span style={{ color: '#f59e0b' }}>make happen</span>
                </Title>
                <Paragraph style={{ fontSize: '18px', color: isDarkMode ? '#94a3b8' : '#64748b', maxWidth: 700, margin: '0 auto' }}>
                  We don't sell tactics. We move the numbers that matter.
                </Paragraph>
            </div>
            
              <Row gutter={[24, 24]}>
                {[
                  { title: 'Get More Leads', emoji: '📱 💬 ❤️ ⭐', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)' },
                  { title: 'Sell More Online', emoji: '💻 📱 💰', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
                  { title: 'Build a Personal Brand', emoji: '👑 🎯', gradient: 'linear-gradient(135deg, #38bdf8 0%, #f59e0b 100%)' },
                  { title: 'Gain Strategic Clarity', emoji: '🎯 📊', gradient: 'linear-gradient(135deg, #fbbf24 0%, #0ea5e9 100%)' }
                ].map((item, idx) => (
                  <Col xs={24} sm={12} lg={6} key={idx}>
                    <Card
                      hoverable
                      style={{
                        borderRadius: '20px',
                        border: 'none',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        transition: 'all 0.3s ease'
                      }}
                      bodyStyle={{ padding: 0 }}
                    >
                      <div style={{
                        height: '240px',
                        background: item.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '48px'
                      }}>
                        {item.emoji}
            </div>
                      <div style={{ padding: '32px', textAlign: 'center' }}>
                        <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                          {item.title}
                        </Title>
            </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </div>

      {/* Testimonials Section */}
          <div id="testimonials" style={{ 
            padding: '120px 48px',
            background: isDarkMode ? '#0f0f0f' : '#ffffff'
          }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 64 }}>
                <Text style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#f59e0b',
                  textTransform: 'uppercase',
                  letterSpacing: '2px'
                }}>
                  Client Success
                </Text>
                <Title level={2} style={{ 
                  fontSize: 'clamp(32px, 4vw, 48px)', 
                  marginTop: 16,
                  marginBottom: 16,
                  fontWeight: 700
                }}>
                  Real businesses. <span style={{ color: '#f59e0b' }}>Real results</span>
                </Title>
                <Paragraph style={{ fontSize: '18px', color: isDarkMode ? '#94a3b8' : '#64748b', maxWidth: 700, margin: '0 auto' }}>
                  We've helped 30+ SMEs and 100s of Personal Brands.
                </Paragraph>
            </div>

              <Row gutter={[16, 16]} justify="center" style={{ marginBottom: 64 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <Col key={num}>
                    <Card 
                      size="small"
                      style={{
                        borderRadius: '12px',
                        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc'
                      }}
                    >
                      <Text strong>Client {num}</Text>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Row gutter={[32, 32]} style={{ marginBottom: 64 }}>
                {[
                  {
                    name: 'Sarah Johnson',
                    role: 'CEO, TechStart Solutions',
                    avatar: 'SJ',
                    quote: 'Lesaal Marketing transformed our online presence completely. Our lead generation increased by 300% in just 3 months. Their strategic approach and consistent execution made all the difference.',
                    color: '#f59e0b'
                  },
                  {
                    name: 'Michael Chen',
                    role: 'Founder, GrowthCo',
                    avatar: 'MC',
                    quote: 'Working with Lesaal Marketing was a game-changer. They understood our business goals and delivered results that exceeded our expectations. Highly recommend their services!',
                    color: '#0ea5e9'
                  }
                ].map((testimonial, idx) => (
                  <Col xs={24} lg={12} key={idx}>
                    <Card
                      hoverable
                      style={{
                        borderRadius: '20px',
                        border: 'none',
                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        height: '100%'
                      }}
                      bodyStyle={{ padding: '40px' }}
                    >
                      <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Space size="middle">
                          <Avatar 
                            size={64} 
                            style={{ 
                              background: testimonial.color,
                              fontSize: '24px',
                              fontWeight: 600
                            }}
                          >
                            {testimonial.avatar}
                          </Avatar>
                          <Space direction="vertical" size={0}>
                            <Text strong style={{ fontSize: '18px' }}>{testimonial.name}</Text>
                            <Text type="secondary" style={{ fontSize: '14px' }}>{testimonial.role}</Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {idx === 0 ? '2 weeks ago' : '1 month ago'}
                            </Text>
                          </Space>
                        </Space>
                        <Paragraph style={{ 
                          fontSize: '16px', 
                          lineHeight: 1.7,
                          color: isDarkMode ? '#cbd5e1' : '#475569',
                          fontStyle: 'italic',
                          margin: 0
                        }}>
                          "{testimonial.quote}"
                        </Paragraph>
                        <Text type="secondary" italic style={{ fontSize: '14px' }}>
                          As seen on LinkedIn
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Row gutter={[32, 32]}>
                {[
                  { title: 'Took the burden off', desc: 'Lesaal took over our content and made sure we consistently delivered value to our audience.', icon: <ThunderboltOutlined /> },
                  { title: 'Worth every penny', desc: 'I was one of Lesaal\'s early clients. They redesigned my website and transformed my online presence completely.', icon: <TrophyOutlined /> },
                  { title: 'Highly recommend', desc: 'Hear it from me, Lesaal Marketing gets how to sell online. No "sales pitch" - just real results.', icon: <StarOutlined /> }
                ].map((item, idx) => (
                  <Col xs={24} md={8} key={idx}>
                    <Card
                      style={{
                        borderRadius: '20px',
                        border: 'none',
                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        textAlign: 'center',
                        height: '100%'
                      }}
                      bodyStyle={{ padding: '40px' }}
                    >
                      <div style={{ fontSize: '48px', color: '#f59e0b', marginBottom: 24 }}>
                        {item.icon}
                </div>
                      <Title level={3} style={{ fontSize: '24px', marginBottom: 16, fontWeight: 600 }}>
                        {item.title}
                      </Title>
                      <Paragraph style={{ 
                        fontSize: '16px',
                        lineHeight: 1.7,
                        color: isDarkMode ? '#cbd5e1' : '#64748b',
                        margin: 0
                      }}>
                        {item.desc}
                      </Paragraph>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </div>

      {/* Success Stories Section */}
          <div id="work" style={{ 
            padding: '120px 48px',
            background: isDarkMode ? '#1a1a1a' : '#f8fafc'
          }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <Space direction="vertical" size="small" style={{ marginBottom: 64, width: '100%', textAlign: 'center' }}>
                <Text style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#0ea5e9',
                  textTransform: 'uppercase',
                  letterSpacing: '2px'
                }}>
                  Our Work
                </Text>
                <Title level={2} style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700 }}>
                  Success Stories
                </Title>
              </Space>
              
              <Row gutter={[32, 32]}>
                {[
                  { 
                    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
                    text: 'We revamped the Foundation\'s website for speed & SEO'
                  },
                  { 
                    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    text: 'How Lesaal grew Company\'s social media by 95,000+ reach'
                  },
                  { 
                    gradient: 'linear-gradient(135deg, #38bdf8 0%, #f59e0b 100%)',
                    text: 'Boosted Client\'s engagement with a new content strategy'
                  }
                ].map((story, idx) => (
                  <Col xs={24} md={8} key={idx}>
                    <Card
                      hoverable
                      style={{
                        borderRadius: '20px',
                        border: 'none',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        height: '100%'
                      }}
                      bodyStyle={{ padding: 0 }}
                    >
                      <div style={{
                        height: '240px',
                        background: story.gradient
                      }}></div>
                      <div style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                        padding: '32px',
                        color: '#fff'
                      }}>
                        <Text strong style={{ color: '#fff', fontSize: '18px', lineHeight: 1.6 }}>
                          {story.text}
                        </Text>
              </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </div>

      {/* Why Us Section */}
          <div id="how" style={{ 
            padding: '120px 48px',
            background: isDarkMode ? '#0f0f0f' : '#ffffff'
          }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <Row gutter={[64, 48]} align="middle">
                <Col xs={24} lg={12}>
                  <Text style={{ 
                    fontSize: '14px', 
                    fontWeight: 600,
                    color: '#f59e0b',
                    textTransform: 'uppercase',
                    letterSpacing: '2px'
                  }}>
                    How We Work
                  </Text>
                  <Title level={2} style={{ 
                    fontSize: 'clamp(32px, 4vw, 48px)', 
                    marginTop: 16,
                    marginBottom: 24,
                    fontWeight: 700
                  }}>
                    How we work to get you up and <span style={{ color: '#f59e0b' }}>attracting customers</span>
                  </Title>
                  <Paragraph style={{ 
                    fontSize: '18px', 
                    lineHeight: 1.7,
                    color: isDarkMode ? '#cbd5e1' : '#64748b',
                    marginBottom: 40
                  }}>
                We start by understanding your business. Your problem, your dream customers, and what sets you apart. 
                Then, we craft a content strategy designed to increase your chances of being the first choice when your service is needed. 
                We track results, refine strategies, and keep building momentum.
                  </Paragraph>
                  <Button 
                    type="primary" 
                    size="large"
                    style={{ 
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                      border: 'none',
                      height: '56px',
                      fontSize: '18px',
                      fontWeight: 600,
                      padding: '0 40px',
                      boxShadow: '0 8px 24px rgba(14, 165, 233, 0.3)'
                    }}
                    icon={<RocketOutlined />}
                  >
                    Work with Us
                  </Button>
                </Col>
                <Col xs={24} lg={12}>
                  <Card
                    style={{
                      borderRadius: '24px',
                      border: 'none',
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                        : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                      height: '400px'
                    }}
                    bodyStyle={{ padding: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Space direction="vertical" size="large" align="center" style={{ width: '100%' }}>
                      <TeamOutlined style={{ fontSize: '80px', color: '#f59e0b' }} />
                      <Text style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center' }}>
                        Direct collaboration with decision-makers
                      </Text>
                      <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                        No middle managers. Fast, effective execution.
                      </Text>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>

      {/* Why Lesaal Section */}
          <div id="why" style={{ 
            padding: '120px 48px',
            background: isDarkMode ? '#1a1a1a' : '#f8fafc'
          }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 64 }}>
                <Text style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#0ea5e9',
                  textTransform: 'uppercase',
                  letterSpacing: '2px'
                }}>
                  Why Choose Us
                </Text>
                <Title level={2} style={{ 
                  fontSize: 'clamp(32px, 4vw, 48px)', 
                  marginTop: 16,
                  marginBottom: 16,
                  fontWeight: 700
                }}>
                  Why <span style={{ color: '#f59e0b' }}>Lesaal Marketing</span>?
                </Title>
                <Paragraph style={{ fontSize: '18px', color: isDarkMode ? '#94a3b8' : '#64748b', maxWidth: 800, margin: '0 auto' }}>
                  We're not a bloated agency chasing big-name clients. We're built for hands-on business owners who want real results without corporate nonsense.
                </Paragraph>
              </div>
              
              <Row gutter={[32, 32]}>
                {[
                  'We cut through the noise – No jargon, no buzzwords—just marketing that works.',
                  'You work directly with decision-makers – No middle managers. No layers of approvals. Just fast, effective execution.',
                  'We walk the talk – Ranked on Google. Dominating social media. Building real authority.'
                ].map((benefit, idx) => (
                  <Col xs={24} md={8} key={idx}>
                    <Card
                      style={{
                        borderRadius: '20px',
                        border: 'none',
                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        height: '100%'
                      }}
                      bodyStyle={{ padding: '32px' }}
                    >
                      <Space size="middle" style={{ width: '100%' }}>
                        <CheckCircleOutlined style={{ color: '#f59e0b', fontSize: '28px', flexShrink: 0 }} />
                        <Text style={{ fontSize: '16px', lineHeight: 1.7 }}>
                          {benefit}
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </div>

      {/* Final CTA Section */}
          <div id="contact" style={{ 
            padding: '120px 48px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #f59e0b 100%)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              pointerEvents: 'none'
            }}></div>
            
            <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
              <Title level={2} style={{ 
                fontSize: 'clamp(32px, 4vw, 48px)', 
                color: '#fff', 
                marginBottom: 24,
                fontWeight: 700
              }}>
                Stop losing business to bad marketing
              </Title>
              <Paragraph style={{ 
                fontSize: '20px', 
                color: '#fff', 
                marginBottom: 48, 
                opacity: 0.95,
                lineHeight: 1.7
              }}>
                If you're not investing in digital marketing, you're already paying for it—in lost customers and missed opportunities. Let's fix that.
              </Paragraph>
              <Button 
                type="primary" 
                size="large"
                href="mailto:hello@lesaalmarketing.com"
                style={{ 
                  background: '#fff',
                  border: 'none',
                  color: '#0ea5e9',
                  height: '56px',
                  fontSize: '18px',
                  fontWeight: 600,
                  padding: '0 40px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }}
                icon={<ArrowRightOutlined />}
              >
                Work With Us
              </Button>
            </div>
          </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
            <FloatButton
              icon={<ArrowUpOutlined />}
              onClick={scrollToTop}
              type="primary"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                border: 'none',
                width: '56px',
                height: '56px',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)'
              }}
            />
          )}
        </Content>

        <Footer style={{ 
          textAlign: 'center',
          padding: '48px',
          background: isDarkMode ? '#0a0a0a' : '#ffffff',
          borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`
        }}>
          <Text type="secondary">
            © {new Date().getFullYear()} Lesaal Marketing. All rights reserved.
          </Text>
        </Footer>
      </Layout>
    </ConfigProvider>
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
