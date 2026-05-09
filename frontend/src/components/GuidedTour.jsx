import React from 'react';
import { Tour, Typography } from 'antd';
import {
  Rocket,
  BarChart3,
  Bot,
  FileText,
  MessageSquare,
  Users,
  PartyPopper,
} from 'lucide-react';

const { Text } = Typography;

const TOUR_STORAGE_KEY = 'salesaivant_tour_completed';

/**
 * Check if the guided tour has been completed for a given user.
 */
export const isTourCompleted = (userId) => {
  try {
    const stored = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
    return stored[userId] === true;
  } catch {
    return false;
  }
};

/**
 * Mark the guided tour as completed for a given user.
 */
export const markTourCompleted = (userId) => {
  try {
    const stored = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
    stored[userId] = true;
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // silently fail
  }
};

/**
 * Reset the tour so it shows again for this user.
 */
export const resetTour = (userId) => {
  try {
    const stored = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
    delete stored[userId];
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // silently fail
  }
};

const stepStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const iconBox = (Icon, color = '#faff69') => (
  <div
    style={{
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      background: `${color}18`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '4px',
    }}
  >
    <Icon size={18} color={color} />
  </div>
);

const GuidedTour = ({ open, onClose, refs }) => {
  const steps = [
    {
      title: null,
      description: (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #faff69 0%, #22c55e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Rocket size={28} color="#0a0a0a" />
          </div>
          <Text
            strong
            style={{
              fontSize: '20px',
              color: '#0a0a0a',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            Welcome to Sales AIVant!
          </Text>
          <Text
            style={{
              color: '#0a0a0a',
              fontSize: '14px',
              lineHeight: '1.6',
              display: 'block',
            }}
          >
            Let's take a quick tour of your AI sales agent dashboard.
            <br />
            We'll walk through each section so you know exactly where everything
            is.
          </Text>
        </div>
      ),
      target: null, // center screen modal
    },
    {
      title: (
        <div style={stepStyle}>
          {iconBox(BarChart3)}
          <span>Overview Dashboard</span>
        </div>
      ),
      description: (
        <Text style={{ color: '#0a0a0a' }}>
          Your command center. See total conversations, captured leads, and
          indexed knowledge docs at a glance. Start here every time you log in.
        </Text>
      ),
      target: () => refs.overview?.current,
      placement: 'right',
    },
    {
      title: (
        <div style={stepStyle}>
          {iconBox(Bot, '#3b82f6')}
          <span>Agent Settings</span>
        </div>
      ),
      description: (
        <Text style={{ color: '#0a0a0a' }}>
          Configure your AI agent's personality, tone, and system instructions.
          This is also where you connect your Telegram bot to go live.
        </Text>
      ),
      target: () => refs.settings?.current,
      placement: 'right',
    },
    {
      title: (
        <div style={stepStyle}>
          {iconBox(FileText, '#22c55e')}
          <span>Knowledge Base</span>
        </div>
      ),
      description: (
        <Text style={{ color: '#0a0a0a' }}>
          Upload product docs, FAQs, and sales materials here. Your AI agent
          uses these to answer customer questions accurately. You need at least 1
          document before going live.
        </Text>
      ),
      target: () => refs.documents?.current,
      placement: 'right',
    },
    {
      title: (
        <div style={stepStyle}>
          {iconBox(MessageSquare, '#a855f7')}
          <span>Conversations</span>
        </div>
      ),
      description: (
        <Text style={{ color: '#0a0a0a' }}>
          Monitor all live and past customer conversations in real-time. Review
          what your AI agent is saying and how customers are responding.
        </Text>
      ),
      target: () => refs.conversations?.current,
      placement: 'right',
    },
    {
      title: (
        <div style={stepStyle}>
          {iconBox(Users, '#f59e0b')}
          <span>Leads</span>
        </div>
      ),
      description: (
        <Text style={{ color: '#0a0a0a' }}>
          Every customer who shows buying intent gets captured here
          automatically. Review contact details, interest level, and follow up at
          the right time.
        </Text>
      ),
      target: () => refs.leads?.current,
      placement: 'right',
    },
    {
      title: null,
      description: (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <PartyPopper size={28} color="#fff" />
          </div>
          <Text
            strong
            style={{
              fontSize: '20px',
              color: '#fff',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            You're all set!
          </Text>
          <Text
            style={{
              color: '#0a0a0a',
              fontSize: '14px',
              lineHeight: '1.6',
              display: 'block',
            }}
          >
            Start by uploading your first document to the{' '}
            <strong style={{ color: '#faff69' }}>Knowledge Base</strong>, then
            configure your{' '}
            <strong style={{ color: '#faff69' }}>Agent Settings</strong> and
            connect Telegram to go live.
          </Text>
        </div>
      ),
      target: null,
    },
  ];

  return (
    <Tour
      open={open}
      onClose={onClose}
      steps={steps}
      type="primary"
      animated
      zIndex={2000}
    />
  );
};

export default GuidedTour;
