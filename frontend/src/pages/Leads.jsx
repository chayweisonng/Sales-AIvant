import React, { useEffect, useState, useMemo } from 'react';
import { Typography, Tag, message, Button, Space, Modal, Descriptions, Select, Input, Empty, Spin } from 'antd';
import { Users, Mail, Clock, Phone, Send, Search, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const { Title, Text, Paragraph } = Typography;

const summaryTextStyle = {
  whiteSpace: 'pre-line',
  wordBreak: 'break-word',
  marginBottom: 0,
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const timestamp = new Date(dateString).getTime();
  const now = Date.now();
  const diffInMinutes = Math.max(1, Math.floor((now - timestamp) / 60000));

  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

const renderContactLink = (contact) => {
  if (!contact) return <Text type="secondary" style={{ color: '#555' }}>Not provided</Text>;
  const trimmed = contact.trim();
  
  if (trimmed.includes('@')) {
    return (
      <Space size={6} align="center" style={{ color: '#888' }}>
        <Mail size={13} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
        <a href={`mailto:${trimmed}`} style={{ color: '#faff69', textDecoration: 'underline', fontSize: '13px' }}>
          {trimmed}
        </a>
      </Space>
    );
  }
  
  if (trimmed.startsWith('@')) {
    return (
      <Space size={6} align="center" style={{ color: '#888' }}>
        <Send size={13} style={{ display: 'inline-block', verticalAlign: 'middle', transform: 'rotate(-30deg)' }} />
        <a href={`https://t.me/${trimmed.substring(1)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#faff69', textDecoration: 'underline', fontSize: '13px' }}>
          {trimmed}
        </a>
      </Space>
    );
  }
  
  const cleanPhone = trimmed.replace(/[^\d+]/g, '');
  if (cleanPhone.length >= 7) {
    return (
      <Space size={6} align="center" style={{ color: '#888' }}>
        <Phone size={13} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
        <a href={`tel:${cleanPhone}`} style={{ color: '#faff69', textDecoration: 'underline', fontSize: '13px' }}>
          {trimmed}
        </a>
      </Space>
    );
  }
  
  return <Text style={{ color: '#ccc', fontSize: '13px' }}>{trimmed}</Text>;
};

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data } = await api.get('/api/leads');
        setLeads(data || []);
      } catch (error) {
        message.error('Failed to load leads. Please try again.');
        console.error('Fetch Leads Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.patch(`/api/leads/${leadId}`, { status: newStatus });
      setLeads((prev) => prev.map((lead) => lead.id === leadId ? { ...lead, status: newStatus } : lead));
      setSelectedLead((prev) => {
        if (prev && prev.id === leadId) {
          return { ...prev, status: newStatus };
        }
        return prev;
      });
      message.success('Lead status updated successfully');
    } catch (error) {
      console.error('Update lead status error:', error);
      message.error('Failed to update lead status');
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // 1. Filter by Active Tab
      const currentStatus = lead.status || 'new';
      if (activeTab !== 'all' && currentStatus !== activeTab) {
        return false;
      }
      
      // 2. Filter by Search Term
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const nameMatch = (lead.name || '').toLowerCase().includes(query);
        const contactMatch = (lead.contact || '').toLowerCase().includes(query);
        const reqMatch = (lead.requirement_summary || '').toLowerCase().includes(query);
        const quoteMatch = (lead.quote_summary || '').toLowerCase().includes(query);
        return nameMatch || contactMatch || reqMatch || quoteMatch;
      }
      
      return true;
    });
  }, [leads, activeTab, searchTerm]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: '48px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ margin: 0, color: '#fff', fontSize: '32px' }}>
          Sales Leads
        </Title>
        <Paragraph style={{ color: '#888', fontSize: '15px', marginTop: '10px', maxWidth: '620px' }}>
          Monitor high-intent customer requests, view summary evaluations, update pipeline statuses, and deep-link directly into execution logs or chat sessions.
        </Paragraph>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#121212', padding: '4px', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          {['all', 'new', 'contacted', 'closed'].map((statusTab) => {
            const isActive = activeTab === statusTab;
            return (
              <button
                key={statusTab}
                onClick={() => setActiveTab(statusTab)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isActive ? '#1a1a1a' : 'transparent',
                  color: isActive ? '#faff69' : '#888',
                }}
              >
                {statusTab}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <Input
          allowClear
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search leads..."
          prefix={<Search size={15} color="#555" />}
          style={{
            width: 240,
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            color: '#fff',
            height: 32,
          }}
        />
      </div>

      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '64px 24px', textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#666' }}>No sales leads found match the filter</span>}
          />
        </div>
      ) : (
        /* Cards Grid */
        <div className="lead-card-grid">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="lead-card">
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  {formatRelativeTime(lead.created_at)}
                </span>
                <Select
                  value={lead.status || 'new'}
                  onChange={(val) => handleStatusChange(lead.id, val)}
                  style={{ width: 130 }}
                  options={[
                    { value: 'new', label: <Tag color="blue" style={{ margin: 0 }}>NEW</Tag> },
                    { value: 'contacted', label: <Tag color="orange" style={{ margin: 0 }}>CONTACTED</Tag> },
                    { value: 'closed', label: <Tag color="green" style={{ margin: 0 }}>CLOSED</Tag> },
                  ]}
                />
              </div>

              {/* Lead Title & Contacts */}
              <div style={{ marginBottom: '16px' }}>
                <Title level={4} style={{ color: '#fff', fontSize: '18px', margin: '0 0 6px 0', fontWeight: 700, letterSpacing: '-0.3px' }}>
                  {lead.name || 'Unknown Lead'}
                </Title>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {renderContactLink(lead.contact)}
                </div>
              </div>

              {/* Requirements & Proposal Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', flex: 1 }}>
                {/* Requirements Section */}
                <div style={{ background: '#111111', border: '1px solid #222', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#666', marginBottom: '4px' }}>
                    Requirements Summary
                  </div>
                  <div style={{ fontSize: '13px', color: '#ccc', maxHeight: '72px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                    {lead.requirement_summary || 'No requirements captured.'}
                  </div>
                </div>

                {/* Quote Section if exists */}
                {lead.quote_summary && (
                  <div style={{ background: '#111111', border: '1px solid #222', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#faff69', marginBottom: '4px' }}>
                      Quote Proposal
                    </div>
                    <div style={{ fontSize: '13px', color: '#ccc', maxHeight: '72px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                      {lead.quote_summary}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #2a2a2a' }}>
                <Button
                  style={{ flex: 1, height: 32 }}
                  onClick={() => {
                    setSelectedLead(lead);
                    setIsModalOpen(true);
                  }}
                  aria-label={`View details for ${lead.name || 'this lead'}`}
                >
                  Details
                </Button>
                {lead.conversation_id && (
                  <Button
                    type="primary"
                    style={{
                      flex: 1,
                      background: '#faff69',
                      borderColor: '#faff69',
                      color: '#000',
                      fontWeight: 600,
                      height: 32,
                    }}
                    onClick={() => navigate('/conversations', { state: { conversationId: lead.conversation_id } })}
                    aria-label={`View chat for ${lead.name || 'this lead'}`}
                  >
                    View Chat
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Details Modal */}
      <Modal
        title="Lead Profile Details"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          selectedLead?.conversation_id && (
            <Button
              key="chat"
              type="primary"
              style={{ background: '#faff69', color: '#000', borderColor: '#faff69', fontWeight: 600, height: 32 }}
              onClick={() => {
                setIsModalOpen(false);
                navigate('/conversations', { state: { conversationId: selectedLead.conversation_id } });
              }}
            >
              View Chat
            </Button>
          ),
          <Button key="close" style={{ height: 32 }} onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedLead && (
          <Descriptions bordered column={1} size="small" style={{ marginTop: '16px' }}>
            <Descriptions.Item label="Lead Name">
              <Text strong style={{ color: '#fff' }}>{selectedLead.name || 'Unknown'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Contact Details">
              {renderContactLink(selectedLead.contact)}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Select
                value={selectedLead.status || 'new'}
                onChange={(val) => handleStatusChange(selectedLead.id, val)}
                style={{ width: 140 }}
                options={[
                  { value: 'new', label: <Tag color="blue" style={{ margin: 0 }}>NEW</Tag> },
                  { value: 'contacted', label: <Tag color="orange" style={{ margin: 0 }}>CONTACTED</Tag> },
                  { value: 'closed', label: <Tag color="green" style={{ margin: 0 }}>CLOSED</Tag> },
                ]}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Extracted At">
              <Text style={{ color: '#ccc' }}>
                {new Date(selectedLead.created_at).toLocaleString()}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Requirements Summary">
              <Paragraph style={{ ...summaryTextStyle, color: '#ccc' }}>
                {selectedLead.requirement_summary || 'No requirements captured yet.'}
              </Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="Quote Summary">
              <Paragraph style={{ ...summaryTextStyle, color: '#ccc' }}>
                {selectedLead.quote_summary || 'No quote generated yet.'}
              </Paragraph>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Leads;

