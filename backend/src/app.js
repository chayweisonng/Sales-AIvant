const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { isOriginAllowed } = require('./lib/allowedOrigins');

function createApp(overrides = {}) {
  const app = express();

  // Trust Render/Heroku/etc proxy so req.protocol is 'https' in production
  app.set('trust proxy', 1);

  const authRoutes = overrides.authRoutes || require('./routes/auth');
  const overviewRoutes = overrides.overviewRoutes || require('./routes/overview');
  const telegramRoutes = overrides.telegramRoutes || require('./routes/telegram');
  const documentsRoutes = overrides.documentsRoutes || require('./routes/documents');
  const conversationsRoutes = overrides.conversationsRoutes || require('./routes/conversations');
  const settingsRoutes = overrides.settingsRoutes || require('./routes/settings');
  const leadsRoutes = overrides.leadsRoutes || require('./routes/leads');

  app.use(cors({
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin) ? origin || true : false);
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.use('/api/auth', authRoutes);
  app.use('/api/overview', overviewRoutes);
  app.use('/api/telegram', telegramRoutes);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/conversations', conversationsRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/leads', leadsRoutes);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

module.exports = { createApp };
