/**
 * Run after: npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > supabase_full_schema.sql
 *
 * Order matters.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function run(name) {
  const r = spawnSync(process.execPath, [path.join(__dirname, name)], {
    cwd: root,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("fix-sql-encoding.mjs");
run("wrap-create-type-enums.mjs");
run("sql-if-not-exists.mjs");
run("insert-sport-type-patch.mjs");
run("generate-ensure-sport-columns.mjs");
run("insert-legacy-column-patches.mjs");
console.log("postprocess-supabase-full-schema: done.");
