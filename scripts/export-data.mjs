// Exports all records (verticals, users, projects, files) to one JSON file, for moving
// data to another server. Sign-in sessions are left out. The file holds password hashes
// and project documents: keep it out of git and delete it once restored.
// Usage: DATABASE_URL=postgres://... node scripts/export-data.mjs <out.json>
import { writeFile } from "node:fs/promises";
import postgres from "postgres";

const TABLES = ["verticals", "users", "projects", "project_files"];

const url = process.env.DATABASE_URL;
const out = process.argv[2];
if (!url || !out) {
  console.error("Usage: DATABASE_URL=postgres://... node scripts/export-data.mjs <out.json>");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  const tables = {};
  for (const t of TABLES) {
    // to_jsonb gives version-independent text: dates as YYYY-MM-DD, bytea as \x hex.
    tables[t] = (await sql`select to_jsonb(r) as row from ${sql(t)} r`).map((r) => r.row);
    console.log(`${t}: ${tables[t].length}`);
  }
  await writeFile(out, JSON.stringify({ format: "nium-data", version: 1, exported_at: new Date().toISOString(), tables }));
  console.log(`wrote ${out}`);
} finally {
  await sql.end();
}
