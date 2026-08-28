import { createClient } from "@supabase/supabase-js";

function readSupabaseEnv() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    anonKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey:
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY,
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

export function getSupabaseServerUserClient(accessToken: string) {
  const { url, anonKey } = readSupabaseEnv();

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
