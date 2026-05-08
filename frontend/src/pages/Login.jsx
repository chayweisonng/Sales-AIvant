import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Layout, ConfigProvider, theme } from 'antd';
import { Lock, Mail, ArrowRight, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SalesAivantHeroLogo } from '../components/SalesAivantLogo';

const { Text, Title } = Typography;

export default function LoginWrapper() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { login, signup, forgotPassword } = useAuth();

  React.useEffect(() => {
    const expiredMsg = window.sessionStorage.getItem('auth_expired_msg');
    if (expiredMsg) {
      message.warning(expiredMsg);
      window.sessionStorage.removeItem('auth_expired_msg');
    }
  }, []);

  const handleAuth = async (isSignUpFlow) => {
    try {
      if (isForgotPassword) {
        const values = await form.validateFields(['email']);
        setLoading(true);
        await forgotPassword(values.email);
        message.success('Password reset link sent! Please check your inbox.');
        setIsForgotPassword(false);
        form.resetFields();
        return;
      }

      const values = await form.validateFields();
      setLoading(true);
      const { email, password, companyName } = values;

      if (isSignUpFlow) {
        const result = await signup(email, password, companyName);
        if (result.requiresEmailConfirmation && !result.accessToken) {
          message.success('Account created. Check your email to confirm your account.');
          setIsSignUp(false);
          form.resetFields();
        } else {
          message.success('Account created! Welcome.');
          navigate('/');
        }
      } else {
        await login(email, password);
        message.success('Welcome back!');
        navigate('/');
      }
    } catch (error) {
      if (error?.response?.data?.error) {
        message.error(error.response.data.error);
      } else if (error?.request) {
        message.error('Cannot reach the backend. Please check that the API is running and VITE_API_URL is configured correctly.');
      } else if (error?.errorFields) {
        // Ant Design form validation error; field messages are already shown inline.
      } else {
        message.error('Something went wrong while trying to authenticate.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loginTheme = {
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
        itemMarginBottom: 24, // Fixes error spacing/margin natively!
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
      Checkbox: {
        colorPrimary: '#faff69',
        colorBgContainer: '#0a0a0a',
        colorBorder: '#2a2a2a',
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
    <ConfigProvider theme={loginTheme}>
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)', padding: '24px' }}>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .form-fade-in {
            animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          /* Custom overrides for Ant Design Form Elements to match Stitch perfectly */
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
          /* Add beautiful extra space under the item when there's an active validation message */
          .ant-form-item-with-help {
            margin-bottom: 32px !important;
          }
        `}</style>

        <div className="form-fade-in" style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Brand Hero Logo */}
          <SalesAivantHeroLogo size={100} />

          {/* Auth Credentials Card */}
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
            {/* Card Title & Description Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: 'var(--color-on-dark)' }}>
                {isForgotPassword ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Sign In'}
              </Title>
              <Text style={{ color: 'var(--color-muted)', fontSize: '14px', display: 'block', marginTop: '8px' }}>
                {isForgotPassword
                  ? "Enter your email and we'll send you a recovery link."
                  : isSignUp
                    ? 'Create your workspace to deploy agents.'
                    : 'Sign in to manage your AI Sales Agent'}
              </Text>
            </div>

            <Form
              form={form}
              name="auth"
              layout="vertical"
              requiredMark={false}
              onFinish={() => handleAuth(isSignUp)}
            >
              {/* Company Name Field (Only displayed in Sign Up mode) */}
              {isSignUp && !isForgotPassword && (
                <Form.Item
                  name="companyName"
                  label={<span style={{ color: 'var(--color-muted)', fontSize: '13px', fontWeight: 500 }}>Company name</span>}
                  rules={[{ required: true, message: 'Please input your company name!' }]}
                >
                  <Input
                    size="large"
                    prefix={<Building size={16} style={{ marginRight: '8px', color: 'var(--color-muted)' }} />}
                    placeholder="Acme Corp"
                  />
                </Form.Item>
              )}

              {/* Work Email Address Field */}
              <Form.Item
                name="email"
                label={<span style={{ color: 'var(--color-muted)', fontSize: '13px', fontWeight: 500 }}>Email address</span>}
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email address' }
                ]}
              >
                <Input
                  size="large"
                  prefix={<Mail size={16} style={{ marginRight: '8px', color: 'var(--color-muted)' }} />}
                  placeholder="agent@system.local"
                />
              </Form.Item>

              {/* Password Field */}
              {!isForgotPassword && (
                <Form.Item
                  name="password"
                  label={
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-muted)', fontSize: '13px', fontWeight: 500 }}>Password</span>
                      {!isSignUp && (
                        <a
                          href="#"
                          style={{
                            color: 'var(--color-primary)',
                            fontSize: '13px',
                            fontWeight: 500,
                            transition: 'color 0.2s',
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            setIsForgotPassword(true);
                            form.resetFields();
                          }}
                        >
                          Forgot Password?
                        </a>
                      )}
                    </div>
                  }
                  rules={[{ required: true, message: 'Please input your password!' }]}
                >
                  <Input.Password
                    size="large"
                    prefix={<Lock size={16} style={{ marginRight: '8px', color: 'var(--color-muted)' }} />}
                    placeholder="••••••••"
                  />
                </Form.Item>
              )}

              {/* Confirm Password Field (Only displayed in Sign Up mode) */}
              {isSignUp && !isForgotPassword && (
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
              )}

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
                  <span>{isForgotPassword ? 'Send Recovery Link' : isSignUp ? 'Sign Up' : 'Login'}</span>
                  {!loading && <ArrowRight size={16} />}
                </Button>
              </Form.Item>
            </Form>

            {/* Direct Switch Toggle */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Text style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
                {isForgotPassword ? (
                  <>
                    Remember your password?{' '}
                    <span
                      onClick={() => {
                        setIsForgotPassword(false);
                        setIsSignUp(false);
                        form.resetFields();
                      }}
                      style={{
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginLeft: '4px',
                        textDecoration: 'underline',
                      }}
                    >
                      Log in
                    </span>
                  </>
                ) : (
                  <>
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <span
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        form.resetFields();
                      }}
                      style={{
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginLeft: '4px',
                        textDecoration: 'underline',
                      }}
                    >
                      {isSignUp ? 'Log in' : 'Sign Up'}
                    </span>
                  </>
                )}
              </Text>
            </div>
          </Card>
        </div>
      </Layout>
    </ConfigProvider>
  );
}
