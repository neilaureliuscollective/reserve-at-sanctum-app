// Public credentials are configured per environment; secrets never reach this module.
export const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const hasSupabase=()=>Boolean(supabaseUrl&&supabaseKey);
