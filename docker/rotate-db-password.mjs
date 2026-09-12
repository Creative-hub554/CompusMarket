import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from "node:fs";
import { randomInt } from "node:crypto";

const file = "docker/.env";
const stagingBackup = "docker/.env.bak-rotation-tmp";

// 1. Staging backup (deleted after successful verification)
if (existsSync(stagingBackup)) unlinkSync(stagingBackup);
copyFileSync(file, stagingBackup);

const lines = readFileSync(file, "utf8").split(/\r?\n/);
const idxOf = (name) => lines.findIndex((l) => l.startsWith(name + "="));

// 2. Generate 40-char password: mixed case + digits + URL/SQL-safe symbols
//    (no quotes, no $, no backslash -> safe for env files, URLs, SQL literals)
const sets = [
  "ABCDEFGHJKLMNPQRSTUVWXYZ",
  "abcdefghijkmnopqrstuvwxyz",
  "23456789",
  "!@%^*_-+=?",
];
const all = sets.join("");
const pick = (chars) => chars[randomInt(0, chars.length)];
let pw;
do {
  pw = Array.from({ length: 40 }, () => pick(all)).join("");
} while (!sets.every((s) => [...pw].some((c) => s.includes(c))));

// 3. Update POSTGRES_PASSWORD and DATABASE_URL (percent-encoded for the URL)
const pgIdx = idxOf("POSTGRES_PASSWORD");
const urlIdx = idxOf("DATABASE_URL");
if (pgIdx === -1 || urlIdx === -1) {
  console.log("MISSING VARS — aborting");
  process.exit(1);
}
const oldUrl = new URL(lines[urlIdx].slice("DATABASE_URL=".length).trim());
const query = oldUrl.search; // preserve ?params if any
const oldPw = decodeURIComponent(oldUrl.password);

lines[pgIdx] = "POSTGRES_PASSWORD=" + pw;
lines[urlIdx] =
  "DATABASE_URL=postgresql://theo:" + encodeURIComponent(pw) + "@postgres:5432/theo_platform" + query;
writeFileSync(file, lines.join("\r\n") + "\r\n");

// 4. Self-verify the written file
const after = readFileSync(file, "utf8").split(/\r?\n/);
const newPwFile = after.find((l) => l.startsWith("POSTGRES_PASSWORD=")).slice(18);
const newUrl = new URL(after.find((l) => l.startsWith("DATABASE_URL=")).slice(13).trim());
const roundTrip = decodeURIComponent(newUrl.password) === newPwFile;

console.log("changed=true");
console.log("old_pw_len=" + oldPw.length + " new_pw_len=" + newPwFile.length);
console.log("password_differs=" + (oldPw !== newPwFile));
console.log("url_roundtrip_ok=" + roundTrip);
console.log("classes_ok=" + sets.every((s) => [...newPwFile].some((c) => s.includes(c))));
console.log("staging_backup=" + stagingBackup + " (removed after verification)");
