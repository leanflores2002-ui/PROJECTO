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
});
