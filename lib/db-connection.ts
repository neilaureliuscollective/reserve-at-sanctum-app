// The direct Supabase host is IPv6-only on this project. Vercel's serverless
// runtime needs the transaction pooler for the same database and credentials.
export function serverlessDatabaseUrl(value: string) {
  const url = new URL(value);
  const ref = "wfbiytzlaokchfaxgwtt";
  if (
    url.hostname === `db.${ref}.supabase.co` &&
    url.username === "postgres" &&
    (url.port === "5432" || url.port === "")
  ) {
    url.hostname = "aws-0-us-west-2.pooler.supabase.com";
    url.port = "6543";
    url.username = `postgres.${ref}`;
    return url.toString();
  }
  return value;
}
