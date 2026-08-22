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

    async function validate(session) {
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
        if (active) setState({ status: 'authenticated', session, admin, error: null });
      } catch (error) {
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

    supabase.auth.getSession().then(({ data }) => validate(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      validate(session);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
