function parseAllowedOrigins(envValue) {
  return (envValue || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getAllowedOrigins() {
  const combinedOrigins = [
    ...parseAllowedOrigins(process.env.FRONTEND_URL),
    ...parseAllowedOrigins(process.env.FRONTEND_URLS),
  ];

  return [...new Set(combinedOrigins)];
}

function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    return process.env.NODE_ENV !== 'production';
  }

  return allowedOrigins.includes(origin);
}

module.exports = {
  getAllowedOrigins,
  isOriginAllowed,
};
