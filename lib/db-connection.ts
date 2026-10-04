// Supply the intended direct or pooler URL explicitly. Never silently redirect projects.
export function serverlessDatabaseUrl(value:string){const url=new URL(value);if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('Postgres connection required.');return value;}
