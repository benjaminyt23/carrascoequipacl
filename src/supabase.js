import { createClient } from '@supabase/supabase-js';

// Vite incorpora estas variables públicas al navegador. Nunca uses service_role.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key && !url.includes('TU-PROYECTO') && !key.includes('TU-CLAVE')
  ? createClient(url, key)
  : null;
