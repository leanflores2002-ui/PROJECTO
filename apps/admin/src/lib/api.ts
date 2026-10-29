import type { HealthResponse } from '@romix/shared';

export function getApiBaseUrl(): string {
  const fallback = import.meta.env.PROD
    ? 'https://romix-api.lean-flores2002.workers.dev'
    : 'http://localhost:8787';
  return String(import.meta.env.VITE_API_BASE_URL || fallback).replace(/\/$/, '');
}

export async function getApiHealth(): Promise<HealthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/health`);
  if (!response.ok) throw new Error(`API health failed: ${response.status}`);
  return response.json() as Promise<HealthResponse>;
}
