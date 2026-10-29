import type { Env } from './env';

const DEVELOPMENT_ORIGINS = new Set([
  'http://localhost:4321',
  'http://localhost:5173',
  'http://127.0.0.1:4321',
  'http://127.0.0.1:5173',
]);

export function allowedOrigins(env: Env): Set<string> {
  const configured = String(env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const origins = new Set(configured);
  if ((env.ENVIRONMENT || 'development') === 'development') {
    DEVELOPMENT_ORIGINS.forEach((origin) => origins.add(origin));
  }
  origins.delete('*');
  return origins;
}

export function isAllowedOrigin(env: Env, origin: string | undefined): boolean {
  return Boolean(origin && allowedOrigins(env).has(origin.replace(/\/$/, '')));
}

export function allowedAdminEmails(env: Env): Set<string> {
  return new Set(
    String(env.ADMIN_ALLOWED_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}
