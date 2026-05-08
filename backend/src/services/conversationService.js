const { supabase } = require('./supabaseClient');

async function getOrCreateConversation(userIdentifier, channel = 'telegram', companyId) {
  try {
    let resolvedCompanyId = companyId;

    if (!resolvedCompanyId) {
      // Fallback to the first company when no tenant is provided.
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      if (!company) throw new Error('No company found in database');
      resolvedCompanyId = company.id;
    }

    // 2. Check for existing conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('company_id', resolvedCompanyId)
      .eq('user_identifier', userIdentifier.toString())
      .eq('channel', channel)
      .single();

    // 3. Create if not exists
    if (!conversation) {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          company_id: resolvedCompanyId,
          user_identifier: userIdentifier.toString(),
          channel
        })
        .select()
        .single();
      
      if (error) throw error;
      conversation = newConv;
    }

    return { conversationId: conversation.id, companyId: resolvedCompanyId };
  } catch (error) {
    console.error('Error in conversationService:', error);
    throw error;
  }
}

async function saveMessage(conversationId, role, content) {
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content
      });
    
    if (error) {
      console.error('saveMessage DB error:', JSON.stringify(error));
      throw error;
    }
  } catch (error) {
    console.error('Error saving message (role=%s, convId=%s):', role, conversationId, error.message || error);
    throw error;
  }
}

module.exports = {
  getOrCreateConversation,
  saveMessage
};
