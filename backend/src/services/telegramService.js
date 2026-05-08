const { Telegraf } = require('telegraf');
const { askQuestion } = require('./chatService');
const { getOrCreateConversation, saveMessage } = require('./conversationService');
const { supabase } = require('./supabaseClient');

const activePollingBots = new Map();

const TONE_OPENERS = {
  friendly: 'Welcome',
  professional: 'Welcome',
  casual: 'Hi',
  premium: 'Welcome',
};

function extractOfferings(extractedText) {
  if (!extractedText) return [];

  const normalizedText = extractedText.replace(/[\u2013\u2014]/g, '-');
  const matches = [
    ...normalizedText.matchAll(/\b\d+\.\s*([A-Za-z0-9][A-Za-z0-9+&/\- ]{1,60}?)\s*-/g),
  ];

  return Array.from(
    new Set(
      matches
        .map((match) => match[1]?.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    )
  ).slice(0, 4);
}

function buildKnowledgeHint(profile) {
  if (profile.offerings.length > 0) {
    const offeringList = profile.offerings.join(', ');
    return `I can help with questions about ${offeringList}, including pricing, features, and which option fits your needs.`;
  }

  if (profile.hasKnowledgeBase) {
    return `I can help answer questions using ${profile.companyName}'s latest company information, including products, services, pricing, and next steps.`;
  }

  return 'I can help with company information, product questions, pricing, and next steps once the team has shared their knowledge base.';
}

async function fetchWelcomeProfile(companyId) {
  if (!companyId) {
    return {
      companyName: 'our team',
      tone: 'professional',
      offerings: [],
      hasKnowledgeBase: false,
    };
  }

  const [
    { data: company, error: companyError },
    { data: settings, error: settingsError },
    { data: documents, error: documentsError },
  ] = await Promise.all([
    supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .maybeSingle(),
    supabase
      .from('agent_settings')
      .select('tone')
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('documents')
      .select('filename, extracted_text')
      .eq('company_id', companyId)
      .eq('status', 'indexed')
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  if (companyError) {
    console.error('Failed to load company profile for Telegram welcome:', companyError);
  }

  if (settingsError) {
    console.error('Failed to load agent settings for Telegram welcome:', settingsError);
  }

  if (documentsError) {
    console.error('Failed to load document profile for Telegram welcome:', documentsError);
  }

  const offerings = Array.from(
    new Set(
      (documents || []).flatMap((document) => extractOfferings(document.extracted_text || ''))
    )
  ).slice(0, 4);

  return {
    companyName: company?.name || 'our team',
    tone: settings?.tone || 'professional',
    offerings,
    hasKnowledgeBase: (documents || []).length > 0,
  };
}

function buildStartMessage(profile) {
  const opener = TONE_OPENERS[profile.tone] || TONE_OPENERS.professional;
  const knowledgeHint = buildKnowledgeHint(profile);
  const intro = `${opener} to ${profile.companyName}. I'm the AI Sales Assistant, here to help with quick answers and the right next step.`;
  const supportLine = profile.offerings.length > 0
    ? `You can ask about plans, features, pricing, or recommendations across ${profile.offerings.join(', ')}.`
    : 'You can ask about products, services, pricing, implementation, or how to get started.';

  return `${intro}\n\n${knowledgeHint}\n\n${supportLine}\n\nTry asking:\n- Which solution is best for my business?\n- What are the pricing options?\n- What features are included?\n- How do I get started?`;
}

/**
 * Creates a Telegraf bot instance for a specific token
 */
const createBot = (token, options = {}) => {
  if (!token) return null;
  const { companyId } = options;
  const botInstance = new Telegraf(token);

  botInstance.start(async (ctx) => {
    const userIdentifier = ctx.from.username || ctx.from.id.toString();

    try {
      const { conversationId, companyId: resolvedCompanyId } = await getOrCreateConversation(
        userIdentifier,
        'telegram',
        companyId
      );

      const profile = await fetchWelcomeProfile(resolvedCompanyId);
      const welcomeMessage = buildStartMessage(profile);

      await saveMessage(conversationId, 'assistant', welcomeMessage);
      await ctx.reply(welcomeMessage);
    } catch (error) {
      console.error('Telegram start error:', error);
      await ctx.reply('Hello! I am your AI assistant. How can I help you today?');
    }
  });

  botInstance.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    const userIdentifier = ctx.from.username || ctx.from.id.toString();

    try {
      ctx.sendChatAction('typing');

      const { conversationId, companyId: resolvedCompanyId } = await getOrCreateConversation(
        userIdentifier,
        'telegram',
        companyId
      );

      const aiResponse = await askQuestion(userMessage, conversationId, resolvedCompanyId);
      ctx.reply(aiResponse);
    } catch (error) {
      console.error('Telegram bot error:', error);
      ctx.reply("I'm sorry, I'm having a bit of trouble right now.");
    }
  });

  botInstance.catch((err, ctx) => {
    console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
  });

  return botInstance;
};

const startPollingBot = async (token, companyId) => {
  const botKey = companyId || token;
  const existingBot = activePollingBots.get(botKey);

  if (existingBot) {
    await existingBot.stop('reconfigure');
    activePollingBots.delete(botKey);
  }

  const botInstance = createBot(token, { companyId });

  try {
    await botInstance.telegram.deleteWebhook({ drop_pending_updates: false });

    botInstance.launch().catch((err) => {
      console.error(`Error in polling loop for ${botKey}:`, err.message);
    });

    activePollingBots.set(botKey, botInstance);
    return botInstance;
  } catch (error) {
    console.error(`Failed to start polling bot for ${botKey}:`, error.message);
    throw error;
  }
};

const stopAllPollingBots = async () => {
  await Promise.all(
    Array.from(activePollingBots.values()).map((botInstance) => botInstance.stop('shutdown'))
  );
  activePollingBots.clear();
};

const restorePollingBots = async () => {
  const { data: settings, error } = await supabase
    .from('agent_settings')
    .select('company_id, telegram_bot_token, webhook_status')
    .eq('webhook_status', 'polling')
    .not('telegram_bot_token', 'is', null);

  if (error) {
    console.error('Failed to load polling Telegram bots from Supabase:', error);
    return;
  }

  for (const setting of settings || []) {
    try {
      await startPollingBot(setting.telegram_bot_token, setting.company_id);
      console.log(`Restored polling Telegram bot for company ${setting.company_id}`);
    } catch (restoreError) {
      console.error(
        `Failed to restore polling Telegram bot for company ${setting.company_id}:`,
        restoreError.message
      );
    }
  }
};

module.exports = { createBot, startPollingBot, stopAllPollingBots, restorePollingBots };
