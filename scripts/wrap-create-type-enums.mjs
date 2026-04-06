import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, "..", "supabase_full_schema.sql");
let s = fs.readFileSync(p, "utf8");
const lines = s.split(/\r?\n/);
const out = lines
  .map((line) => {
    if (/^CREATE TYPE "[^"]+" AS ENUM/.test(line)) {
      return [
        "DO $$ BEGIN",
        `    ${line}`,
        "EXCEPTION",
        "    WHEN duplicate_object THEN NULL;",
        "END $$;",
      ].join("\n");
    }
    return line;
  })
  .join("\n");
fs.writeFileSync(p, out, "utf8");
console.log("Wrapped CREATE TYPE ... AS ENUM lines in DO blocks.");
