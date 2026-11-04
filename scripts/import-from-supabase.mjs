// Copies verticals, logins and projects from the old Supabase (Lovable Cloud) database
// into the new Postgres database. Ids are kept, so links between rows stay intact.
// Safe to re-run: rows that already exist are skipped.
//
// Logins keep their Supabase password when the source includes auth.users (a full backup,
// or auth_users.csv). Otherwise each gets a random temporary password and must choose a
// new one at first sign-in; those are written to import-output/ for the admin to hand out.
//
// Source, either:
//   A) Live Supabase API (needs the service-role key):
//      SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... \
//        npm run db:import-supabase
//   B) CSV exports of the three tables (verticals.csv, user_roles.csv, projects.csv) in one folder:
//      DATABASE_URL=... npm run db:import-supabase -- --csv ./supabase-export
//      verticals.csv and user_roles.csv are optional: without them, verticals come from the
//      projects' vertical_name column and no logins are imported.
//   C) A single projects export from the app (has a vertical_name column):
//      DATABASE_URL=... npm run db:import-supabase -- --csv ./NIUM_Project_Records.csv
//   D) A full database backup (.backup file from Lovable Cloud / Supabase, unzipped). Best option:
//      it includes auth.users, so everyone keeps their current password.
//      DATABASE_URL=... npm run db:import-supabase -- --backup ./verticals-in-one-view.backup
//   With CSVs, an auth_users.csv export (columns id, encrypted_password) does the same.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";
import { openPgDump } from "./lib/pgdump.mjs";

const scryptAsync = promisify(scrypt);
// Same format as src/server/auth.server.ts.
async function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

const NUMERIC = ["physical_progress", "total_cost", "amount_received", "expenditure", "amount_receivable", "participants"];
const COLUMNS = [
  "id", "vertical_id", "name", "project_head", "team_members", "start_date", "end_date", "status", "progress_notes",
  "physical_progress", "physical_progress_not_applicable", "milestones_completed", "milestones_pending", "total_cost",
  "amount_received", "expenditure", "amount_receivable", "expected_completion", "issues", "other_info", "participants",
  "updated_by", "updated_by_name", "created_at", "updated_at",
];

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : null;
};
const csvDir = arg("--csv");
const backupFile = arg("--backup");

if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");

const source = backupFile ? fromBackup(backupFile) : csvDir ? await fromCsv(csvDir) : await fromApi();
// Supabase stores bcrypt hashes in auth.users; when we have them, people keep their passwords.
const hashes = new Map((source.authUsers ?? []).filter((a) => a.encrypted_password?.startsWith("$2")).map((a) => [a.id, a.encrypted_password]));
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

try {
  const passwords = [];
  const added = { verticals: 0, projects: 0, keptPasswords: 0 };
  await sql.begin(async (tx) => {
    for (const v of source.verticals) {
      const res = await tx`insert into verticals (id, name, created_at) values (${v.id}, ${v.name}, ${v.created_at ?? new Date().toISOString()})
               on conflict do nothing`;
      added.verticals += res.count;
    }
    const have = new Set((await tx`select id from verticals`).map((r) => r.id));
    const clash = source.verticals.filter((v) => !have.has(v.id));
    if (clash.length)
      throw new Error(
        `Verticals already exist under the same names with different ids (${clash.map((v) => v.name).join(", ")}). ` +
          "Run the import on a fresh database, before using the /setup page.",
      );
    for (const u of source.users) {
      if (!u.email) {
        console.warn(`Skipping login ${u.user_id}: no email recorded.`);
        continue;
      }
      const kept = hashes.get(u.user_id);
      const temp = kept ? null : randomBytes(9).toString("base64url");
      const res = await tx`
        insert into users (id, email, password_hash, full_name, role, vertical_id, must_change_password, created_at)
        values (${u.user_id}, ${u.email.toLowerCase()}, ${kept ? `bcrypt$${kept}` : await hashPassword(temp)}, ${u.full_name || null}, ${u.role},
                ${u.vertical_id || null}, ${!kept}, ${u.created_at ?? new Date().toISOString()})
        on conflict do nothing`;
      if (res.count && kept) added.keptPasswords++;
      else if (res.count) passwords.push([u.email, u.full_name ?? "", u.role, temp]);
    }
    const userIds = new Set((await tx`select id from users`).map((r) => r.id));
    for (const p of source.projects) {
      const row = projectRow(p);
      // updated_by pointed at Supabase auth users; keep it only if that login was imported.
      if (row.updated_by && !userIds.has(row.updated_by)) row.updated_by = null;
      added.projects += (await tx`insert into projects ${tx(row)} on conflict do nothing`).count;
    }
  });

  console.log(
    `Added ${added.verticals} verticals, ${added.keptPasswords + passwords.length} logins, ${added.projects} projects (rows already present were skipped).`,
  );
  if (added.keptPasswords) console.log(`${added.keptPasswords} logins keep their existing Supabase password.`);
  if (passwords.length) {
    // One file per run, so a re-run never overwrites passwords that haven't been handed out yet.
    await mkdir("import-output", { recursive: true });
    const out = path.join("import-output", `temp-passwords-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`);
    await writeFile(out, [["email", "full_name", "role", "temporary_password"], ...passwords].map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
    console.log(`Temporary passwords: ${out}. Hand them out privately, then delete the file.`);
  }
} finally {
  await sql.end();
}

// ---------- sources ----------

async function fromApi() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --csv <folder>.");
  const get = async (table) => {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&order=created_at`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
      });
      if (!res.ok) fail(`Reading ${table} failed: ${res.status} ${await res.text()}`);
      const page = await res.json();
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  };
  return { verticals: await get("verticals"), users: await get("user_roles"), projects: await get("projects") };
}

function fromBackup(file) {
  const dump = openPgDump(file);
  const verticals = dump.rows("public.verticals");
  const users = dump.rows("public.user_roles");
  const projects = dump.rows("public.projects");
  if (!verticals || !users || !projects) fail("The backup has no verticals / user_roles / projects tables. Is it the right database?");
  return { verticals, users, projects, authUsers: dump.rows("auth.users") ?? [] };
}

async function fromCsv(target) {
  const single = target.toLowerCase().endsWith(".csv");
  const read = async (name) => {
    try {
      return parseCsv(await readFile(path.join(target, name), "utf8"));
    } catch (e) {
      if (e.code === "ENOENT" && name !== "projects.csv") return null;
      throw e;
    }
  };
  const projects = single ? parseCsv(await readFile(target, "utf8")) : await read("projects.csv");
  const users = single ? [] : ((await read("user_roles.csv")) ?? []);
  const authUsers = single ? [] : ((await read("auth_users.csv")) ?? []);
  let verticals = single ? null : await read("verticals.csv");
  if (!verticals) {
    // Rebuild the vertical list from the projects themselves.
    if (projects.some((p) => !p.vertical_name)) fail("No verticals.csv, and the projects file has no vertical_name column to rebuild verticals from.");
    const byId = new Map(projects.map((p) => [p.vertical_id, p.vertical_name.trim()]));
    verticals = [...byId].map(([id, name]) => ({ id, name }));
    console.log(`Rebuilt ${verticals.length} verticals from the projects file: ${verticals.map((v) => v.name).join(", ")}.`);
    if (!users.length) console.log("No logins in this export; create them on the Users page.");
  }
  return { verticals, users, projects, authUsers };
}

// ---------- helpers ----------

/** Normalises a project from either source (CSV gives everything as strings). */
function projectRow(p) {
  const row = {};
  for (const c of COLUMNS) {
    let v = p[c];
    if (v === "" || v === undefined) v = null;
    if (v !== null && NUMERIC.includes(c)) v = Number(v);
    if (c === "physical_progress_not_applicable") v = v === true || v === "true" || v === "t";
    row[c] = v;
  }
  for (const c of ["physical_progress", "total_cost", "amount_received", "expenditure", "amount_receivable"]) row[c] ??= 0;
  row.status ??= "Ongoing";
  row.name = row.name?.trim();
  row.created_at ??= new Date().toISOString();
  row.updated_at ??= row.created_at;
  return row;
}

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, newlines inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);
  const [header, ...data] = rows;
  const keys = header.map((h) => h.replace(/^﻿/, "").trim());
  return data.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""])));
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
