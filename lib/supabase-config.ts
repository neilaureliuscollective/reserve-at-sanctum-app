// Both names are supported while existing deployments move to publishable keys.
// These are public browser keys; database credentials stay server-only.
// All environments use their configured project rather than a hardcoded backend.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = () => Boolean(supabaseUrl && supabaseKey);
