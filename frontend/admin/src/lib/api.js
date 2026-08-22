import { config } from '../config';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest(path, { token, method = 'GET', body, signal } = {}) {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const detail = payload?.detail;
    const fallback = raw && raw.length < 240 ? raw : '';
    const message = detail || fallback || `Error HTTP ${response.status} al llamar ${path}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}
