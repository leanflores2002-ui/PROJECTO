import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HealthResponseSchema } from '@romix/shared';
import type { Env } from './env';
import { isAllowedOrigin } from './config';
import { adminRoutes } from './routes/admin';
import { publicRoutes } from './routes/public';
import { InventoryDurableObject } from './durable-objects/inventory';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (c, next) => {
  const origin = c.req.header('Origin');
  const corsMiddleware = cors({
    origin: isAllowedOrigin(c.env, origin) ? origin : '',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });
  return corsMiddleware(c, next);
});

app.get('/api/health', (c) => {
  const response = { status: 'ok' as const, runtime: 'cloudflare' as const };
  return c.json(HealthResponseSchema.parse(response));
});

app.get('/api/health/database', async (c) => {
  if (!c.env.DB) {
    return c.json({ status: 'unavailable', runtime: 'cloudflare', database: 'not_configured' }, 503);
  }
  try {
    const row = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
    if (row?.ok !== 1) {
      return c.json({ status: 'unavailable', runtime: 'cloudflare', database: 'not_ready' }, 503);
    }
    return c.json({ status: 'ok', runtime: 'cloudflare', database: 'connected' });
  } catch {
    return c.json({ status: 'unavailable', runtime: 'cloudflare', database: 'error' }, 503);
  }
});

app.route('/api/public', publicRoutes);
app.route('/api/admin', adminRoutes);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((error, c) => {
  console.error('Unhandled API error', error);
  return c.json({ error: 'internal_error' }, 500);
});

export { app, InventoryDurableObject };
export default app;
