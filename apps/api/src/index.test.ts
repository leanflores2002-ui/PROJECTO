import { describe, expect, it } from 'vitest';
import { app } from './index';
import type { Env } from './env';

const context = {
  waitUntil() {},
  passThroughOnException() {},
} as unknown as ExecutionContext;

function request(path: string, init?: RequestInit) {
  return app.fetch(new Request(`https://api.example.test${path}`, init), {}, context);
}

function catalogDb() {
  const rows = [{
    id: 'mujer-calza-demo',
    section: 'mujer',
    type: 'calzas',
    name: 'Calza demo ROMIX',
    season: 'invierno',
    image: 'images/products/demo.webp',
    price: 11500,
    price_by_group_json: '{"common":11500}',
    special_sizes_json: '[6,7,8]',
    colors_json: '[]',
    sizes_json: '["1","2"]',
    visible: 1,
  }];
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        all: async () => ({ results: sql.includes('catalog_products') && args.includes('%demo%') ? rows : [] }),
        first: async () => rows[0],
      }),
      all: async () => ({ results: rows }),
      first: async () => ({ ok: 1 }),
    }),
  } as unknown as D1Database;
}

describe('Cloudflare API', () => {
  it('returns the cloudflare health contract', async () => {
    const response = await request('/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', runtime: 'cloudflare' });
  });

  it('returns a safe status when D1 is not bound', async () => {
    const response = await request('/api/health/database');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: 'unavailable',
      runtime: 'cloudflare',
      database: 'not_configured',
    });
  });

  it('verifies a D1 binding without exposing details', async () => {
    const env: Env = {
      DB: { prepare: () => ({ first: async () => ({ ok: 1 }) }) } as unknown as D1Database,
    };
    const response = await app.fetch(
      new Request('https://api.example.test/api/health/database'),
      env,
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', runtime: 'cloudflare', database: 'connected' });
  });

  it('keeps admin routes protected by Access', async () => {
    const response = await request('/api/admin');
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'admin_access_required' });
  });

  it('validates public search input', async () => {
    const response = await request('/api/public/search?q=');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'invalid_query' });
  });

  it('lists catalog products from D1', async () => {
    const response = await app.fetch(
      new Request('https://api.example.test/api/public/products?q=demo'),
      { DB: catalogDb() },
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      count: 1,
      items: [{ id: 'mujer-calza-demo', name: 'Calza demo ROMIX', price: 11500 }],
      status: 'ok',
    });
  });
});
