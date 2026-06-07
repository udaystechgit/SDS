# SDS

## Supabase Backend

This project now includes a Supabase backend foundation.

1. Copy `.env.example` to `.env` and set values:
	1. `VITE_SUPABASE_URL`
	2. `VITE_SUPABASE_ANON_KEY`
	3. `SUPABASE_SERVICE_ROLE_KEY`
2. Run the migration in `supabase/migrations/20260606_init.sql`.
3. Start the app and use Admin Jobs / Careers routes.

Design details: `docs/backend-supabase.md`

### Vercel + Supabase

If your Supabase project is already connected to Vercel, set these Environment Variables in Vercel Project Settings for Production, Preview, and Development:

1. VITE_SUPABASE_URL
2. VITE_SUPABASE_ANON_KEY
3. SUPABASE_SERVICE_ROLE_KEY

Notes:
1. VITE_ variables are embedded into the client build.
2. SUPABASE_SERVICE_ROLE_KEY is server-only and must never be exposed in client code.
3. After updating variables, redeploy on Vercel so build-time values are refreshed.