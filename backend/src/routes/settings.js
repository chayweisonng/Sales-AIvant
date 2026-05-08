const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');

const router = express.Router();

// Get agent settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agent_settings')
      .select('*')
      .eq('company_id', req.company.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    res.status(200).json(data || { system_prompt: '', tone: 'professional' });
  } catch (error) {
    console.error('Fetch Settings Error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update agent settings
router.post('/', requireAuth, async (req, res) => {
  try {
    const { system_prompt, tone } = req.body;
    const companyId = req.company.id;

    // Check if settings already exist
    const { data: existing } = await supabase
      .from('agent_settings')
      .select('id')
      .eq('company_id', companyId)
      .single();

    let result;
    if (existing) {
      // Update existing
      result = await supabase
        .from('agent_settings')
        .update({
          system_prompt,
          tone,
          updated_at: new Date()
        })
        .eq('company_id', companyId)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from('agent_settings')
        .insert({
          company_id: companyId,
          system_prompt,
          tone,
          updated_at: new Date()
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    res.status(200).json(result.data);
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
