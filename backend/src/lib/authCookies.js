const SESSION_COOKIE_NAME = 'skills_bridges_session';

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      cookies[key] = value;
      return cookies;
    }, {});
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/',
  };
}

function setSessionCookie(res, accessToken, expiresAt) {
  const options = getCookieOptions();

  if (expiresAt) {
    options.expires = new Date(expiresAt * 1000);
  }

  res.cookie(SESSION_COOKIE_NAME, accessToken, options);
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
}

function getAccessTokenFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, bearerToken] = authHeader.split(' ');

  if (scheme === 'Bearer' && bearerToken) {
    return bearerToken;
  }

  const cookies = parseCookies(req.headers.cookie || '');
  return cookies[SESSION_COOKIE_NAME] || null;
}

module.exports = {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  getAccessTokenFromRequest,
  setSessionCookie,
};
