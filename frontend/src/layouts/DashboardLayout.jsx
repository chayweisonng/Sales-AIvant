import React, { useState, useEffect } from 'react';
import { Layout, Button, Drawer } from 'antd';
import {
  BarChart3,
  FileText,
  MessageSquare,
  Users,
  Bot,
  LogOut,
  Menu as MenuIcon
} from 'lucide-react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SalesAivantFullLogo } from '../components/SalesAivantLogo';

const { Content, Sider } = Layout;

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setDrawerVisible(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { key: '/', icon: <BarChart3 size={18} />, label: 'Overview' },
    { key: '/settings', icon: <Bot size={18} />, label: 'Agent' },
    { key: '/documents', icon: <FileText size={18} />, label: 'Knowledge' },
    { key: '/conversations', icon: <MessageSquare size={18} />, label: 'Conversations' },
    { key: '/leads', icon: <Users size={18} />, label: 'Leads' },
  ];

  const renderBrandHeader = (onClickAction) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px',
        cursor: 'pointer',
      }}
      onClick={onClickAction}
    >
      <SalesAivantFullLogo height={38} />
    </div>
  );

  const renderSidebarContent = (closeDrawerOnNavigate = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 16px', justifyContent: 'space-between' }}>
      {/* Top: Brand Header & Custom Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {renderBrandHeader(() => {
          navigate('/');
          if (closeDrawerOnNavigate) setDrawerVisible(false);
        })}

        {/* Navigation list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.key;
            return (
              <div
                key={item.key}
                onClick={() => {
                  navigate(item.key);
                  if (closeDrawerOnNavigate) setDrawerVisible(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '14px',
                  color: isActive ? '#fff' : '#888',
                  background: isActive ? '#141414' : 'transparent',
                  borderLeft: isActive ? '3px solid #faff69' : '3px solid transparent',
                  paddingLeft: isActive ? '11px' : '14px',
                }}
                className="sidebar-nav-item"
              >
                <div style={{
                  color: isActive ? '#faff69' : '#888',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: Profile & Logout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingTop: '20px',
        borderTop: '1px solid #2a2a2a'
      }}>
        {/* Profile Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#1a1a1a',
            border: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#faff69',
            fontWeight: 600,
            fontSize: '14px',
            flexShrink: 0,
          }}>
            {user?.email ? user.email.slice(0, 2).toUpperCase() : 'SB'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{
              color: '#fff',
              fontWeight: 600,
              fontSize: '13px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.email ? user.email.split('@')[0] : 'Admin'}
            </span>
            <span style={{
              color: '#888',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.email || 'admin@nano.banana'}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <div
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#ef4444',
            background: 'transparent',
          }}
          className="sidebar-logout-btn"
        >
          <LogOut size={16} />
          <span style={{ fontWeight: 500 }}>Sign Out</span>
        </div>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* 1. Mobile Top Header Bar */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: '#0a0a0a',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 1000,
        }}>
          {/* Hamburger toggle */}
          <Button
            type="text"
            icon={<MenuIcon size={20} color="#fff" />}
            onClick={() => setDrawerVisible(true)}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          />

          {/* Compact logo on center */}
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <SalesAivantFullLogo height={28} showSubtext={false} />
          </div>

          {/* Spacing holder */}
          <div style={{ width: '40px' }} />
        </div>
      )}

      {/* 2. Mobile Drawer Navigation Overlay */}
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={280}
          className="stitch-sidebar-drawer"
          closable={false}
          styles={{ body: { padding: 0, background: '#0a0a0a' } }}
        >
          {renderSidebarContent(true)}
        </Drawer>
      )}

      {/* 3. Desktop Static Left Sidebar Sider */}
      {!isMobile && (
        <Sider
          width={260}
          theme="dark"
          style={{
            background: '#0a0a0a',
            borderRight: '1px solid #2a2a2a',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1000,
          }}
        >
          {renderSidebarContent(false)}
        </Sider>
      )}

      {/* 4. Main Page Workspace Area */}
      <Layout style={{
        marginLeft: isMobile ? 0 : '260px',
        paddingTop: isMobile ? '60px' : 0,
        background: '#0a0a0a',
        transition: 'margin-left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <Content style={{ padding: isMobile ? '24px 16px' : '48px', overflow: 'initial' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
