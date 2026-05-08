const { gemini } = require('./geminiClient');
const { supabase } = require('./supabaseClient');

const DIRECT_INTENT_PATTERN = /\b(interested|buy|purchase|order|quote|quotation|pricing|price|choose|chosen|select|selected|take|go with|sign me up|get started|proceed|subscribe|want the|will take)\b/i;
const CONTACT_PATTERN = /(@|\+?\d[\d\s-]{7,})/i;
const QUOTE_SIGNAL_PATTERN = /\b(quote|quotation|pricing|price|budget|cost|estimate|estimated|per unit|usd|rm|myr)\b/i;

function normalizeOptionalText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function shouldKeepQuoteSummary(value) {
  if (!value) {
    return false;
  }

  return QUOTE_SIGNAL_PATTERN.test(value);
}

async function processLead(userMessage, conversationId) {
  try {
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, quote_summary, requirement_summary')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    const { data: recentMessages, error: msgError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (msgError) {
      console.error('[intentService] Error fetching messages:', msgError);
      return null;
    }

    const history = (recentMessages || []).reverse();
    const conversationHistory = history
      .map((message) => `${message.role === 'user' ? 'User' : 'AI'}: ${message.content}`)
      .join('\n');

    const prompt = `You are a lead extraction specialist for a sales AI system.
Analyze the conversation below and extract any contact information or purchase intent.

Look across the ENTIRE conversation. The user may choose a plan first and only share their name or contact later.

Conversation:
${conversationHistory}

Latest message: "${userMessage}"

Rules:
- "has_intent" = true if the user expressed interest in buying, choosing a plan, getting a quote, signing up, or being contacted
- "is_ready_for_lead_creation" = true ONLY if you found BOTH a name AND a contact (email or phone)
- Extract email addresses and phone numbers even if written informally
- Keep "requirement_summary" short and practical
- "quote_summary" = null unless the conversation includes enough product/spec and pricing context to summarize a non-binding estimate
- When "quote_summary" is present, format it as 4 short lines:
  Product/Solution: ...
  Key Specs: ...
  Estimated Price Range: ...
  Next Step: ...
- Never invent a quote. If the conversation does not support an estimate, return null for "quote_summary"

Respond ONLY with a valid JSON object, no markdown, no explanation:
{
  "has_intent": boolean,
  "name": string | null,
  "contact": string | null,
  "requirement_summary": string | null,
  "quote_summary": string | null,
  "is_ready_for_lead_creation": boolean
}`;

    const result = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
    });

    let extraction;

    try {
      const jsonStr = result.text.replace(/```json|```/g, '').trim();
      extraction = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[intentService] Failed to parse Gemini response:', result.text);
      return null;
    }

    if (!extraction || typeof extraction !== 'object') {
      return null;
    }

    if (!extraction.has_intent && DIRECT_INTENT_PATTERN.test(userMessage)) {
      extraction.has_intent = true;
    }

    extraction.requirement_summary = normalizeOptionalText(extraction.requirement_summary);
    extraction.quote_summary = normalizeOptionalText(extraction.quote_summary);

    if (!extraction.requirement_summary && extraction.has_intent) {
      extraction.requirement_summary = userMessage;
    }

    if (!shouldKeepQuoteSummary(extraction.quote_summary)) {
      extraction.quote_summary = null;
    }

    extraction.is_ready_for_lead_creation = Boolean(
      extraction.is_ready_for_lead_creation && extraction.name && extraction.contact
    );

    console.log('[intentService] Extraction result:', extraction);

    let leadSaved = false;
    let leadUpdated = false;

    if (extraction.is_ready_for_lead_creation) {
      if (existingLead) {
        const updatePayload = {};

        if (extraction.requirement_summary && extraction.requirement_summary !== existingLead.requirement_summary) {
          updatePayload.requirement_summary = extraction.requirement_summary;
        }

        if (extraction.quote_summary && extraction.quote_summary !== existingLead.quote_summary) {
          updatePayload.quote_summary = extraction.quote_summary;
        }

        if (Object.keys(updatePayload).length > 0) {
          const { error: updateError } = await supabase
            .from('leads')
            .update(updatePayload)
            .eq('id', existingLead.id);

          if (updateError) {
            console.error('[intentService] Error updating lead summary:', updateError);
          } else {
            leadUpdated = true;
            console.log(`[intentService] Lead updated for conversation ${conversationId}.`, updatePayload);
          }
        } else {
          console.log(`[intentService] Lead already exists for conversation ${conversationId}, no summary update needed.`);
        }
      } else {
        const { error: insertError } = await supabase
          .from('leads')
          .insert({
            conversation_id: conversationId,
            name: extraction.name,
            contact: extraction.contact,
            requirement_summary: extraction.requirement_summary,
            quote_summary: extraction.quote_summary,
            status: 'new',
          });

        if (insertError) {
          if (insertError.code === '23505') {
            console.log('[intentService] Duplicate lead, skipping insert.');
          } else {
            console.error('[intentService] Error saving lead:', insertError);
          }
        } else {
          leadSaved = true;
          console.log(`[intentService] Lead saved for conversation ${conversationId}:`, {
            name: extraction.name,
            contact: extraction.contact,
            quote_summary: extraction.quote_summary,
          });
        }
      }
    }

    return {
      ...extraction,
      leadSaved,
      leadUpdated,
      alreadyExists: Boolean(existingLead),
      latestMessageHasContact: CONTACT_PATTERN.test(userMessage),
      needsContact: Boolean(extraction.has_intent && !existingLead && !extraction.is_ready_for_lead_creation),
    };
  } catch (error) {
    console.error('[intentService] Unexpected error:', error);
    return null;
  }
}

module.exports = { processLead };
