const { supabase } = require('./supabaseClient');
const { gemini } = require('./geminiClient');
const { saveMessage } = require('./conversationService');
const { processLead } = require('./intentService');
const { formatEmbeddingForRpc, generateEmbedding } = require('./embeddingService');

const HISTORY_LIMIT = 8;

const INTENT_KEYWORDS = [
  'interested', 'buy', 'purchase', 'order', 'contact', 'reach',
  'email', 'phone', 'whatsapp', 'call me', 'call us',
  'quote', 'quotation', 'pricing', 'price',
  'my name', 'i am', 'i\'m', 'sign up', 'get started',
  'want to', 'would like', 'looking for', 'need',
  'choose', 'chosen', 'select', 'selected', 'take', 'go with',
  'proceed', 'subscribe', 'sign me up', 'will take',
  '@', '.com', '.my',
];

function mightHaveIntent(message) {
  const lower = message.toLowerCase();
  return INTENT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

async function getRecentConversationHistory(conversationId) {
  if (!conversationId) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }

  return (data || []).reverse();
}

async function askQuestion(userMessage, conversationId, companyId) {
  try {
    let leadSignal = null;

    if (conversationId) {
      await saveMessage(conversationId, 'user', userMessage);

      if (mightHaveIntent(userMessage)) {
        leadSignal = await processLead(userMessage, conversationId).catch((err) => {
          console.error('Intent extraction failed:', err);
          return null;
        });
      }
    }

    let systemInstruction = '';

    const systemPrompt = `
    You are an AI Sales Assistant. Your behavior is governed by the following rules:

    CORE RULES:
    1. Answer ONLY from the provided document context. If not found, say you don't have that information and offer to connect them with the sales team.
    2. Never invent prices, specs, or features.
    3. Always present prices as estimates or ranges, never as final quotes.
    4. If the question is vague, ask ONE clarifying question before answering.
    5. Keep responses concise - 2 to 3 sentences max unless detail is necessary.
    6. Never claim to be human if sincerely asked.

    LEAD COLLECTION:
    When a customer expresses purchase intent, ask for their name and contact details if they have not shared them yet. If they already shared both, confirm that the sales team can follow up.

    TONE:
    Follow the tone and instructions provided below by the company. If the customer writes in a different language or Manglish, mirror them naturally.`;

    if (companyId) {
      const { data: settings } = await supabase
        .from('agent_settings')
        .select('system_prompt, tone')
        .eq('company_id', companyId)
        .single();

      if (settings?.system_prompt) {
        systemInstruction = `${systemPrompt}\n\nCompany Instructions:\n\n${settings.system_prompt}\n\nTone: ${settings.tone || 'professional'}\n\nConstraints:\n1. Answer based ONLY on the provided context.\n2. If not in context, say you don't know.`;
      } else {
        systemInstruction = systemPrompt;
      }
    } else {
      systemInstruction = systemPrompt;
    }

    const queryEmbedding = await generateEmbedding(userMessage);
    const history = await getRecentConversationHistory(conversationId);

    const { data: chunks, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: formatEmbeddingForRpc(queryEmbedding),
      match_threshold: 0.3,
      match_count: 4,
      filter_company_id: companyId || null,
    });

    if (error) {
      console.error('Error fetching document chunks:', error);
      throw error;
    }

    const contextText = chunks?.length > 0
      ? chunks.map((chunk) => chunk.chunk_text).join('\n\n---\n\n')
      : 'No relevant context found.';

    const historyText = history.length > 0
      ? history.map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`).join('\n')
      : 'No previous conversation.';

    const prompt = `Conversation History:\n${historyText}\n\nContext Information:\n${contextText}\n\nUser Question:\n${userMessage}`;

    const result = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: { systemInstruction },
    });

    let aiResponse = result.text;

    if (leadSignal?.leadSaved) {
      aiResponse += '\n\nThanks. I have your request and our team can follow up with you using the details you shared.';
    } else if (leadSignal?.needsContact && !leadSignal.latestMessageHasContact) {
      aiResponse += '\n\nIf you would like our team to follow up, please share your name and email or phone number.';
    }

    if (conversationId) {
      await saveMessage(conversationId, 'assistant', aiResponse);
    }

    return aiResponse;
  } catch (error) {
    console.error('Error in chatService:', error);
    return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
  }
}

module.exports = { askQuestion };
