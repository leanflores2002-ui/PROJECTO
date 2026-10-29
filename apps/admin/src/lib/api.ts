import type { HealthResponse } from '@romix/shared';

export function getApiBaseUrl(): string {
  return String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
}

export async function getApiHealth(): Promise<HealthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/health`);
  if (!response.ok) throw new Error(`API health failed: ${response.status}`);
  return response.json() as Promise<HealthResponse>;
}
