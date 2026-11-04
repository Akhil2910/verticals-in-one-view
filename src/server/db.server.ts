// Postgres connection for server functions. Server-only: import it with
// `await import("@/server/db.server")` inside handlers, never at the top of a
// route or *.functions.ts file (those also ship to the browser).
import postgres from "postgres";

function connect() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set.");
  // TLS comes from the URL itself (…?sslmode=require on AWS RDS).
  return postgres(url, {
    max: Number(process.env["DATABASE_POOL_SIZE"] ?? 10),
    onnotice: () => {},
    types: {
      // The UI works with plain numbers and YYYY-MM-DD / ISO strings, as it did with Supabase.
      numeric: { to: 1700, from: [1700], serialize: (v: number) => String(v), parse: (v: string) => Number(v) },
      date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v },
      timestamptz: { to: 1184, from: [1184], serialize: (v: string) => v, parse: (v: string) => new Date(v).toISOString() },
    },
  });
}

let _sql: ReturnType<typeof connect> | undefined;

export const db = () => (_sql ??= connect());
