import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const { Title, Text } = Typography;

const Overview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalLeads: 0,
    totalDocuments: 0,
  });

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const { data } = await api.get('/api/overview');
        setStats({
          totalConversations: data.totalConversations || 0,
          totalLeads: data.totalLeads || 0,
          totalDocuments: data.totalDocuments || 0,
        });
      } catch (error) {
        console.error('Failed to load overview', error);
      }
    };

    fetchOverview();
  }, []);

  return (
    <>
      <Title level={2} style={{ marginBottom: '32px' }}>Overview</Title>
      
      <Row gutter={[24, 24]}>
        <Col span={8}>
          <Card title="Total Conversations">
            <Title level={1} style={{ color: '#faff69', margin: 0 }}>{stats.totalConversations}</Title>
            <Text type="secondary">Tracked customer sessions</Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="New Leads">
            <Title level={1} style={{ color: '#faff69', margin: 0 }}>{stats.totalLeads}</Title>
            <Text type="secondary">Captured opportunities</Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Indexed Knowledge">
            <Title level={1} style={{ color: '#faff69', margin: 0 }}>{stats.totalDocuments}</Title>
            <Text type="secondary">Knowledge base files</Text>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: '48px' }}>
        <Card 
          bodyStyle={{ background: '#faff69', borderRadius: '12px', padding: '64px' }}
          bordered={false}
        >
          <Title level={2} style={{ color: '#0a0a0a', marginBottom: '16px' }}>
            Deploy your way
          </Title>
          <Text style={{ color: '#0a0a0a', fontSize: '18px', display: 'block', marginBottom: '32px' }}>
            Scale your sales reach with 24/7 AI-driven customer interactions.
          </Text>
          <Button 
            onClick={() => navigate('/settings')}
            style={{ background: '#0a0a0a', color: '#fff', border: 'none', fontWeight: 600 }}
            aria-label="Configure Agent Settings"
          >
            Configure Agent
          </Button>
        </Card>
      </div>
    </>
  );
};

export default Overview;
