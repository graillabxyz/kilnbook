import { createClient } from "@supabase/supabase-js";
import { readClientSupabaseEnv } from "../env";

export function isSupabaseBrowserConfigured() {
  return readClientSupabaseEnv().success;
}

export function createSupabaseBrowserClient() {
  const parsed = readClientSupabaseEnv();
  if (!parsed.success) {
    throw new Error(
      "Supabase browser client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createClient(
    parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    },
  );
}

export function getSupabaseOAuthRedirectTo(next = "/") {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({ next: next.startsWith("/") ? next : "/" });
  return `${origin}/auth/callback?${params.toString()}`;
}

export function signInWithGoogle(next = "/") {
  const supabase = createSupabaseBrowserClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getSupabaseOAuthRedirectTo(next),
    },
  });
}

export function signOutOfSupabase() {
  const supabase = createSupabaseBrowserClient();
  return supabase.auth.signOut();
}
