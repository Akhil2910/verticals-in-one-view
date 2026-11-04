// Loads a file made by export-data.mjs into an empty database, in one transaction.
// Run migrations first (the server does this on start, or `npm run db:migrate`).
// Usage: DATABASE_URL=postgres://... node scripts/restore-data.mjs <file.json>
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const TABLES = ["verticals", "users", "projects", "project_files"];

const url = process.env.DATABASE_URL;
const file = process.argv[2];
if (!url || !file) {
  console.error("Usage: DATABASE_URL=postgres://... node scripts/restore-data.mjs <file.json>");
  process.exit(1);
}

const data = JSON.parse(await readFile(file, "utf8"));
if (data.format !== "nium-data") {
  console.error(`${file} is not a NIUM data export.`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  // Never merge into live data: restoring is only for a fresh database.
  for (const t of TABLES) {
    const [{ n }] = await sql`select count(*)::int as n from ${sql(t)}`;
    if (n > 0) throw new Error(`${t} already has ${n} rows; restore needs an empty database.`);
  }
  await sql.begin(async (tx) => {
    for (const t of TABLES) {
      const rows = data.tables[t] ?? [];
      if (rows.length) await tx`insert into ${tx(t)} select * from jsonb_populate_recordset(null::${tx(t)}, ${tx.json(rows)})`;
      console.log(`${t}: ${rows.length}`);
    }
  });
  console.log("restored");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
