/**
 * After sport_type patch, inserts supabase_ensure_sport_columns.sql before first -- CreateIndex.
 * Run: node scripts/generate-ensure-sport-columns.mjs && node scripts/insert-legacy-column-patches.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const fullPath = path.join(root, "supabase_full_schema.sql");
const sportPath = path.join(root, "supabase_ensure_sport_columns.sql");

let full = fs.readFileSync(fullPath, "utf8");
const sportPatch = fs.readFileSync(sportPath, "utf8").trimEnd();

if (full.includes('ensure "sport" exists')) {
  console.log("sport column patch already present — skip.");
  process.exit(0);
}

const marker = "\n\n-- CreateIndex\n";
const idx = full.indexOf(marker);
if (idx === -1) {
  console.error("Could not find -- CreateIndex section.");
  process.exit(1);
}

const out =
  full.slice(0, idx) +
  "\n\n" +
  sportPatch +
  "\n\n" +
  full.slice(idx);

fs.writeFileSync(fullPath, out, "utf8");
console.log("Inserted supabase_ensure_sport_columns.sql before CREATE INDEX.");
