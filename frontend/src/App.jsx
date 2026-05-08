import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { AuthProvider } from './context/AuthContext';

import DashboardLayout from './layouts/DashboardLayout';
import Overview from './pages/Overview';
import Documents from './pages/Documents';
import Conversations from './pages/Conversations';
import Leads from './pages/Leads';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';

import './index.css';

const App = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#faff69',
          colorBgBase: '#0a0a0a',
          colorBgContainer: '#141414',
          colorBorder: '#2a2a2a',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          borderRadius: 8,
        },
        components: {
          Card: {
            headerBg: '#141414',
          },
          Table: {
            colorBgContainer: '#141414',
            headerBg: '#1f1f1f',
          }
        }
      }}
    >
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Overview />} />
                <Route path="documents" element={<Documents />} />
                <Route path="conversations" element={<Conversations />} />
                <Route path="leads" element={<Leads />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
