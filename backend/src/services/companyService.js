const { supabase } = require('./supabaseClient');

async function ensureCompanyForEmail(email, companyName) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Email is required to resolve company context');
  }

  const { data: existingCompany, error: fetchError } = await supabase
    .from('companies')
    .select('id, name, email, created_at')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingCompany) {
    return existingCompany;
  }

  const defaultName = companyName?.trim() || normalizedEmail.split('@')[0] || 'Company';

  const { data: createdCompany, error: createError } = await supabase
    .from('companies')
    .insert({
      name: defaultName,
      email: normalizedEmail,
    })
    .select('id, name, email, created_at')
    .single();

  if (createError) {
    throw createError;
  }

  return createdCompany;
}

module.exports = {
  ensureCompanyForEmail,
};
