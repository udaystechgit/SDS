import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

const SIGNED_STORAGE_UPLOAD_PATH = "/storage/v1/object/upload/sign/";

async function supabaseBrowserFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (!requestUrl.includes(SIGNED_STORAGE_UPLOAD_PATH)) {
    return fetch(input, init);
  }

  // A Supabase signed upload URL already carries its own temporary token.
  // Do not attach the browser client's API/auth credentials to that request.
  const headers = new Headers(init?.headers);
  headers.delete("authorization");
  headers.delete("apikey");

  return fetch(input, {
    ...init,
    headers,
  });
}

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  browserClient = createClient(url, anonKey, {
    global: {
      fetch: supabaseBrowserFetch,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
