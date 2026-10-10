import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client met de service-role sleutel (omzeilt RLS).
 * Nooit importeren in een client component; de sleutel heeft geen NEXT_PUBLIC_-prefix.
 * Autorisatie per bedrijf gebeurt in lib/store-supabase.ts via company_id.
 */
export const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
