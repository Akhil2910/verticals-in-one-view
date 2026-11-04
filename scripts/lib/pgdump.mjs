// Minimal, read-only reader for pg_dump "custom" format archives (the .backup files
// Supabase / Lovable Cloud hand out), so table data can be imported without pg_restore.
// Format: see src/bin/pg_dump/pg_backup_archiver.c and pg_backup_custom.c in PostgreSQL.
import { readFileSync } from "node:fs";
import { inflateSync, zstdDecompressSync } from "node:zlib";

/** Opens an archive; `rows("public.projects")` returns that table's rows as objects (null for SQL NULL). */
export function openPgDump(file) {
  const buf = readFileSync(file);
  let pos = 0;
  let intSize = 4;
  let offSize = 8;
  const byte = () => buf[pos++];
  const int = () => {
    const neg = byte();
    let v = 0;
    for (let i = 0; i < intSize; i++) v += buf[pos++] * 2 ** (8 * i);
    return neg ? -v : v;
  };
  const str = () => {
    const n = int();
    if (n < 0) return null;
    const s = buf.toString("utf8", pos, pos + n);
    pos += n;
    return s;
  };

  if (buf.toString("latin1", 0, 5) !== "PGDMP") throw new Error(`${file} is not a pg_dump custom-format archive.`);
  pos = 5;
  const ver = byte() * 10000 + byte() * 100 + byte();
  if (ver < 11400) throw new Error("Archive is too old (needs pg_dump 12 or newer).");
  intSize = byte();
  offSize = byte();
  if (byte() !== 1) throw new Error("Only the custom archive format (-Fc) is supported.");
  const compression = ver >= 11500 ? byte() : int() === 0 ? 0 : 1; // 0 none, 1 gzip, 2 lz4, 3 zstd
  for (let i = 0; i < 7; i++) int(); // creation timestamp
  str(); // database name
  str(); // server version
  str(); // pg_dump version

  const toc = [];
  for (let i = int(); i > 0; i--) {
    const te = { dumpId: int() };
    int(); // has data dumper
    str(); // table oid
    str(); // oid
    te.tag = str();
    te.desc = str();
    int(); // section
    str(); // definition
    str(); // drop statement
    te.copyStmt = str();
    te.namespace = str();
    str(); // tablespace
    str(); // table access method
    if (ver >= 11600) int(); // relkind
    str(); // owner
    str(); // "with oids"
    while (str() !== null); // dependencies
    const flag = byte();
    let offset = 0;
    for (let j = 0; j < offSize; j++) offset += buf[pos++] * 2 ** (8 * j);
    te.dataAt = flag === 2 ? offset : null;
    toc.push(te);
  }

  function decompress(raw) {
    if (compression === 0) return raw;
    if (compression === 1) return inflateSync(raw);
    if (compression === 3) return zstdDecompressSync(raw);
    throw new Error("This archive uses lz4 compression, which this reader doesn't support. Re-export with gzip or zstd.");
  }

  function rows(qualified) {
    const [ns, tag] = qualified.split(".");
    const te = toc.find((t) => t.desc === "TABLE DATA" && t.namespace === ns && t.tag === tag);
    if (!te) return null;
    if (te.dataAt === null) return [];
    pos = te.dataAt;
    if (byte() !== 1 || int() !== te.dumpId) throw new Error(`Damaged archive: unexpected block for ${qualified}.`);
    const chunks = [];
    for (let n; (n = int()) !== 0; pos += n) chunks.push(buf.subarray(pos, pos + n));
    const text = decompress(Buffer.concat(chunks)).toString("utf8");
    const cols = te.copyStmt.match(/\(([^)]*)\)/)[1].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return text
      .split("\n")
      .filter((line) => line && line !== "\\.")
      .map((line) => Object.fromEntries(line.split("\t").map((f, i) => [cols[i], unescapeCopy(f)])));
  }

  return { rows };
}

// COPY text format: \N is NULL; backslash escapes for tab, newline and friends.
function unescapeCopy(f) {
  if (f === "\\N") return null;
  return f.replace(/\\(.)/g, (_, c) => ({ t: "\t", n: "\n", r: "\r", b: "\b", f: "\f", v: "\v" })[c] ?? c);
}
