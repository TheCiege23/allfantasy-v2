/**
 * Reads prisma/schema.prisma and writes ALTER TABLE ... ADD COLUMN IF NOT EXISTS "sport" ...
 * for every model that has a `sport` field (not sportType / sport_type).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const outPath = path.join(__dirname, "..", "supabase_ensure_sport_columns.sql");

const s = fs.readFileSync(schemaPath, "utf8");
const chunks = s.split(/\nmodel /).slice(1);

/** @type {{ table: string; sqlType: string }[]} */
const rows = [];

for (const chunk of chunks) {
  const nameMatch = chunk.match(/^(\w+)/);
  if (!nameMatch) continue;
  const modelName = nameMatch[1];

  const mapMatch = chunk.match(/@@map\("([^"]+)"\)/);
  const tableName = mapMatch ? mapMatch[1] : modelName;

  const lines = chunk.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("sport ") && !trimmed.startsWith("sport\t")) continue;
    if (trimmed.includes("sportType")) continue;
    if (trimmed.includes("sport_type")) continue;

    let sqlType = "TEXT";
    if (trimmed.includes("LeagueSport")) {
      sqlType = '"LeagueSport"';
    } else if (trimmed.includes("@db.VarChar(16)")) {
      sqlType = "VARCHAR(16)";
    } else if (trimmed.includes("@db.VarChar(12)")) {
      sqlType = "VARCHAR(12)";
    } else if (trimmed.includes("@db.VarChar(8)")) {
      sqlType = "VARCHAR(8)";
    } else if (trimmed.includes("@db.Text")) {
      sqlType = "TEXT";
    }

    rows.push({ table: tableName, sqlType });
    break;
  }
}

const header = `-- -----------------------------------------------------------------------------
-- Idempotent: ensure "sport" exists (legacy DBs may predate the column).
-- Safe to re-run. See scripts/generate-ensure-sport-columns.mjs
-- -----------------------------------------------------------------------------
`;

const body = rows
  .map(
    ({ table, sqlType }) =>
      `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "sport" ${sqlType};`,
  )
  .join("\n");

fs.writeFileSync(outPath, header + "\n" + body + "\n", "utf8");
console.log(`Wrote ${rows.length} ALTERs to ${outPath}`);
