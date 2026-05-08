const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('company_id', req.company.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const conversationIds = (conversations || []).map((conversation) => conversation.id);

    if (conversationIds.length === 0) {
      res.status(200).json([]);
      return;
    }

    const { data: messages, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true });

    if (messageError) {
      throw messageError;
    }

    const messagesByConversation = new Map();

    for (const message of messages || []) {
      const existingMessages = messagesByConversation.get(message.conversation_id) || [];
      existingMessages.push(message);
      messagesByConversation.set(message.conversation_id, existingMessages);
    }

    res.status(200).json(
      (conversations || []).map((conversation) => ({
        ...conversation,
        messages: messagesByConversation.get(conversation.id) || [],
      }))
    );
  } catch (fetchError) {
    console.error('Conversation fetch error:', fetchError);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

module.exports = router;
