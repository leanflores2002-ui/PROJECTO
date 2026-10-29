import { Hono } from 'hono';
import type { Env } from '../env';
import { requireAdminAccess, type AdminVariables } from '../auth';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: AdminVariables }>();

adminRoutes.use('*', requireAdminAccess);

adminRoutes.get('/', (c) => {
  const identity = c.get('adminIdentity');
  return c.json({
    status: 'ok',
    scope: 'admin',
    identity: { email: identity.email || null, name: identity.name || null },
  });
});
