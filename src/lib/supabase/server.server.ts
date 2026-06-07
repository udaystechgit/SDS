import { createClient } from "@supabase/supabase-js";

function readSupabaseEnv() {
  return {
    url: process.env.VITE_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getSupabaseServerClient() {
  const { url, serviceRoleKey } = readSupabaseEnv();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
