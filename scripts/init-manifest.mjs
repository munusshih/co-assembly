#!/usr/bin/env node
/**
 * init-manifest.mjs
 *
 * Initializes (or resets) .i18n-manifest.json to record the current hash
 * of all ZH source files. Run this AFTER you've completed a translation
 * round to mark everything as in-sync.
 *
 * Usage:
 *   node scripts/init-manifest.mjs
 *
 * Or more targeted — mark just one file as synced:
 *   node scripts/init-manifest.mjs src/content/docs/bylaws/02-membership.mdx
 */

import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = resolve(ROOT, ".i18n-manifest.json");

// All ZH source files that have EN translations
const SOURCE_FILES = [
  "src/content/docs/bylaws/01-general.mdx",
  "src/content/docs/bylaws/02-membership.mdx",
  "src/content/docs/bylaws/03-governance.mdx",
  "src/content/docs/bylaws/04-finance.mdx",
  "src/content/docs/bylaws/05-projects-conflicts.mdx",
  "src/content/docs/bylaws/06-pay-distribution.mdx",
  "src/content/docs/bylaws/07-pool.mdx",
  "src/content/docs/bylaws/08-ip-commons.mdx",
  "src/content/docs/bylaws/09-discipline-disputes.mdx",
  "src/content/docs/bylaws/10-amendments.mdx",
  "src/content/docs/index.mdx",
  "src/content/docs/guide.mdx",
  "src/content/docs/meta/contributing.mdx",
  "src/params.json",
  "src/data/glossary.json",
];

const target = process.argv[2]; // optional single-file argument
const filesToProcess = target ? [target.replace(/^\//, "")] : SOURCE_FILES;

const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"))
  : {};

const now = new Date().toISOString();
let updated = 0;

for (const rel of filesToProcess) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    console.warn(`  ⚠️  Not found, skipping: ${rel}`);
    continue;
  }
  const content = readFileSync(abs);
  const hash = createHash("md5").update(content).digest("hex");
  manifest[rel] = { hash, markedSyncedAt: now };
  updated++;
}

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
console.log(`✅ Manifest updated (${updated} file(s)): ${MANIFEST_PATH}`);
