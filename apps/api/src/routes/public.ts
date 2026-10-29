import { Hono } from 'hono';
import { SearchQuerySchema } from '@romix/shared';
import type { Env } from '../env';

export const publicRoutes = new Hono<{ Bindings: Env }>();

publicRoutes.get('/', (c) => c.json({ status: 'ok', scope: 'public' }));

publicRoutes.get('/search', (c) => {
  const parsed = SearchQuerySchema.safeParse({ q: c.req.query('q') });
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', fields: parsed.error.flatten().fieldErrors }, 400);
  }
  return c.json({ items: [], query: parsed.data.q, status: 'catalog_migration_pending' });
});
