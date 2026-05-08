function createRateLimitMiddleware(options = {}) {
  const windowMs = Number(options.windowMs || 60_000);
  const maxRequests = Number(options.maxRequests || 5);
  const message = options.message || 'Too many requests. Please try again later.';
  const buckets = new Map();

  function getClientKey(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : String(forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

    return `${ip}:${req.path}`;
  }

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = getClientKey(req);
    const entry = buckets.get(key);

    if (!entry || now >= entry.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: message });
      return;
    }

    entry.count += 1;
    next();
  };
}

module.exports = {
  createRateLimitMiddleware,
};
