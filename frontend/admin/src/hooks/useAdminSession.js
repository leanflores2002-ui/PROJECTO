import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { supabase } from '../lib/supabase';

export function useAdminSession() {
  const [state, setState] = useState({ status: 'loading', session: null, admin: null, error: null });

  useEffect(() => {
    if (!supabase) {
      setState({ status: 'unconfigured', session: null, admin: null, error: null });
      return undefined;
    }
    let active = true;
    let currentToken;
    let revision = 0;

    async function validate(session) {
      if (session?.access_token === currentToken && currentToken) return;
      currentToken = session?.access_token;
      const requestRevision = ++revision;
      if (!session) {
        if (active) setState({ status: 'signed-out', session: null, admin: null, error: null });
        return;
      }

      // Force the login screen to unmount while the backend validates the
      // Supabase session. If validation fails, LoginPage mounts again with
      // the backend error instead of silently staying on the same screen.
      if (active) setState({ status: 'loading', session, admin: null, error: null });

      try {
        const admin = await apiRequest('/api/admin/session', { token: session.access_token });
        if (active && requestRevision === revision) setState({ status: 'authenticated', session, admin, error: null });
      } catch (error) {
        if (!active || requestRevision !== revision) return;
        await supabase.auth.signOut();
        if (active) {
          setState({
            status: 'signed-out',
            session: null,
            admin: null,
            error: error?.message || 'No se pudo validar el acceso administrativo.',
          });
        }
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // INITIAL_SESSION provides initial state; keep the auth callback synchronous.
      queueMicrotask(() => { if (active) validate(session); });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
