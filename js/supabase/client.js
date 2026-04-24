import { APP_SCHEMA, SUPABASE_ANON_KEY, SUPABASE_URL } from "../config.js";

export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    db: {
      schema: APP_SCHEMA,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);