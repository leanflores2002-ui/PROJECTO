import { describe, expect, it } from 'vitest';
import { getApiBaseUrl } from './api';

describe('admin API configuration', () => {
  it('uses a local Cloudflare API by default', () => {
    expect(getApiBaseUrl()).toBe('http://localhost:8787');
  });
});
