import { createClient } from "@supabase/supabase-js";

// Service-role client for the /admin backend. Bypasses RLS — server-side only,
// and only behind the isAdmin() cookie gate.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
