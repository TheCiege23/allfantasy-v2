/**
 * Fix supabase_full_schema.sql when saved as UTF-16 LE with garbage prefix
 * (Supabase SQL editor expects UTF-8; BOM / mixed encoding causes "syntax error near ").
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "supabase_full_schema.sql");
const buf = fs.readFileSync(file);

let offset = 0;
// UTF-8 BOM
if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) offset = 3;
// Strip repeated UTF-8 replacement char U+FFFD (invalid prior decode)
while (
  offset + 2 < buf.length &&
  buf[offset] === 0xef &&
  buf[offset + 1] === 0xbf &&
  buf[offset + 2] === 0xbd
) {
  offset += 3;
}
// UTF-16 LE BOM
if (buf[offset] === 0xff && buf[offset + 1] === 0xfe) offset += 2;

const rest = buf.slice(offset);
// Heuristic: UTF-16 LE has 0x00 after ASCII letters
const looksUtf16 =
  rest.length >= 4 && rest[1] === 0x00 && rest[0] === 0x2d && rest[2] === 0x2d && rest[3] === 0x00;

let text;
if (looksUtf16) {
  text = rest.toString("utf16le");
} else {
  text = rest.toString("utf8");
}

// UTF-8 no BOM
fs.writeFileSync(file, text.replace(/\r\n/g, "\n"), { encoding: "utf8" });
console.log(`Fixed ${file}: ${buf.length} bytes -> UTF-8 (no BOM), ${text.length} chars`);
