import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role client. Bypasses RLS — use ONLY in trusted server code
 * (Server Actions, Route Handlers) and never expose the key to the client.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
