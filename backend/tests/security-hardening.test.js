const assert = require('node:assert/strict');
const http = require('node:http');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || 'service-role-test-key';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-test-key';

const { createApp } = require('../src/app');
const { createAuthRouter } = require('../src/routes/auth');

async function withServer(app, run) {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function main() {
  await runTest('allowed frontend origin receives CORS headers', async () => {
    process.env.FRONTEND_URL = 'https://skills-bridges.vercel.app';

    const app = createApp({
      authRoutes: createAuthRouter({
        requireAuth(req, res, next) {
          req.user = { id: 'user-1', email: 'judge@example.com' };
          req.company = { id: 'company-1', name: 'Judge Co' };
          next();
        },
      }),
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/session`, {
        headers: {
          Origin: 'https://skills-bridges.vercel.app',
        },
      });

      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get('access-control-allow-origin'),
        'https://skills-bridges.vercel.app',
      );
    });
  });

  await runTest('disallowed frontend origin does not receive CORS headers', async () => {
    process.env.FRONTEND_URL = 'https://skills-bridges.vercel.app';

    const app = createApp({
      authRoutes: createAuthRouter({
        requireAuth(req, res, next) {
          req.user = { id: 'user-1', email: 'judge@example.com' };
          req.company = { id: 'company-1', name: 'Judge Co' };
          next();
        },
      }),
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/session`, {
        headers: {
          Origin: 'https://attacker.example.com',
        },
      });

      assert.equal(response.status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), null);
    });
  });

  await runTest('login response relies on cookie auth and does not expose access tokens', async () => {
    process.env.FRONTEND_URL = 'https://skills-bridges.vercel.app';

    const app = createApp({
      authRoutes: createAuthRouter({
        supabaseAuth: {
          auth: {
            async signInWithPassword() {
              return {
                data: {
                  user: { id: 'user-1', email: 'judge@example.com' },
                  session: {
                    access_token: 'secret-token',
                    expires_at: 1_900_000_000,
                    user: { id: 'user-1', email: 'judge@example.com' },
                  },
                },
              };
            },
          },
        },
        ensureCompanyForEmail: async () => ({ id: 'company-1', name: 'Judge Co' }),
      }),
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://skills-bridges.vercel.app',
        },
        body: JSON.stringify({
          email: 'judge@example.com',
          password: 'correct horse battery staple',
        }),
      });

      assert.equal(response.status, 200);
      assert.match(response.headers.get('set-cookie') || '', /skills_bridges_session=/);

      const body = await response.json();
      assert.equal(body.accessToken, undefined);
      assert.deepEqual(body.user, { id: 'user-1', email: 'judge@example.com' });
    });
  });

  await runTest('session response does not expose access tokens', async () => {
    process.env.FRONTEND_URL = 'https://skills-bridges.vercel.app';

    const app = createApp({
      authRoutes: createAuthRouter({
        requireAuth(req, res, next) {
          req.user = { id: 'user-1', email: 'judge@example.com' };
          req.company = { id: 'company-1', name: 'Judge Co' };
          req.accessToken = 'secret-token';
          next();
        },
      }),
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/session`, {
        headers: {
          Origin: 'https://skills-bridges.vercel.app',
        },
      });

      assert.equal(response.status, 200);

      const body = await response.json();
      assert.equal(body.accessToken, undefined);
      assert.deepEqual(body.user, { id: 'user-1', email: 'judge@example.com' });
    });
  });

  await runTest('auth endpoints rate limit repeated login attempts', async () => {
    process.env.FRONTEND_URL = 'https://skills-bridges.vercel.app';
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '2';
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';

    const app = createApp({
      authRoutes: createAuthRouter({
        supabaseAuth: {
          auth: {
            async signInWithPassword() {
              return {
                data: {
                  user: { id: 'user-1', email: 'judge@example.com' },
                  session: {
                    access_token: 'secret-token',
                    expires_at: 1_900_000_000,
                    user: { id: 'user-1', email: 'judge@example.com' },
                  },
                },
              };
            },
          },
        },
        ensureCompanyForEmail: async () => ({ id: 'company-1', name: 'Judge Co' }),
      }),
    });

    await withServer(app, async (baseUrl) => {
      const request = () =>
        fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://skills-bridges.vercel.app',
          },
          body: JSON.stringify({
            email: 'judge@example.com',
            password: 'correct horse battery staple',
          }),
        });

      assert.equal((await request()).status, 200);
      assert.equal((await request()).status, 200);
      assert.equal((await request()).status, 429);
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
