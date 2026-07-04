import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS.
 * Server-side only. Never import this in client components or pages rendered
 * on the client. Requires SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local and Vercel env vars.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
