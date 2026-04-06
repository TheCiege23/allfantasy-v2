/**
 * Inserts supabase_ensure_sport_type_columns.sql into supabase_full_schema.sql
 * immediately before the first `-- CreateIndex` block (after all CREATE TABLE).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const fullPath = path.join(root, "supabase_full_schema.sql");
const patchPath = path.join(root, "supabase_ensure_sport_type_columns.sql");

let full = fs.readFileSync(fullPath, "utf8");
const patch = fs.readFileSync(patchPath, "utf8").trimEnd();

if (full.includes("Ensure sport_type exists on tables")) {
  console.log("Patch already present in supabase_full_schema.sql — skip.");
  process.exit(0);
}

const marker = "\n-- CreateIndex\n";
const idx = full.indexOf(marker);
if (idx === -1) {
  console.error("Could not find first -- CreateIndex section.");
  process.exit(1);
}

const out =
  full.slice(0, idx) +
  "\n\n-- --------------------------------------------------------------------------\n" +
  patch +
  "\n\n" +
  full.slice(idx);

fs.writeFileSync(fullPath, out, "utf8");
console.log("Inserted sport_type column patch before CREATE INDEX section.");
