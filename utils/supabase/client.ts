import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Support both the new publishable key name and the classic anon key name
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "[Supabase] Missing env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  );
}

let client: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () => {
  try {
    if (typeof window === "undefined") {
      return createBrowserClient(supabaseUrl || "", supabaseKey || "");
    }
    if (!client) {
      client = createBrowserClient(supabaseUrl || "", supabaseKey || "");
    }
    return client;
  } catch (err) {
    console.error("[Supabase Client] Failed to create browser client:", err);
    // Return a dummy browser client to prevent render-phase crashes and let auth queries fail gracefully instead of hanging
    return createBrowserClient("https://dummy-url.supabase.co", "dummy-key");
  }
};
