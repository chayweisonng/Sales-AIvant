const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');

const router = express.Router();

// List leads for the current company
router.get('/', requireAuth, async (req, res) => {
  try {
    // We need to fetch leads where the conversation belongs to the company
    // Since leads table doesn't have company_id, we join with conversations
    const { data, error } = await supabase
      .from('leads')
      .select('*, conversations!inner(company_id)')
      .eq('conversations.company_id', req.company.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Fetch Leads Error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Update a lead's status
router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['new', 'contacted', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    // 1. Verify the lead belongs to the user's company via conversations join
    const { data: lead, error: checkError } = await supabase
      .from('leads')
      .select('id, conversations!inner(company_id)')
      .eq('id', id)
      .eq('conversations.company_id', req.company.id)
      .single();

    if (checkError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // 2. Perform update
    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Update Lead Error:', error);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

module.exports = router;
