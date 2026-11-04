// Runs a throwaway Postgres for local development (no Docker needed), data in .pgdata/.
// Usage: npm run db:local   then, in another terminal:
//   DATABASE_URL=postgres://postgres:postgres@localhost:54329/nium npm run db:migrate
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const pg = new EmbeddedPostgres({
  databaseDir: "./.pgdata",
  user: "postgres",
  password: "postgres",
  port: 54329,
  persistent: true,
});

if (!existsSync("./.pgdata/PG_VERSION")) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("nium");
} catch {
  // Already exists from an earlier run.
}
console.log("Postgres ready: postgres://postgres:postgres@localhost:54329/nium (Ctrl+C to stop)");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
