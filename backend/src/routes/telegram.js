const express = require('express');
const { createBot, startPollingBot } = require('../services/telegramService');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');
const { getOrCreateConversation, saveMessage } = require('../services/conversationService');
const { askQuestion } = require('../services/chatService');

const router = express.Router();
const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token';

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

// POST /api/telegram/connect
router.post('/connect', requireAuth, async (req, res) => {
  const { token } = req.body;
  const companyId = req.company.id;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    console.log('Connecting bot with token:', token.substring(0, 10) + '...');
    const tempBot = createBot(token, { companyId });
    console.log('Fetching bot info...');
    const botInfo = await tempBot.telegram.getMe();
    console.log('Bot info retrieved:', botInfo.username);
    
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const webhookUrl = `${baseUrl}/api/telegram/webhook?company_id=${companyId}`;
    const canUseWebhook = isHttpsUrl(webhookUrl);
    let connectionStatus = 'connected';
    let connectionMode = 'webhook';
    let message = 'Telegram bot connected successfully.';

    if (canUseWebhook) {
      console.log('Setting webhook to:', webhookUrl);
      const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
      await tempBot.telegram.setWebhook(
        webhookUrl,
        secretToken ? { secret_token: secretToken } : undefined
      );
      console.log('Webhook set successfully.');
    } else {
      console.log('HTTPS not available, starting local polling mode...');
      await startPollingBot(token, companyId);
      console.log('Polling bot started.');
      connectionStatus = 'polling';
      connectionMode = 'polling';
      message = 'Telegram bot connected in local polling mode. Use an HTTPS BACKEND_URL to enable webhooks.';
    }

    // Save to DB
    console.log('Saving bot settings to Supabase...');
    const { error } = await supabase
      .from('agent_settings')
      .upsert({
        company_id: companyId,
        telegram_bot_token: token,
        telegram_bot_username: botInfo.username,
        webhook_status: connectionStatus,
        updated_at: new Date()
      }, { onConflict: 'company_id' });

    if (error) throw error;
    console.log('Settings saved.');

    res.json({ 
      success: true, 
      username: botInfo.username,
      status: connectionStatus,
      mode: connectionMode,
      webhookUrl: canUseWebhook ? webhookUrl : null,
      message
    });
  } catch (error) {
    console.error('Telegram Connection Error:', error);
    res.status(500).json({ error: 'Failed to connect Telegram bot. Check your token.' });
  }
});

// GET /api/telegram/webhook/info — diagnostic endpoint (hit from browser to verify webhook)
router.get('/webhook/info', requireAuth, async (req, res) => {
  const companyId = req.company.id;

  try {
    const { data: settings } = await supabase
      .from('agent_settings')
      .select('telegram_bot_token, webhook_status')
      .eq('company_id', companyId)
      .single();

    if (!settings?.telegram_bot_token) {
      return res.json({ error: 'No bot token configured' });
    }

    const bot = createBot(settings.telegram_bot_token, { companyId });
    const webhookInfo = await bot.telegram.getWebhookInfo();

    res.json({
      webhook_status_db: settings.webhook_status,
      webhook_url: webhookInfo.url,
      has_custom_certificate: webhookInfo.has_custom_certificate,
      pending_update_count: webhookInfo.pending_update_count,
      last_error_date: webhookInfo.last_error_date
        ? new Date(webhookInfo.last_error_date * 1000).toISOString()
        : null,
      last_error_message: webhookInfo.last_error_message || null,
    });
  } catch (error) {
    console.error('Webhook info error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/telegram/webhook
router.post('/webhook', async (req, res) => {
  console.log('[WEBHOOK HIT] query:', JSON.stringify(req.query));

  const { company_id } = req.query;
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!company_id) {
    console.log('[WEBHOOK] Missing company_id');
    return res.status(400).send('Missing company_id');
  }

  if (configuredSecret) {
    const providedSecret = req.get(TELEGRAM_SECRET_HEADER);

    if (providedSecret !== configuredSecret) {
      console.log('[WEBHOOK] Invalid secret');
      return res.status(401).send('Invalid Telegram secret');
    }
  }

  try {
    // 1. Find the token for this company
    const { data: settings, error } = await supabase
      .from('agent_settings')
      .select('telegram_bot_token')
      .eq('company_id', company_id)
      .single();

    if (error || !settings?.telegram_bot_token) {
      console.warn(`[WEBHOOK] No bot token found for company ${company_id}`);
      return res.status(404).end();
    }

    const update = req.body;
    console.log('[WEBHOOK] Update type:', update?.message ? 'message' : Object.keys(update || {}).join(','));

    // Acknowledge Telegram immediately — must respond within 5s
    res.status(200).end();

    // 2. Process the update
    const message = update?.message;
    if (!message?.text) {
      console.log('[WEBHOOK] Non-text update, ignoring');
      return;
    }

    const userIdentifier = message.from?.username || message.from?.id?.toString();
    const chatId = message.chat.id;
    const userText = message.text;

    console.log(`[WEBHOOK] Processing message from ${userIdentifier}: "${userText.substring(0, 50)}"`);

    try {
      const { conversationId, companyId: resolvedCompanyId } = await getOrCreateConversation(
        userIdentifier,
        'telegram',
        company_id
      );

      console.log(`[WEBHOOK] Conversation: ${conversationId}, Company: ${resolvedCompanyId}`);

      // askQuestion already saves both 'user' and 'assistant' messages internally
      const aiResponse = await askQuestion(userText, conversationId, resolvedCompanyId);

      console.log(`[WEBHOOK] AI responded (${aiResponse.length} chars)`);

      // Reply via Telegram
      const bot = createBot(settings.telegram_bot_token, { companyId: company_id });
      await bot.telegram.sendMessage(chatId, aiResponse);

      console.log('[WEBHOOK] Reply sent to Telegram');
    } catch (processingError) {
      console.error('[WEBHOOK] Processing error:', processingError);
      try {
        const bot = createBot(settings.telegram_bot_token, { companyId: company_id });
        await bot.telegram.sendMessage(chatId, "I'm sorry, I'm having a bit of trouble right now.");
      } catch (_) {}
    }
  } catch (error) {
    console.error('[WEBHOOK] Fatal error:', error);
    if (!res.headersSent) res.status(500).end();
  }
});

module.exports = router;
