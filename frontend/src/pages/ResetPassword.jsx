import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, message, Layout, ConfigProvider, theme, Spin } from 'antd';
import { Lock, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SalesAivantHeroLogo } from '../components/SalesAivantLogo';
import api from '../lib/api';

const { Text, Title } = Typography;

export default function ResetPassword() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { exchangeResetCode, resetPassword, fetchSession, isAuthenticated } = useAuth();
  const hasRun = React.useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleValidation = async () => {
      try {
        // 1. Check for query parameter code (PKCE Flow)
        const code = searchParams.get('code');
        if (code) {
          // Strip the code from the URL immediately so a re-render can't reuse it
          window.history.replaceState({}, document.title, window.location.pathname);
          await exchangeResetCode(code);
          setIsValid(true);
          setVerifying(false);
          return;
        }

        // 2. Check for hash parameters (Implicit Flow)
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          if (accessToken) {
            await api.post('/api/auth/session-cookie', { accessToken });
            window.history.replaceState({}, document.title, window.location.pathname);
            await fetchSession();
            setIsValid(true);
            setVerifying(false);
            return;
          }
        }

        // 3. Already logged in (e.g. they came here from settings)
        if (isAuthenticated) {
          setIsValid(true);
          setVerifying(false);
          return;
        }

        // If none of these, link is invalid
        setIsValid(false);
        setVerifying(false);
      } catch (err) {
        console.error('Link validation error:', err);
        message.error(err?.response?.data?.error || 'Your reset link is invalid or has expired.');
        setIsValid(false);
        setVerifying(false);
      }
    };

    handleValidation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await resetPassword(values.password);
      message.success('Password updated successfully!');
      navigate('/');
    } catch (error) {
      if (error?.response?.data?.error) {
        message.error(error.response.data.error);
      } else if (error?.request) {
        message.error('Cannot reach the backend. Make sure the API server is running.');
      } else if (error?.errorFields) {
        // Validation errors shown inline
      } else {
        message.error('Failed to update password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#faff69',
      colorBgContainer: '#0a0a0a',
      colorBorder: '#2a2a2a',
      colorText: '#ffffff',
      colorTextPlaceholder: 'var(--color-muted-soft)',
      borderRadius: 8,
      controlOutline: 'transparent',
    },
    components: {
      Form: {
        itemMarginBottom: 24,
      },
      Input: {
        colorBgContainer: '#0a0a0a',
        colorBorder: '#2a2a2a',
        colorText: '#ffffff',
        colorTextPlaceholder: 'var(--color-muted-soft)',
        activeBorderColor: '#faff69',
        hoverBorderColor: '#faff69',
        controlHeightLG: 46,
        paddingInlineLG: 14,
      },
      Button: {
        colorPrimary: '#faff69',
        colorPrimaryHover: '#e6eb52',
        colorPrimaryActive: '#e6eb52',
        colorTextLightSolid: '#0a0a0a',
      }
    }
  };

  return (
    <ConfigProvider theme={resetTheme}>
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)', padding: '24px' }}>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .form-fade-in {
            animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .ant-form-item {
            margin-bottom: 24px !important;
          }
          .ant-form-item-label {
            width: 100% !important;
            padding-bottom: 6px !important;
          }
          .ant-form-item-label > label {
            width: 100% !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .ant-form-item-label > label::after {
            display: none !important;
          }
          .ant-form-item-explain-error {
            margin-top: 6px !important;
            font-size: 13px !important;
            color: var(--color-accent-rose) !important;
          }
          .ant-form-item-with-help {
            margin-bottom: 32px !important;
          }
        `}</style>

        <div className="form-fade-in" style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <SalesAivantHeroLogo size={100} />

          <Card
            bordered={false}
            style={{
              background: 'var(--color-surface-card)',
              border: '1px solid var(--color-hairline)',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            }}
            bodyStyle={{ padding: '32px' }}
          >
            {verifying ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Spin size="large" style={{ marginBottom: '16px' }} />
                <Text style={{ color: 'var(--color-muted)', display: 'block' }}>Verifying your reset link...</Text>
              </div>
            ) : !isValid ? (
              <div style={{ textAlign: 'center' }}>
                <Title level={2} style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--color-on-dark)' }}>
                  Invalid Reset Link
                </Title>
                <Text style={{ color: 'var(--color-muted)', fontSize: '14px', display: 'block', marginTop: '12px', marginBottom: '32px' }}>
                  This recovery link is invalid, has expired, or has already been used. Please request a new password reset.
                </Text>
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => navigate('/login')}
                  style={{ height: '46px', fontWeight: 600 }}
                >
                  Return to Login
                </Button>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: 'var(--color-on-dark)' }}>
                    New Password
                  </Title>
                  <Text style={{ color: 'var(--color-muted)', fontSize: '14px', display: 'block', marginTop: '8px' }}>
                    Set a secure, new password for your account.
                  </Text>
                </div>

                <Form
                  form={form}
                  name="reset-password-form"
                  layout="vertical"
                  requiredMark={false}
                  onFinish={handleReset}
                >
                  {/* Password Field */}
                  <Form.Item
                    name="password"
                    label={<span style={{ color: 'var(--color-muted)', fontSize: '13px', fontWeight: 500 }}>New Password</span>}
                    rules={[{ required: true, message: 'Please enter a password!' }]}
                  >
                    <Input.Password
                      size="large"
                      prefix={<Lock size={16} style={{ marginRight: '8px', color: 'var(--color-muted)' }} />}
                      placeholder="••••••••"
                    />
                  </Form.Item>

                  {/* Confirm Password Field */}
                  <Form.Item
                    name="confirm"
                    label={<span style={{ color: 'var(--color-muted)', fontSize: '13px', fontWeight: 500 }}>Confirm Password</span>}
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm your password!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('The two passwords do not match!'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      size="large"
                      prefix={<Lock size={16} style={{ marginRight: '8px', color: 'var(--color-muted)' }} />}
                      placeholder="••••••••"
                    />
                  </Form.Item>

                  {/* Submit CTA button */}
                  <Form.Item style={{ margin: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      loading={loading}
                      style={{
                        height: '46px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <span>Update Password</span>
                      {!loading && <ArrowRight size={16} />}
                    </Button>
                  </Form.Item>
                </Form>
              </>
            )}
          </Card>
        </div>
      </Layout>
    </ConfigProvider>
  );
}
