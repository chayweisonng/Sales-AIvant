import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Typography, Card, Spin, Divider, App, Tag, Alert } from 'antd';
import { Save, Settings as SettingsIcon, Send } from 'lucide-react';
import api from '../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Settings = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [telegramInfo, setTelegramInfo] = useState(null);
  const [isChangingBot, setIsChangingBot] = useState(false);
  const [indexedDocCount, setIndexedDocCount] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [{ data }, { data: docs }] = await Promise.all([
          api.get('/api/settings'),
          api.get('/api/documents'),
        ]);
        form.setFieldsValue(data);
        if (data.telegram_bot_username) {
          setTelegramInfo({
            username: data.telegram_bot_username,
            status: data.webhook_status
          });
          setIsChangingBot(false);
        } else {
          setIsChangingBot(true);
        }
        const indexed = (docs || []).filter((d) => d.status === 'indexed').length;
        setIndexedDocCount(indexed);
      } catch (error) {
        message.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [form, message]);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      await api.post('/api/settings', values);
      message.success('Settings updated successfully');
    } catch (error) {
      message.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectTelegram = async () => {
    if (!telegramToken) {
      message.warning('Please enter your Telegram Bot Token');
      return;
    }
    setConnecting(true);
    try {
      const { data } = await api.post('/api/telegram/connect', { token: telegramToken });
      setTelegramInfo({
        username: data.username,
        status: data.status
      });
      setIsChangingBot(false);
      message.success(data.message || 'Telegram bot connected successfully!');
      if (data.warning) {
        message.warning(data.warning, 10);
      }
      setTelegramToken('');
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to connect Telegram bot');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Title level={2} style={{ marginBottom: '32px' }}>Agent Settings</Title>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingsIcon size={18} />
              <span>Personality & Tone</span>
            </div>
          }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ tone: 'professional' }}
          >
            <Form.Item
              label="System Instruction (Optional)"
              name="system_prompt"
              tooltip="The core behavior instruction/system prompt for your AI sales agent. This governs its personality, restrictions, and business rules."
              help="Describe how the AI should behave. e.g. 'You are a sarcastic but helpful assistant named Bridgey.'"
              style={{ marginBottom: '32px' }}
            >
              <TextArea
                rows={6}
                placeholder="Enter your AI's personality instructions..."
              />
            </Form.Item>

            <Form.Item
              label="Tone"
              name="tone"
              tooltip="The conversational style the AI adopts when chatting with customers."
            >
              <Select>
                <Select.Option value="professional">Professional</Select.Option>
                <Select.Option value="friendly">Friendly & Casual</Select.Option>
                <Select.Option value="humorous">Humorous</Select.Option>
                <Select.Option value="strict">Strict & Brief</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<Save size={16} />}
                loading={saving}
              >
                Save Configuration
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} />
              <span>Telegram Integration</span>
            </div>
          }
        >
          {indexedDocCount === 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: '20px' }}
              message="Knowledge base required"
              description={
                <span>
                  You need at least <strong>1 indexed document</strong> in your{' '}
                  <a href="/documents">Knowledge Base</a> before you can activate the Telegram bot.
                  The bot won't be able to answer questions without source material.
                </span>
              }
            />
          )}

          {(!telegramInfo || isChangingBot) ? (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                Get your bot token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a> on Telegram. The system will automatically set up the connection.
              </Text>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>Enter your Telegram Bot Token</Text>
                  <Input
                    placeholder="Paste your bot token here (e.g. 123456:ABC-DEF...)"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '32px' }}>
                  <Button
                    type="primary"
                    onClick={handleConnectTelegram}
                    loading={connecting}
                  >
                    Connect Bot
                  </Button>
                  {telegramInfo && (
                    <Button
                      onClick={() => setIsChangingBot(false)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              <Divider orientation="left" style={{ marginTop: '32px' }}>How to get a Bot Token?</Divider>
              <ol style={{ paddingLeft: '20px', color: '#666', lineHeight: '2' }}>
                <li>Search for <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a> on Telegram.</li>
                <li>Send the message <code>/newbot</code> to start the creation process.</li>
                <li>Follow the prompts to set a <b>Name</b> and a <b>Username</b> (must end in 'bot').</li>
                <li>Copy the <b>API Token</b> provided and paste it into the input field above.</li>
              </ol>
            </>
          ) : (
            <div className="telegram-status-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(22, 119, 255, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1677ff'
                  }}>
                    <Send size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Text strong style={{ fontSize: '16px' }}>@{telegramInfo.username}</Text>
                      <Tag
                        color={
                          telegramInfo.status === 'connected' ? 'success' :
                            telegramInfo.status === 'polling' ? 'processing' : 'error'
                        }
                        style={{ borderRadius: '20px', padding: '0 12px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className={
                            telegramInfo.status === 'connected' ? 'status-pulse-green' :
                              telegramInfo.status === 'polling' ? 'status-pulse-blue' : ''
                          } />
                          {telegramInfo.status?.toUpperCase()}
                        </div>
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {telegramInfo.status === 'connected'
                        ? 'Webhook active and receiving updates'
                        : telegramInfo.status === 'polling'
                          ? 'Local polling active (Developer mode)'
                          : 'Not receiving updates'}
                    </Text>
                  </div>
                </div>

                <Button
                  type="primary"
                  ghost
                  onClick={() => setIsChangingBot(true)}
                >
                  Change Bot
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default Settings;
