import { Hono } from 'hono';
import { SearchQuerySchema } from '@romix/shared';
import type { Env } from '../env';
import { getCatalogProduct, listCatalogProducts } from '../catalog';

export const publicRoutes = new Hono<{ Bindings: Env }>();

publicRoutes.get('/', (c) => c.json({ status: 'ok', scope: 'public' }));

publicRoutes.get('/products', async (c) => {
  const items = await listCatalogProducts(c.env, {
    query: c.req.query('q'),
    section: c.req.query('section'),
    type: c.req.query('type'),
    limit: Number(c.req.query('limit')) || 60,
  });
  return c.json({ items, count: items.length, status: 'ok' });
});

publicRoutes.get('/products/:id', async (c) => {
  const product = await getCatalogProduct(c.env, c.req.param('id'));
  if (!product) return c.json({ error: 'product_not_found' }, 404);
  return c.json(product);
});

publicRoutes.get('/search', async (c) => {
  const parsed = SearchQuerySchema.safeParse({ q: c.req.query('q') });
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', fields: parsed.error.flatten().fieldErrors }, 400);
  }
  const items = await listCatalogProducts(c.env, { query: parsed.data.q, limit: 60 });
  return c.json({ items, query: parsed.data.q, status: 'ok' });
});
