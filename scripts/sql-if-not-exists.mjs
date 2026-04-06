/**
 * Make Prisma-generated baseline SQL safer to re-run on non-empty DBs.
 * UTF-8, no BOM.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, "..", "supabase_full_schema.sql");
let s = fs.readFileSync(p, "utf8");

const pairs = [
  [/CREATE TABLE "/g, 'CREATE TABLE IF NOT EXISTS "'],
  [/CREATE INDEX "/g, 'CREATE INDEX IF NOT EXISTS "'],
  [/CREATE UNIQUE INDEX "/g, 'CREATE UNIQUE INDEX IF NOT EXISTS "'],
  [/ADD COLUMN "/g, 'ADD COLUMN IF NOT EXISTS "'],
];

for (const [re, rep] of pairs) {
  s = s.replace(re, rep);
}

fs.writeFileSync(p, s, "utf8");
console.log("Applied IF NOT EXISTS to TABLE / INDEX / ADD COLUMN in supabase_full_schema.sql");
