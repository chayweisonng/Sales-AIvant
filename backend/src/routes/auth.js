const express = require('express');
const { supabase, supabaseAuth } = require('../services/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { ensureCompanyForEmail } = require('../services/companyService');
const { clearSessionCookie, setSessionCookie } = require('../lib/authCookies');
const { createRateLimitMiddleware } = require('../middleware/rateLimit');

function formatAuthPayload(session, company) {
  return {
    expiresAt: session?.expires_at || null,
    accessToken: session?.access_token || null,
    user: session?.user
      ? {
        id: session.user.id,
        email: session.user.email,
      }
      : null,
    company,
  };
}

function normalizeEmail(email) {
  return email?.trim().toLowerCase() || '';
}

async function findAuthUserByEmail(adminClient, email) {
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.listUsers({ page, perPage: 1000 });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const matchingUser = users.find((user) => normalizeEmail(user.email) === email);

    if (matchingUser) {
      return matchingUser;
    }

    if (!data?.nextPage || users.length === 0) {
      return null;
    }

    page = data.nextPage;
  }
}

function createAuthRouter(deps = {}) {
  const router = express.Router();
  const authClient = deps.supabaseAuth || supabaseAuth;
  const adminClient = deps.supabaseAdmin || supabase.auth.admin;
  const ensureCompany = deps.ensureCompanyForEmail || ensureCompanyForEmail;
  const authGuard = deps.requireAuth || requireAuth;
  const authRateLimit = deps.authRateLimit || createRateLimitMiddleware({
    windowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60_000,
    maxRequests: process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 5,
    message: 'Too many authentication attempts. Please try again later.',
  });

  router.post('/login', authRateLimit, async (req, res) => {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { data, error } = await authClient.auth.signInWithPassword({ email, password });

      if (error || !data.session) {
        return res.status(401).json({ error: error?.message || 'Login failed' });
      }

      const company = await ensureCompany(data.user?.email || email);
      setSessionCookie(res, data.session.access_token, data.session.expires_at);

      res.status(200).json(formatAuthPayload(data.session, company));
    } catch (loginError) {
      console.error('Login error:', loginError);
      res.status(500).json({ error: 'Failed to login' });
    }
  });

  router.post('/signup', authRateLimit, async (req, res) => {
    try {
      const { email, password, companyName } = req.body || {};
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const existingUser = await findAuthUserByEmail(adminClient, normalizedEmail);

      if (existingUser) {
        return res.status(409).json({ error: 'Email is already registered' });
      }

      const { data, error } = await authClient.auth.signUp({ email: normalizedEmail, password });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const company = await ensureCompany(data.user?.email || normalizedEmail, companyName);

      if (data.session?.access_token) {
        setSessionCookie(res, data.session.access_token, data.session.expires_at);
      }

      res.status(201).json({
        ...formatAuthPayload(data.session, company),
        requiresEmailConfirmation: !data.session,
      });
    } catch (signupError) {
      console.error('Signup error:', signupError);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  router.post('/forgot-password', authRateLimit, async (req, res) => {
    try {
      const { email } = req.body || {};
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const frontendOrigin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5174';
      const redirectUrl = `${frontendOrigin}/reset-password`;

      const { data, error } = await authClient.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(200).json({ message: 'Password reset link sent successfully' });
    } catch (forgotError) {
      console.error('Forgot password error:', forgotError);
      res.status(500).json({ error: 'Failed to request password reset' });
    }
  });

  router.post('/reset-password/exchange', authRateLimit, async (req, res) => {
    try {
      const { code } = req.body || {};

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const { data, error } = await authClient.auth.exchangeCodeForSession(code);

      if (error || !data.session) {
        return res.status(400).json({ error: error?.message || 'Failed to exchange authorization code' });
      }

      const company = await ensureCompany(data.user?.email || data.session.user?.email);
      setSessionCookie(res, data.session.access_token, data.session.expires_at);

      res.status(200).json(formatAuthPayload(data.session, company));
    } catch (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      res.status(500).json({ error: 'Failed to process authorization code' });
    }
  });

  router.post('/reset-password', authRateLimit, authGuard, async (req, res) => {
    try {
      const { password } = req.body || {};

      if (!password) {
        return res.status(400).json({ error: 'New password is required' });
      }

      const { data, error } = await adminClient.updateUserById(req.user.id, { password });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(200).json({ message: 'Password updated successfully' });
    } catch (resetError) {
      console.error('Password reset error:', resetError);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  router.get('/session', authGuard, async (req, res) => {
    res.status(200).json({
      accessToken: req.accessToken,
      user: {
        id: req.user.id,
        email: req.user.email,
      },
      company: req.company,
    });
  });

  router.post('/logout', authGuard, async (req, res) => {
    try {
      const { error } = await supabase.auth.admin.signOut(req.accessToken);

      if (error) {
        console.error('Supabase logout warning:', error);
      }

      clearSessionCookie(res);
      res.status(204).send();
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
      res.status(500).json({ error: 'Failed to logout' });
    }
  });

  router.post('/session-cookie', authRateLimit, async (req, res) => {
    try {
      const { accessToken } = req.body || {};

      if (!accessToken) {
        return res.status(400).json({ error: 'Access token is required' });
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(accessToken);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      const company = await ensureCompany(user.email);
      setSessionCookie(res, accessToken);

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
        },
        company,
      });
    } catch (sessionCookieError) {
      console.error('Session cookie error:', sessionCookieError);
      res.status(500).json({ error: 'Failed to establish session' });
    }
  });

  return router;
}

module.exports = createAuthRouter();
module.exports.createAuthRouter = createAuthRouter;
module.exports.findAuthUserByEmail = findAuthUserByEmail;
