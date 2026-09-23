// Both names are supported while existing deployments move to publishable keys.
// These are public browser keys; database credentials stay server-only.
// The Reserve production project is fixed. Its publishable key is intended for
// browser use; all privileges still come from verified sessions and private DB
// roles. Keep development configurable for the isolated synthetic preview.
const production = process.env.NODE_ENV === "production";
export const supabaseUrl = production
  ? "https://wfbiytzlaokchfaxgwtt.supabase.co"
  : process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey = production
  ? "sb_publishable_l8IRIHK2Vey-AAeTmj3RUw_lRpEe5Ts"
  : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = () => Boolean(supabaseUrl && supabaseKey);
