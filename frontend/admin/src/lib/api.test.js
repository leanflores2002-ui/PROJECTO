import { afterEach, expect, test, vi } from 'vitest';
import { apiRequest } from './api';

afterEach(() => vi.unstubAllGlobals());
test.each([401,403,404,409,422,500,503])('handles HTTP %s without object coercion', async (status) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok:false, status, text:async () => JSON.stringify({detail:{internal:'do not display'}}) }));
  await expect(apiRequest('/test')).rejects.toMatchObject({status});
  await expect(apiRequest('/test')).rejects.not.toThrow('[object Object]');
});
test('formats field validation and sends authorization', async () => {
  const fetch=vi.fn().mockResolvedValue({ok:false,status:422,text:async () => JSON.stringify({detail:[{loc:['body','stock'],msg:'Must be positive'}]})});
  vi.stubGlobal('fetch',fetch);
  await expect(apiRequest('/test',{token:'qa'})).rejects.toThrow('stock: Must be positive');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer qa');
});
