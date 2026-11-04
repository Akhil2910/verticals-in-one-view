// Exports the database as two plain PostgreSQL scripts for psql, written to <out-dir>:
//   nium_full.sql  tables (db/migrations) + data, for an EMPTY database
//   nium_data.sql  data only; replaces all records and sign-in sessions in a database
//                  the app has already set up
// Both run in one transaction. They hold password hashes and project documents:
// keep them out of git and delete them once loaded.
// Usage: DATABASE_URL=postgres://... node scripts/export-sql.mjs <out-dir>
//   then: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f nium_data.sql
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const TABLES = ["verticals", "users", "projects", "project_files"];

const url = process.env.DATABASE_URL;
const out = process.argv[2];
if (!url || !out) {
  console.error("Usage: DATABASE_URL=postgres://... node scripts/export-sql.mjs <out-dir>");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  const head = (what) => `-- NIUM Project Records: ${what}
-- Exported ${new Date().toISOString().slice(0, 10)}. PostgreSQL 13 or later.
-- Contains password hashes and uploaded documents: do not commit or share.
-- Load with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <this file>
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
BEGIN;
`;

  let data = "";
  for (const t of TABLES) {
    const cols = (await sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${t} order by ordinal_position`).map((c) => c.column_name);
    // quote_nullable(col::text) gives a literal that Postgres coerces back to the column's type.
    const rows = await sql.unsafe(`select ${cols.map((c) => `quote_nullable("${c}"::text)`).join(" || ', ' || ")} as v from ${t} order by ${t === "verticals" ? "name" : "created_at, id"}`);
    data += `\n-- ${t}: ${rows.length} rows\n`;
    for (const r of rows) data += `INSERT INTO ${t} (${cols.join(", ")}) VALUES (${r.v});\n`;
    console.log(`${t}: ${rows.length}`);
  }

  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
  let schema = "\n-- Schema (db/migrations), recorded so the app does not apply it again\n";
  schema += "CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());\n";
  for (const f of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort())
    schema += `\n-- ${f}\n${(await readFile(path.join(dir, f), "utf8")).trim()}\nINSERT INTO schema_migrations (name) VALUES ('${f}');\n`;

  const wipe = ["project_files", "projects", "sessions", "users", "verticals"].map((t) => `DELETE FROM ${t};\n`).join("");
  await writeFile(path.join(out, "nium_full.sql"), head("full database (tables + data), for an EMPTY database") + schema + data + "\nCOMMIT;\n");
  await writeFile(path.join(out, "nium_data.sql"), head("data only. REPLACES all records (and signs everyone out) in a database the app already set up") + "\n" + wipe + data + "\nCOMMIT;\n");
  console.log(`wrote ${path.join(out, "nium_full.sql")} and nium_data.sql`);
} finally {
  await sql.end();
}
