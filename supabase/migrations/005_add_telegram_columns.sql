-- Migration: Add Telegram Bot Token and Username to agent_settings
ALTER TABLE agent_settings 
ADD COLUMN telegram_bot_token TEXT,
ADD COLUMN telegram_bot_username TEXT,
ADD COLUMN webhook_status TEXT DEFAULT 'disconnected';
