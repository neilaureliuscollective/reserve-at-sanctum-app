import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./supabase-config";

export function browserSupabase() {
  const url = supabaseUrl;
  const key = supabaseKey;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
