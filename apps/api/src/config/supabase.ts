// apps/api/src/config/supabase.ts
// Supabase client configuration for server-side use

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Singleton instance
let supabase: SupabaseClient | null = null;

/**
 * Get the Supabase client instance.
 * Uses the service role key for server-side operations.
 * Throws if environment variables are not configured.
 */
export function getSupabaseClient(): SupabaseClient {
    if (supabase) {
        return supabase;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error(
            "Missing Supabase configuration. Ensure SUPABASE_URL and SUPABASE_SECRET_KEY are set."
        );
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return supabase;
}

/**
 * Check if Supabase is configured (environment variables are set).
 * Use this to gracefully degrade when Supabase is not available.
 */
export function isSupabaseConfigured(): boolean {
    return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
