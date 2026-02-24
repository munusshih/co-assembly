#!/usr/bin/env node
/**
 * check-translations.mjs
 *
 * Checks whether English translation files are in sync with their Chinese sources.
 * Uses a manifest file (.i18n-manifest.json) that records the MD5 hash of each
 * source file at the time translation was last confirmed.
 *
 * Usage:
 *   node scripts/check-translations.mjs          # show status report
 *   node scripts/check-translations.mjs --prompt # also output LLM translation prompts
 *   node scripts/check-translations.mjs --fix    # mark all EN files as up-to-date (after you've translated)
 */

import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, relative, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = resolve(ROOT, ".i18n-manifest.json");
const DOCS_ZH = resolve(ROOT, "src/content/docs");
const DOCS_EN = resolve(ROOT, "src/content/docs/en");

// Source files (ZH) → their expected EN counterparts
const FILE_PAIRS = [
  // Bylaws
  {
    zh: "src/content/docs/bylaws/01-general.mdx",
    en: "src/content/docs/en/bylaws/01-general.mdx",
  },
  {
    zh: "src/content/docs/bylaws/02-membership.mdx",
    en: "src/content/docs/en/bylaws/02-membership.mdx",
  },
  {
    zh: "src/content/docs/bylaws/03-governance.mdx",
    en: "src/content/docs/en/bylaws/03-governance.mdx",
  },
  {
    zh: "src/content/docs/bylaws/04-finance.mdx",
    en: "src/content/docs/en/bylaws/04-finance.mdx",
  },
  {
    zh: "src/content/docs/bylaws/05-projects-conflicts.mdx",
    en: "src/content/docs/en/bylaws/05-projects-conflicts.mdx",
  },
  {
    zh: "src/content/docs/bylaws/06-pay-distribution.mdx",
    en: "src/content/docs/en/bylaws/06-pay-distribution.mdx",
  },
  {
    zh: "src/content/docs/bylaws/07-pool.mdx",
    en: "src/content/docs/en/bylaws/07-pool.mdx",
  },
  {
    zh: "src/content/docs/bylaws/08-ip-commons.mdx",
    en: "src/content/docs/en/bylaws/08-ip-commons.mdx",
  },
  {
    zh: "src/content/docs/bylaws/09-discipline-disputes.mdx",
    en: "src/content/docs/en/bylaws/09-discipline-disputes.mdx",
  },
  {
    zh: "src/content/docs/bylaws/10-amendments.mdx",
    en: "src/content/docs/en/bylaws/10-amendments.mdx",
  },
  // Index + guide
  { zh: "src/content/docs/index.mdx", en: "src/content/docs/en/index.mdx" },
  { zh: "src/content/docs/guide.mdx", en: "src/content/docs/en/guide.mdx" },
  // Meta (glossary + contributing are generated; only contributing needs manual EN translation)
  {
    zh: "src/content/docs/meta/contributing.mdx",
    en: "src/content/docs/en/meta/contributing.mdx",
  },
  // params.json change requires re-translating all files that use params, so track it too
  { zh: "src/params.json", en: "src/params.json", paramOnly: true },
  // Glossary data
  {
    zh: "src/data/glossary.json",
    en: "src/data/glossary.json",
    dataOnly: true,
  },
];

function hashFile(absPath) {
  if (!existsSync(absPath)) return null;
  const content = readFileSync(absPath);
  return createHash("md5").update(content).digest("hex");
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return {};
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
}

function saveManifest(manifest) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

function getGitDiff(zhPath) {
  try {
    // Show what changed in this file since the last commit that touched the EN counterpart
    const rel = relative(ROOT, resolve(ROOT, zhPath));
    const output = execSync(
      `git diff HEAD -- "${rel}" 2>/dev/null || git show HEAD:"${rel}" 2>/dev/null | head -60`,
      {
        cwd: ROOT,
        encoding: "utf-8",
      },
    );
    return output.trim();
  } catch {
    return "(unable to get diff — file may be untracked)";
  }
}

function buildLLMPrompt(stalePairs, manifest) {
  const lines = [];
  lines.push("# Translation Update Request");
  lines.push("");
  lines.push(
    "The following English files need to be updated to match their Chinese source files.",
  );
  lines.push(
    "Please translate ONLY the changed/new sections marked below, keeping the existing structure.",
  );
  lines.push("");
  lines.push("## Glossary — Always use these exact translations:");
  lines.push("(See src/data/glossary.json for full list)");
  lines.push("| ZH | EN |");
  lines.push("|----|----|");
  try {
    const glossary = JSON.parse(
      readFileSync(resolve(ROOT, "src/data/glossary.json"), "utf-8"),
    );
    for (const [, entry] of Object.entries(glossary)) {
      lines.push(`| ${entry.zh} | ${entry.en} |`);
    }
  } catch {}
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const { zh, en } of stalePairs) {
    lines.push(`## File: ${en}`);
    lines.push(`Source: ${zh}`);
    const prevHash = manifest[zh]?.hash;
    lines.push(`Previous hash: ${prevHash || "none (new file)"}`);
    lines.push("");

    lines.push("### Current ZH source content:");
    lines.push("```mdx");
    try {
      lines.push(readFileSync(resolve(ROOT, zh), "utf-8").trim());
    } catch {
      lines.push("(file not found)");
    }
    lines.push("```");
    lines.push("");

    lines.push("### Current EN file (update this):");
    lines.push("```mdx");
    try {
      lines.push(
        existsSync(resolve(ROOT, en))
          ? readFileSync(resolve(ROOT, en), "utf-8").trim()
          : "(does not exist yet — create it)",
      );
    } catch {
      lines.push("(does not exist yet)");
    }
    lines.push("```");
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const showPrompt = args.includes("--prompt");
const fixMode = args.includes("--fix");

const manifest = loadManifest();
const synced = [];
const stale = [];
const missing = [];

for (const pair of FILE_PAIRS) {
  if (pair.paramOnly || pair.dataOnly) {
    // For params/glossary JSON, just check if hash changed (no EN counterpart to verify)
    const absZh = resolve(ROOT, pair.zh);
    const currentHash = hashFile(absZh);
    const prevHash = manifest[pair.zh]?.hash;
    if (currentHash !== prevHash) {
      stale.push({
        ...pair,
        currentHash,
        note: "⚠️  params/data changed — all files using it may need review",
      });
    } else {
      synced.push(pair);
    }
    continue;
  }

  const absZh = resolve(ROOT, pair.zh);
  const absEn = resolve(ROOT, pair.en);
  const currentHash = hashFile(absZh);
  const manifestEntry = manifest[pair.zh];

  if (!existsSync(absEn)) {
    missing.push({ ...pair, currentHash });
  } else if (!manifestEntry || manifestEntry.hash !== currentHash) {
    stale.push({ ...pair, currentHash });
  } else {
    synced.push(pair);
  }
}

// ─── Fix mode: update manifest with current hashes ───────────────────────────
if (fixMode) {
  const now = new Date().toISOString();
  for (const pair of [...synced, ...stale, ...missing]) {
    const currentHash = hashFile(resolve(ROOT, pair.zh));
    if (currentHash) {
      manifest[pair.zh] = { hash: currentHash, markedSyncedAt: now };
    }
  }
  saveManifest(manifest);
  console.log("✅ Manifest updated. All files marked as synced.");
  process.exit(0);
}

// ─── Report ──────────────────────────────────────────────────────────────────
const width = 60;
console.log("─".repeat(width));
console.log("  🌐 Translation Sync Report");
console.log("─".repeat(width));

if (synced.length) {
  console.log(`\n✅ Synced (${synced.length}):`);
  for (const p of synced) {
    if (!p.paramOnly && !p.dataOnly) console.log(`   ${p.en}`);
  }
}

if (missing.length) {
  console.log(
    `\n🆕 Missing EN files (${missing.length}) — need to be CREATED:`,
  );
  for (const p of missing) {
    console.log(`   ${p.en}`);
    console.log(`     source: ${p.zh}`);
  }
}

if (stale.length) {
  const contentStale = stale.filter((p) => !p.paramOnly && !p.dataOnly);
  const dataStale = stale.filter((p) => p.paramOnly || p.dataOnly);

  if (contentStale.length) {
    console.log(
      `\n🔄 STALE — source changed since last translation (${contentStale.length}):`,
    );
    for (const p of contentStale) {
      console.log(`   ${p.en}`);
      console.log(`     source: ${p.zh}`);
    }
  }
  if (dataStale.length) {
    console.log(
      `\n⚠️  Data/params changed — review all files that import them:`,
    );
    for (const p of dataStale) {
      console.log(`   ${p.zh}  ${p.note || ""}`);
    }
  }
}

const total = stale.length + missing.length;
console.log("\n─".repeat(width));
if (total === 0) {
  console.log("🎉 All translations are in sync!");
} else {
  console.log(`⚡ ${total} file(s) need attention.`);
  console.log(`\nTo generate a copy-paste LLM translation prompt:`);
  console.log(
    `  node scripts/check-translations.mjs --prompt > translation-prompt.md`,
  );
  console.log(`\nAfter translating, mark files as synced:`);
  console.log(`  node scripts/check-translations.mjs --fix`);
}
console.log("─".repeat(width) + "\n");

if (showPrompt && stale.length + missing.length > 0) {
  const allStale = [
    ...stale.filter((p) => !p.paramOnly && !p.dataOnly),
    ...missing,
  ];
  const prompt = buildLLMPrompt(allStale, manifest);
  console.log("\n\n" + "═".repeat(width));
  console.log("  📋 LLM TRANSLATION PROMPT (copy everything below)");
  console.log("═".repeat(width) + "\n");
  console.log(prompt);
}

process.exit(total > 0 ? 1 : 0);
