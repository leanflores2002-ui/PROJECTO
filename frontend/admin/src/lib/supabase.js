import { createClient } from '@supabase/supabase-js';
import { config, hasAuthConfig } from '../config';

export const supabase = hasAuthConfig
  ? createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
