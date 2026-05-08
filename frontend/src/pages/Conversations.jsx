import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Card, Drawer, Empty, Flex, Input, message, Space, Spin, Tag, Typography } from 'antd';
import { ArrowLeft, Bot, CheckCircle2, Info, MessageSquare, Search, User } from 'lucide-react';
import api from '../lib/api';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  applyInsertedConversation,
  applyInsertedMessage,
  resolveSelectedConversationId,
  subscribeToConversationRealtime,
} from '../lib/conversationRealtime';
import { useAuth } from '../context/AuthContext';

const { Text, Title } = Typography;

const formatConversationId = (id = '') => id.substring(0, 6).toUpperCase();

const formatDateTime = (date) => {
  if (!date) return 'Unknown';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(date));
};

const getConversationTitle = (conversation) => {
  if (!conversation) return 'Conversation';
  return `User ${conversation.user_identifier || 'Unknown'}`;
};

const getLatestMessage = (conversation) => {
  const messages = conversation?.messages || [];
  return messages[messages.length - 1];
};

const getConversationPreview = (conversation) => {
  const latestMessage = getLatestMessage(conversation);

  if (!latestMessage) return 'No messages yet';

  const role = latestMessage.role === 'assistant' ? 'Agent' : 'Customer';
  return `${role}: ${latestMessage.content}`;
};

const getLatestActivityDate = (conversation) => {
  const latestMessage = getLatestMessage(conversation);
  return latestMessage?.created_at || conversation?.created_at;
};

const Conversations = () => {
  const location = useLocation();
  const { accessToken } = useAuth();
  const deepLinkConversationId = location.state?.conversationId;
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchConversations = async ({ showLoading = false } = {}) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const { data } = await api.get('/api/conversations');
        const nextConversations = data || [];
        if (cancelled) {
          return;
        }

        setConversations(nextConversations);
        setSelectedConversationId((currentId) =>
          resolveSelectedConversationId({
            currentId,
            deepLinkConversationId,
            conversations: nextConversations,
          })
        );
      } catch (error) {
        if (!showLoading || cancelled) {
          return;
        }

        message.error('Failed to load conversations. Please try again.');
        console.error('Failed to fetch conversations', error);
      } finally {
        if (!cancelled && showLoading) {
          setLoading(false);
        }
      }
    };

    fetchConversations({ showLoading: true });

    const pollConversations = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchConversations();
      }
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchConversations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(pollConversations);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [deepLinkConversationId]);

  useEffect(() => {
    return subscribeToConversationRealtime({
      supabase,
      accessToken,
      onMessageInsert(newMessage) {
        setConversations((currentConversations) =>
          applyInsertedMessage(currentConversations, newMessage)
        );
      },
      onConversationInsert(newConversation) {
        setConversations((currentConversations) =>
          applyInsertedConversation(currentConversations, newConversation)
        );
      },
      onStatus(status) {
        if (status === 'CHANNEL_ERROR') {
          console.error('Supabase realtime channel failed to subscribe for conversations.');
        }
      },
    });
  }, [accessToken]);

  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return conversations;

    return conversations.filter((conversation) => {
      const searchableText = [
        conversation.id,
        conversation.user_identifier,
        conversation.channel,
        getConversationPreview(conversation),
      ].join(' ').toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [conversations, searchTerm]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const selectedMessages = selectedConversation?.messages || [];

  const renderDetailsContent = () => {
    if (!selectedConversation) {
      return (
        <Empty
          description="No conversation selected"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ color: '#888' }}
        />
      );
    }

    return (
      <Flex vertical gap="large" style={{ width: '100%' }}>
        <div>
          <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Conversation</Text>
          <Title level={4} style={{ color: '#fff', margin: '4px 0 0' }}>#{formatConversationId(selectedConversation.id)}</Title>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Customer</Text>
          <div style={{ color: '#fff', marginTop: '4px', wordBreak: 'break-word' }}>
            {selectedConversation.user_identifier || 'Unknown'}
          </div>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Started</Text>
          <Space align="center" style={{ display: 'flex', alignItems: 'center', marginTop: '4px', color: '#e6e6e6' }}>
            <span>{formatDateTime(selectedConversation.created_at)}</span>
          </Space>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Messages</Text>
          <div style={{ color: '#faff69', fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>
            {selectedMessages.length}
          </div>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Latest Activity</Text>
          <div style={{ color: '#e6e6e6', marginTop: '4px' }}>
            {formatDateTime(getLatestActivityDate(selectedConversation))}
          </div>
        </div>
      </Flex>
    );
  };

  return (
    <div style={{ display: 'flex', height: isMobile ? 'calc(100vh - 110px)' : 'calc(100vh - 160px)', gap: '16px' }}>

      {/* Left Pane: Conversations List */}
      {(!isMobile || !selectedConversationId) ? (
        <Card
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
          style={{ width: isMobile ? '100%' : 320, flexShrink: 0, border: '1px solid #2a2a2a', background: '#141414', overflow: 'hidden' }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #2a2a2a' }}>
            <Input
              prefix={<Search size={16} color="#888" />}
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: '32px' }}>
                <Spin />
              </div>
            ) : filteredConversations.length === 0 ? (
              <Empty
                description="No conversations found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '32px 16px', color: '#888' }}
              />
            ) : filteredConversations.map(conv => {
              const isActive = conv.id === selectedConversationId;

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #2a2a2a',
                    borderLeft: isActive ? '4px solid #faff69' : '4px solid transparent',
                    background: isActive ? '#1f1f1f' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Text strong style={{ color: isActive ? '#faff69' : '#e5e3d3' }}>#{formatConversationId(conv.id)}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatDateTime(getLatestActivityDate(conv))}
                    </Text>
                  </div>
                  <div style={{ color: '#fff', fontSize: '14px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getConversationTitle(conv)}
                  </div>
                  <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getConversationPreview(conv)}
                  </div>
                  <Space size={4} align="center" style={{ color: '#22c55e', fontSize: '12px', textTransform: 'capitalize' }}>
                    <CheckCircle2 size={12} />
                    <Text style={{ color: '#22c55e', fontSize: '12px' }}>{conv.channel || 'conversation'}</Text>
                  </Space>
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}

      {/* Center Pane: Chat Window */}
      {(!isMobile || selectedConversationId) ? (
        <Card
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
          style={{ flex: 1, border: '1px solid #2a2a2a', background: '#0a0a0a', overflow: 'hidden' }}
        >
          {/* Chat Window Header */}
          {selectedConversation ? (
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #2a2a2a',
                background: '#141414',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <Space size={12} align="center">
                {isMobile ? (
                  <Button
                    type="text"
                    icon={<ArrowLeft size={18} color="#fff" />}
                    onClick={() => setSelectedConversationId(null)}
                    style={{ padding: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                ) : null}
                <Avatar
                  size="medium"
                  icon={<User size={16} />}
                  style={{ background: '#242424', border: '1px solid #3a3a3a' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                  <Text strong style={{ color: '#fff', fontSize: '14px' }}>
                    {getConversationTitle(selectedConversation)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    #{formatConversationId(selectedConversation.id)}
                  </Text>
                </div>
              </Space>

              <Space size={12} align="center">
                <Tag color="success" style={{ margin: 0, textTransform: 'capitalize' }}>
                  {selectedConversation.channel || 'None'}
                </Tag>
                {isMobile ? (
                  <Button
                    type="text"
                    icon={<Info size={18} color="#faff69" />}
                    onClick={() => setDetailsOpen(true)}
                    style={{ padding: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                ) : null}
              </Space>
            </div>
          ) : null}

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {loading ? (
              <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
                <Spin />
              </div>
            ) : !selectedConversation ? (
              <Empty
                description="Select a conversation"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: 'auto', color: '#888' }}
              />
            ) : selectedMessages.length === 0 ? (
              <Empty
                description="No messages in this conversation yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: 'auto', color: '#888' }}
              />
            ) : selectedMessages.map((chatMessage) => {
              const isAssistant = chatMessage.role === 'assistant';

              return (
                <div key={chatMessage.id} style={{ alignSelf: isAssistant ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{ display: 'flex', justifyContent: isAssistant ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                    <Space align="center">
                      {!isAssistant && (
                        <Avatar size="small" icon={<User size={14} />} style={{ background: '#242424', border: '1px solid #3a3a3a' }} />
                      )}
                      <Text
                        type={isAssistant ? undefined : 'secondary'}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          color: isAssistant ? '#faff69' : undefined,
                        }}
                      >
                        {isAssistant ? 'Agent' : getConversationTitle(selectedConversation)}
                      </Text>
                      {isAssistant && (
                        <Avatar size="small" icon={<Bot size={14} color="#000" />} style={{ background: '#faff69' }} />
                      )}
                    </Space>
                  </div>
                  <div
                    style={{
                      background: isAssistant ? '#141414' : '#1a1a1a',
                      border: isAssistant ? '1px solid rgba(250, 255, 105, 0.2)' : '1px solid #2a2a2a',
                      padding: '16px',
                      borderRadius: '12px',
                      borderTopLeftRadius: isAssistant ? '12px' : 0,
                      borderTopRightRadius: isAssistant ? 0 : '12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    <Text style={{ color: isAssistant ? '#fff' : '#e6e6e6' }}>{chatMessage.content}</Text>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {/* Right Pane: Conversation Details */}
      {!isMobile ? (
        <Card
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
          style={{ width: 360, flexShrink: 0, border: '1px solid #2a2a2a', background: '#141414', overflow: 'hidden' }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space align="center">
              <MessageSquare size={16} color="#faff69" />
              <Text strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>Conversation Details</Text>
            </Space>
            <Tag color="success" style={{ margin: 0, textTransform: 'capitalize' }}>
              {selectedConversation?.channel || 'None'}
            </Tag>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', color: '#888', lineHeight: 1.6 }}>
            {renderDetailsContent()}
          </div>
        </Card>
      ) : null}

      {/* Mobile Drawer for Details */}
      {isMobile ? (
        <Drawer
          title={
            <Space align="center">
              <MessageSquare size={16} color="#faff69" />
              <Text strong style={{ fontSize: '14px', textTransform: 'uppercase', color: '#fff', letterSpacing: '1px' }}>Conversation Details</Text>
            </Space>
          }
          placement="right"
          onClose={() => setDetailsOpen(false)}
          open={detailsOpen}
          styles={{
            body: { padding: '24px', background: '#141414', color: '#888' },
            header: { background: '#141414', borderBottom: '1px solid #2a2a2a', color: '#fff' },
            wrapper: { width: 320 }
          }}
          closeIcon={<span style={{ color: '#fff' }}>✕</span>}
        >
          {renderDetailsContent()}
        </Drawer>
      ) : null}
    </div>
  );
};

export default Conversations;
