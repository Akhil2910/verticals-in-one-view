// Loads a file made by export-data.mjs, in one transaction.
// Run migrations first (the server does this on start, or `npm run db:migrate`).
// Usage: DATABASE_URL=postgres://... node scripts/restore-data.mjs <file.json> [--replace]
//   --replace  deletes all existing records (and sign-in sessions) first. The current
//              records are saved next to <file.json> as nium-data-before-replace-<time>.json.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const TABLES = ["verticals", "users", "projects", "project_files"];

const url = process.env.DATABASE_URL;
const args = process.argv.slice(2);
const replace = args.includes("--replace");
const file = args.find((a) => !a.startsWith("--"));
if (!url || !file) {
  console.error("Usage: DATABASE_URL=postgres://... node scripts/restore-data.mjs <file.json> [--replace]");
  process.exit(1);
}

const data = JSON.parse(await readFile(file, "utf8"));
if (data.format !== "nium-data") {
  console.error(`${file} is not a NIUM data export.`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  const counts = {};
  for (const t of TABLES) counts[t] = (await sql`select count(*)::int as n from ${sql(t)}`)[0].n;
  const existing = TABLES.filter((t) => counts[t] > 0);

  if (existing.length && !replace)
    throw new Error(`The database already has records (${existing.map((t) => `${t}: ${counts[t]}`).join(", ")}). Add --replace to overwrite them.`);

  if (existing.length) {
    // Keep what is about to be deleted, in the same format, so it can be put back.
    const tables = {};
    for (const t of TABLES) tables[t] = (await sql`select to_jsonb(r) as row from ${sql(t)} r`).map((r) => r.row);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backup = path.join(path.dirname(file), `nium-data-before-replace-${stamp}.json`);
    await writeFile(backup, JSON.stringify({ format: "nium-data", version: 1, exported_at: new Date().toISOString(), tables }));
    console.log(`saved the current records to ${backup}`);
  }

  await sql.begin(async (tx) => {
    // Children first, so foreign keys never block the delete.
    for (const t of ["project_files", "projects", "sessions", "users", "verticals"]) await tx`delete from ${tx(t)}`;
    for (const t of TABLES) {
      const rows = data.tables[t] ?? [];
      if (rows.length) await tx`insert into ${tx(t)} select * from jsonb_populate_recordset(null::${tx(t)}, ${tx.json(rows)})`;
      console.log(`${t}: ${rows.length}`);
    }
  });
  console.log(existing.length ? "replaced" : "restored");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
