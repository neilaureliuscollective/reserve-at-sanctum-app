// Reserve and Gent Ascend use one Auth project, with separate app sessions and
// permissions. Production must never fall back to the former Reserve project.
export const SHARED_AUTH_PROJECT_REF = "volpzkfsnmtztrovexcw";
const production = process.env.NODE_ENV === "production";
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = () =>
  Boolean(supabaseUrl && supabaseKey &&
    (!production || supabaseUrl === `https://${SHARED_AUTH_PROJECT_REF}.supabase.co`));
