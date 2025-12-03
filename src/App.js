import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Typography, Button, Card, Row, Col, Space, Avatar, FloatButton, theme } from 'antd';
import { BulbOutlined, SunOutlined, ArrowUpOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { ThemeProvider, useTheme } from './ThemeContext';
import ServicesPage from './ServicesPage';
import './styles/App.css';

const { Header, Content } = Layout;
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
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (currentPage === 'services') {
    return (
      <ConfigProvider theme={isDarkMode ? { algorithm: darkAlgorithm } : {}}>
        <Layout className="App" style={{ minHeight: '100vh' }}>
          <Header style={{ 
            position: 'fixed', 
            top: 0, 
            width: '100%', 
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            background: isDarkMode ? '#141414' : '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <Space>
              <Text 
                strong 
                style={{ fontSize: '20px', cursor: 'pointer' }}
                onClick={() => setCurrentPage('home')}
              >
                <Text style={{ color: '#f59e0b' }}>&gt;</Text>
                <Text>LESAAL</Text>
                <Text type="secondary" style={{ fontSize: '14px', marginLeft: '4px' }}>MARKETING</Text>
              </Text>
            </Space>
            <Space>
              <Button type="text" onClick={() => setCurrentPage('home')}>
                ← BACK TO HOME
              </Button>
              <Button 
                type="text" 
                icon={isDarkMode ? <SunOutlined /> : <BulbOutlined />}
                onClick={toggleTheme}
              />
            </Space>
          </Header>
          <Content style={{ marginTop: 64 }}>
            <ServicesPage />
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={isDarkMode ? { algorithm: darkAlgorithm } : {}}>
      <Layout className="App" style={{ minHeight: '100vh' }}>
        <Header style={{ 
          position: 'fixed', 
          top: 0, 
          width: '100%', 
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: isDarkMode ? '#141414' : '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Space>
            <Text strong style={{ fontSize: '20px' }}>
              <Text style={{ color: '#f59e0b' }}>&gt;</Text>
              <Text>LESAAL</Text>
              <Text type="secondary" style={{ fontSize: '14px', marginLeft: '4px' }}>MARKETING</Text>
            </Text>
          </Space>
          <Space>
            <Button type="text" href="#work">OUR WORK</Button>
            <Button type="text" onClick={() => setCurrentPage('services')}>ALL SERVICES</Button>
            <Button type="text" href="#social">SOCIAL MEDIA</Button>
            <Button type="text" href="#website">WEBSITE & SEO</Button>
            <Button type="text" href="#linkedin">LINKEDIN</Button>
            <Button type="text" href="#blogs">BLOGS ↓</Button>
            <Button 
              type="text" 
              icon={isDarkMode ? <SunOutlined /> : <BulbOutlined />}
              onClick={toggleTheme}
            />
            <Button type="primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>LET'S TALK</Button>
          </Space>
        </Header>
        <Content style={{ marginTop: 64 }}>

          {/* Hero Section */}
          <div style={{ padding: '120px 24px 80px', background: isDarkMode ? '#141414' : '#fff' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Row gutter={[48, 48]} align="middle">
                <Col xs={24} lg={12}>
                  <Title level={1} style={{ fontSize: '56px', lineHeight: 1.2, marginBottom: 24 }}>
                    Turning <Text style={{ color: '#f59e0b' }}>online</Text> attention into paying <Text style={{ color: '#f59e0b' }}>customers</Text>
                  </Title>
                  <Paragraph style={{ fontSize: '20px', marginBottom: 32, opacity: 0.9 }}>
                    Likes don't pay the bills. Opportunities do. We help your business turn its online presence into a client magnet. 
                    No corporate red tape. No hype marketing. Just real momentum.
                  </Paragraph>
                  <Space direction="vertical" size="middle" style={{ marginBottom: 32, width: '100%' }}>
                    <Space>
                      <Text style={{ color: '#f59e0b', fontSize: '20px', fontWeight: 'bold' }}>✓</Text>
                      <Text style={{ fontSize: '18px' }}>Turn social reach into qualified leads</Text>
                    </Space>
                    <Space>
                      <Text style={{ color: '#f59e0b', fontSize: '20px', fontWeight: 'bold' }}>✓</Text>
                      <Text style={{ fontSize: '18px' }}>Get a website that works as hard as you do</Text>
                    </Space>
                    <Space>
                      <Text style={{ color: '#f59e0b', fontSize: '20px', fontWeight: 'bold' }}>✓</Text>
                      <Text style={{ fontSize: '18px' }}>Earn authority in your market</Text>
                    </Space>
                  </Space>
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
                    Work with Us <ArrowRightOutlined />
                  </Button>
                </Col>
                <Col xs={24} lg={12}>
                  <div style={{ 
                    height: 400, 
                    position: 'relative',
                    background: isDarkMode ? '#1f1f1f' : '#f0f9ff',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <div style={{
                        position: 'absolute',
                        left: '20%',
                        top: '20%',
                        width: 60,
                        height: 80,
                        background: isDarkMode ? '#fff' : '#000',
                        borderRadius: '30px 30px 0 0',
                        transform: 'rotate(-15deg)'
                      }}></div>
                      <div style={{
                        position: 'absolute',
                        right: '30%',
                        top: '10%',
                        width: 120,
                        height: 60,
                        background: isDarkMode ? '#fff' : '#000',
                        borderRadius: '50px',
                        opacity: 0.8
                      }}></div>
                      <div style={{
                        position: 'absolute',
                        right: '20%',
                        bottom: '20%',
                        width: 40,
                        height: 60,
                        background: isDarkMode ? '#141414' : '#fff',
                        borderRadius: '20px 20px 0 0'
                      }}></div>
                      <Space style={{ position: 'absolute', top: '10%', left: '10%' }}>
                        <Avatar style={{ background: '#0ea5e9' }}>f</Avatar>
                        <Avatar style={{ background: '#f59e0b' }}>P</Avatar>
                        <Avatar style={{ background: '#0ea5e9' }}>in</Avatar>
                        <Avatar style={{ background: '#f59e0b' }}>📷</Avatar>
                        <Avatar style={{ background: '#0ea5e9' }}>🐦</Avatar>
                      </Space>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>

          {/* Problems Section */}
          <div id="problems" style={{ padding: '80px 24px', background: isDarkMode ? '#141414' : '#fff' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Title level={2} style={{ textAlign: 'center', fontSize: '40px', marginBottom: 16 }}>
                What <Text style={{ color: '#f59e0b' }}>problems</Text> do we <Text style={{ color: '#f59e0b' }}>solve</Text>?
              </Title>
              <Paragraph style={{ textAlign: 'center', fontSize: '20px', marginBottom: 48 }}>
                We fix marketing problems that <strong>cost you</strong> a name, sales, and customers online.
              </Paragraph>
              
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  <Card 
                    style={{ 
                      textAlign: 'center',
                      background: '#f59e0b',
                      border: 'none',
                      height: '100%'
                    }}
                    bodyStyle={{ padding: '32px' }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: 16 }}>📱</div>
                    <Title level={3} style={{ color: '#fff', marginBottom: 16 }}>Your social media feels like a ghost town</Title>
                    <Paragraph style={{ color: '#fff', textAlign: 'left' }}>
                      Your posts get ignored, and engagement is dead. We fix that with smart, persuasive content that grabs attention and sparks conversations.
                    </Paragraph>
                  </Card>
                </Col>
                
                <Col xs={24} md={8}>
                  <Card 
                    style={{ 
                      textAlign: 'center',
                      background: isDarkMode ? '#1f1f1f' : '#f0f9ff',
                      border: '2px solid #0ea5e9',
                      height: '100%'
                    }}
                    bodyStyle={{ padding: '32px' }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: 16 }}>🧲</div>
                    <Title level={3} style={{ marginBottom: 16 }}>Leads aren't consistently flowing in</Title>
                    <Paragraph style={{ textAlign: 'left' }}>
                      Relying on referrals is risky. We help you create an online presence that attracts the right customers—so you're no longer waiting and hoping.
                    </Paragraph>
                  </Card>
                </Col>
                
                <Col xs={24} md={8}>
                  <Card 
                    style={{ 
                      textAlign: 'center',
                      background: '#f59e0b',
                      border: 'none',
                      height: '100%'
                    }}
                    bodyStyle={{ padding: '32px' }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: 16 }}>📊</div>
                    <Title level={3} style={{ color: '#fff', marginBottom: 16 }}>Marketing feels like a full-time job</Title>
                    <Paragraph style={{ color: '#fff', textAlign: 'left' }}>
                      Digital marketing is a daily game—you pause, you lose! Don't let time or lack of expertise hold you back. Outsource to us, and we'll keep you consistent.
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>

          {/* Solutions Section */}
          <div id="solutions" style={{ padding: '80px 24px', background: isDarkMode ? '#1f1f1f' : '#f8fafc' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Title level={2} style={{ textAlign: 'center', fontSize: '40px', marginBottom: 16 }}>
                What we <Text style={{ color: '#f59e0b' }}>make happen</Text>
              </Title>
              <Paragraph style={{ textAlign: 'center', fontSize: '20px', marginBottom: 48 }}>
                We don't sell tactics. We move the numbers that matter.
              </Paragraph>
              
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card 
                    hoverable
                    style={{ textAlign: 'center', border: 'none' }}
                    bodyStyle={{ padding: 0 }}
                  >
                    <div style={{
                      height: 200,
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      marginBottom: 16
                    }}>
                      📱 💬 ❤️ ⭐
                    </div>
                    <Title level={3} style={{ marginBottom: 0 }}>Get More Leads</Title>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} lg={6}>
                  <Card 
                    hoverable
                    style={{ textAlign: 'center', border: 'none' }}
                    bodyStyle={{ padding: 0 }}
                  >
                    <div style={{
                      height: 200,
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      marginBottom: 16
                    }}>
                      💻 📱 💰
                    </div>
                    <Title level={3} style={{ marginBottom: 0 }}>Sell More Online</Title>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} lg={6}>
                  <Card 
                    hoverable
                    style={{ textAlign: 'center', border: 'none' }}
                    bodyStyle={{ padding: 0 }}
                  >
                    <div style={{
                      height: 200,
                      background: 'linear-gradient(135deg, #38bdf8 0%, #f59e0b 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      marginBottom: 16
                    }}>
                      👑 🎯
                    </div>
                    <Title level={3} style={{ marginBottom: 0 }}>Build a Personal Brand</Title>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} lg={6}>
                  <Card 
                    hoverable
                    style={{ textAlign: 'center', border: 'none' }}
                    bodyStyle={{ padding: 0 }}
                  >
                    <div style={{
                      height: 200,
                      background: 'linear-gradient(135deg, #fbbf24 0%, #0ea5e9 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      marginBottom: 16
                    }}>
                      🎯 📊
                    </div>
                    <Title level={3} style={{ marginBottom: 0 }}>Gain Strategic Clarity</Title>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>

          {/* Testimonials Section */}
          <div id="testimonials" style={{ padding: '80px 24px', background: isDarkMode ? '#1f1f1f' : '#f8fafc' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Title level={2} style={{ textAlign: 'center', fontSize: '40px', marginBottom: 16 }}>
                Real businesses. <Text style={{ color: '#f59e0b' }}>Real results</Text>
              </Title>
              <Paragraph style={{ textAlign: 'center', fontSize: '20px', marginBottom: 48 }}>
                We've helped 30+ SMEs and 100s of Personal Brands.
              </Paragraph>
              
              <Row gutter={[16, 16]} justify="center" style={{ marginBottom: 48 }}>
                <Col><Card size="small">Client 1</Card></Col>
                <Col><Card size="small">Client 2</Card></Col>
                <Col><Card size="small">Client 3</Card></Col>
                <Col><Card size="small">Client 4</Card></Col>
                <Col><Card size="small">Client 5</Card></Col>
                <Col><Card size="small">Client 6</Card></Col>
                <Col><Card size="small">Client 7</Card></Col>
              </Row>

              <Row gutter={[24, 24]} style={{ marginBottom: 48 }}>
                <Col xs={24} lg={12}>
                  <Card hoverable>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <Space>
                        <Avatar size={50} style={{ background: '#f59e0b' }}>SJ</Avatar>
                        <Space direction="vertical" size={0}>
                          <Text strong>Sarah Johnson</Text>
                          <Text type="secondary">CEO, TechStart Solutions</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>2 weeks ago</Text>
                        </Space>
                      </Space>
                      <Paragraph>
                        "Lesaal Marketing transformed our online presence completely. Our lead generation increased by 300% in just 3 months. Their strategic approach and consistent execution made all the difference."
                      </Paragraph>
                      <Text type="secondary" italic style={{ fontSize: '14px' }}>As seen on LinkedIn</Text>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} lg={12}>
                  <Card hoverable>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <Space>
                        <Avatar size={50} style={{ background: '#0ea5e9' }}>MC</Avatar>
                        <Space direction="vertical" size={0}>
                          <Text strong>Michael Chen</Text>
                          <Text type="secondary">Founder, GrowthCo</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>1 month ago</Text>
                        </Space>
                      </Space>
                      <Paragraph>
                        "Working with Lesaal Marketing was a game-changer. They understood our business goals and delivered results that exceeded our expectations. Highly recommend their services!"
                      </Paragraph>
                      <Text type="secondary" italic style={{ fontSize: '14px' }}>As seen on LinkedIn</Text>
                    </Space>
                  </Card>
                </Col>
              </Row>

              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  <Card style={{ textAlign: 'center', border: 'none' }}>
                    <Text style={{ fontSize: '64px', color: '#f59e0b', display: 'block', marginBottom: 16 }}>„</Text>
                    <Title level={3} style={{ marginBottom: 16 }}>Took the burden off</Title>
                    <Paragraph>
                      Lesaal took over our content and made sure we consistently delivered value to our audience.
                    </Paragraph>
                  </Card>
                </Col>
                
                <Col xs={24} md={8}>
                  <Card style={{ textAlign: 'center', border: 'none' }}>
                    <Text style={{ fontSize: '64px', color: '#f59e0b', display: 'block', marginBottom: 16 }}>„</Text>
                    <Title level={3} style={{ marginBottom: 16 }}>Worth every penny</Title>
                    <Paragraph>
                      I was one of Lesaal's early clients. They redesigned my website and transformed my online presence completely.
                    </Paragraph>
                  </Card>
                </Col>
                
                <Col xs={24} md={8}>
                  <Card style={{ textAlign: 'center', border: 'none' }}>
                    <Text style={{ fontSize: '64px', color: '#f59e0b', display: 'block', marginBottom: 16 }}>„</Text>
                    <Title level={3} style={{ marginBottom: 16 }}>Highly recommend</Title>
                    <Paragraph>
                      Hear it from me, Lesaal Marketing gets how to sell online. No "sales pitch" - just real results.
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>

          {/* Success Stories Section */}
          <div id="work" style={{ padding: '80px 24px', background: isDarkMode ? '#141414' : '#fff' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Space direction="vertical" size="small" style={{ marginBottom: 48, width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '20px' }}>Our Work</Text>
                <Title level={2} style={{ fontSize: '40px', marginBottom: 0 }}>Success Stories</Title>
              </Space>
              
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  <Card
                    hoverable
                    style={{ overflow: 'hidden', padding: 0 }}
                    cover={
                      <div style={{
                        height: 200,
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)'
                      }}></div>
                    }
                  >
                    <div style={{ background: '#f59e0b', padding: '24px', color: '#fff' }}>
                      <Text strong style={{ color: '#fff', fontSize: '16px' }}>
                        We revamped the Foundation's website for speed & SEO
                      </Text>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} md={8}>
                  <Card
                    hoverable
                    style={{ overflow: 'hidden', padding: 0 }}
                    cover={
                      <div style={{
                        height: 200,
                        background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                      }}></div>
                    }
                  >
                    <div style={{ background: '#f59e0b', padding: '24px', color: '#fff' }}>
                      <Text strong style={{ color: '#fff', fontSize: '16px' }}>
                        How Lesaal grew Company's social media by 95,000+ reach
                      </Text>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} md={8}>
                  <Card
                    hoverable
                    style={{ overflow: 'hidden', padding: 0 }}
                    cover={
                      <div style={{
                        height: 200,
                        background: 'linear-gradient(135deg, #38bdf8 0%, #f59e0b 100%)'
                      }}></div>
                    }
                  >
                    <div style={{ background: '#f59e0b', padding: '24px', color: '#fff' }}>
                      <Text strong style={{ color: '#fff', fontSize: '16px' }}>
                        Boosted Client's engagement with a new content strategy
                      </Text>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>

          {/* Why Us Section */}
          <div id="how" style={{ padding: '80px 24px', background: isDarkMode ? '#1f1f1f' : '#f8fafc' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Row gutter={[48, 48]} align="middle">
                <Col xs={24} lg={12}>
                  <Title level={2} style={{ fontSize: '40px', marginBottom: 24 }}>
                    How we work to get you up and <Text style={{ color: '#f59e0b' }}>attracting customers</Text>
                  </Title>
                  <Paragraph style={{ fontSize: '18px', marginBottom: 32 }}>
                    We start by understanding your business. Your problem, your dream customers, and what sets you apart. 
                    Then, we craft a content strategy designed to increase your chances of being the first choice when your service is needed. 
                    We track results, refine strategies, and keep building momentum.
                  </Paragraph>
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
                    Work with Us <ArrowRightOutlined />
                  </Button>
                </Col>
                <Col xs={24} lg={12}>
                  <div style={{ 
                    height: 300, 
                    position: 'relative',
                    background: isDarkMode ? '#141414' : '#f0f9ff',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{
                      position: 'absolute',
                      right: '20%',
                      bottom: '20%',
                      width: 40,
                      height: 60,
                      background: '#f59e0b',
                      borderRadius: '20px 20px 0 0'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      right: '10%',
                      bottom: '30%',
                      width: 80,
                      height: 40,
                      background: isDarkMode ? '#fff' : '#000',
                      borderRadius: '8px'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      right: '5%',
                      bottom: '40%',
                      fontSize: '32px',
                      color: '#f59e0b',
                      fontWeight: 'bold'
                    }}>→</div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>

          {/* Why Lesaal Section */}
          <div id="why" style={{ padding: '80px 24px', background: isDarkMode ? '#141414' : '#fff' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Title level={2} style={{ textAlign: 'center', fontSize: '40px', marginBottom: 16 }}>
                Why <Text style={{ color: '#f59e0b' }}>Lesaal Marketing</Text>?
              </Title>
              <Paragraph style={{ textAlign: 'center', fontSize: '20px', marginBottom: 48 }}>
                We're not a bloated agency chasing big-name clients. We're built for hands-on business owners who want real results without corporate nonsense.
              </Paragraph>
              
              <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
                <Space size="middle">
                  <Text style={{ color: '#f59e0b', fontSize: '20px', fontWeight: 'bold' }}>✓</Text>
                  <Text style={{ fontSize: '18px' }}>
                    We cut through the noise – No jargon, no buzzwords—just marketing that works.
                  </Text>
                </Space>
                <Space size="middle">
                  <Text style={{ color: '#f59e0b', fontSize: '20px', fontWeight: 'bold' }}>✓</Text>
                  <Text style={{ fontSize: '18px' }}>
                    You work directly with decision-makers – No middle managers. No layers of approvals. Just fast, effective execution.
                  </Text>
                </Space>
                <Space size="middle">
                  <Text style={{ color: '#f59e0b', fontSize: '20px', fontWeight: 'bold' }}>✓</Text>
                  <Text style={{ fontSize: '18px' }}>
                    We walk the talk – Ranked on Google. Dominating social media. Building real authority.
                  </Text>
                </Space>
              </Space>
            </div>
          </div>

          {/* Final CTA Section */}
          <div id="contact" style={{ 
            padding: '80px 24px', 
            background: 'linear-gradient(135deg, #fff 0%, #0ea5e9 50%, #f59e0b 100%)',
            textAlign: 'center'
          }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Title level={2} style={{ fontSize: '40px', color: '#fff', marginBottom: 16 }}>
                Stop losing business to bad marketing
              </Title>
              <Paragraph style={{ fontSize: '20px', color: '#fff', marginBottom: 32, opacity: 0.9 }}>
                If you're not investing in digital marketing, you're already paying for it—in lost customers and missed opportunities. Let's fix that.
              </Paragraph>
              <Button 
                type="primary" 
                size="large"
                href="mailto:hello@lesaalmarketing.com"
                style={{ 
                  background: '#f59e0b', 
                  borderColor: '#f59e0b',
                  height: '48px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  padding: '0 32px'
                }}
              >
                Work With Us <ArrowRightOutlined />
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
                background: '#f59e0b',
                borderColor: '#f59e0b'
              }}
            />
          )}
        </Content>
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