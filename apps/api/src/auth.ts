import type { Context, Next } from 'hono';
import type { Env, AccessContext, AccessIdentity } from './env';
import { allowedAdminEmails } from './config';

function accessContext(c: Context<{ Bindings: Env; Variables: AdminVariables }>): AccessContext {
  return c.executionCtx as AccessContext;
}

export async function requireAdminAccess(
  c: Context<{ Bindings: Env; Variables: AdminVariables }>,
  next: Next,
) {
  const access = accessContext(c).access;
  if (!access) {
    return c.json({ error: 'admin_access_required' }, 401);
  }

  const expectedAudience = String(c.env.ADMIN_ACCESS_AUDIENCE || '').trim();
  if (expectedAudience && access.aud !== expectedAudience) {
    return c.json({ error: 'admin_access_invalid' }, 403);
  }

  const identity: AccessIdentity | undefined = await access.getIdentity();
  const email = String(identity?.email || '').trim().toLowerCase();
  const allowedEmails = allowedAdminEmails(c.env);
  if (allowedEmails.size > 0 && !allowedEmails.has(email)) {
    return c.json({ error: 'admin_access_forbidden' }, 403);
  }

  c.set('adminIdentity', identity || {});
  await next();
}

export type AdminVariables = {
  adminIdentity: AccessIdentity;
};
