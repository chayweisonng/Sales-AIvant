const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');

const router = express.Router();

async function getCount(table, filters = []) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });

  for (const [column, value] of filters) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count || 0;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const companyFilter = [['company_id', req.company.id]];
    const { data: companyConversations, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('company_id', req.company.id);

    if (conversationError) {
      throw conversationError;
    }

    const conversationIds = (companyConversations || []).map((item) => item.id);

    const [conversationCount, documentCount, leadCount] = await Promise.all([
      getCount('conversations', companyFilter),
      getCount('documents', companyFilter),
      conversationIds.length
        ? supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', conversationIds)
            .then(({ count, error }) => {
              if (error) {
                throw error;
              }

              return count || 0;
            })
        : Promise.resolve(0),
    ]);

    res.status(200).json({
      totalConversations: conversationCount,
      totalDocuments: documentCount,
      totalLeads: leadCount,
    });
  } catch (overviewError) {
    console.error('Overview fetch error:', overviewError);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

module.exports = router;
