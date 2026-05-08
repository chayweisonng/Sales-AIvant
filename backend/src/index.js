const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createApp } = require('./app');
const { stopAllPollingBots, restorePollingBots } = require('./services/telegramService');

const app = createApp();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

restorePollingBots().catch((error) => {
  console.error('Failed to restore Telegram polling bots on startup:', error);
});

// Debugging: track why process exits
process.on('exit', (code) => {
  console.log(`Process is about to exit with code: ${code}`);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Enable graceful stop for the bot
process.once('SIGINT', async () => {
  console.log('Received SIGINT, shutting down...');
  await stopAllPollingBots();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.once('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down...');
  await stopAllPollingBots();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
