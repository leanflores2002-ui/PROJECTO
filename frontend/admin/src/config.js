const trimSlash = (value) => String(value || '').replace(/\/+$/, '');

export const config = Object.freeze({
  apiUrl: trimSlash(import.meta.env.VITE_API_URL || 'http://localhost:8000'),
  publicSiteUrl: trimSlash(import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:8000'),
  supabaseUrl: trimSlash(import.meta.env.VITE_SUPABASE_URL || ''),
  supabaseKey:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    '',
  adminPath: `/${String(import.meta.env.VITE_ADMIN_PATH || '/admin').replace(/^\/+|\/+$/g, '')}`,
});

export const hasAuthConfig = Boolean(config.supabaseUrl && config.supabaseKey);

export function isAllowedAdminPath(pathname = window.location.pathname) {
  if (config.adminPath === '/') return true;
  return pathname === config.adminPath || pathname.startsWith(`${config.adminPath}/`);
}
