const { supabase } = require('../services/supabaseClient');
const { ensureCompanyForEmail } = require('../services/companyService');
const { getAccessTokenFromRequest } = require('../lib/authCookies');

async function requireAuth(req, res, next) {
  try {
    const token = getAccessTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ error: 'Authorization token is required' });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const company = await ensureCompanyForEmail(user.email);

    req.user = user;
    req.company = company;
    req.accessToken = token;

    next();
  } catch (middlewareError) {
    console.error('Auth middleware error:', middlewareError);
    res.status(500).json({ error: 'Failed to validate session' });
  }
}

module.exports = {
  requireAuth,
};
