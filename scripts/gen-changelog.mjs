#!/usr/bin/env node
/**
 * gen-changelog.mjs
 *
 * Auto-generates changelog MDX pages from git history.
 * Groups commits by version tag (if any) or by month.
 * Maps file paths to human-readable chapter names.
 *
 * Outputs:
 *   src/content/docs/meta/changelog.mdx      (繁體中文)
 *   src/content/docs/en/meta/changelog.mdx   (English)
 *
 * Run:
 *   node scripts/gen-changelog.mjs
 *
 * DO NOT manually edit the generated changelog files.
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Chapters mapping: file fragment → display names
const CHAPTER_NAMES = {
  "bylaws/01-general": {
    zh: "第一章：總則",
    en: "Chapter 1: General Provisions",
  },
  "bylaws/02-membership": {
    zh: "第二章：成員資格",
    en: "Chapter 2: Membership",
  },
  "bylaws/03-governance": {
    zh: "第三章：治理與會議",
    en: "Chapter 3: Governance & Meetings",
  },
  "bylaws/04-finance": {
    zh: "第四章：財務與透明",
    en: "Chapter 4: Finance & Transparency",
  },
  "bylaws/05-projects-conflicts": {
    zh: "第五章：專案承接與利益衝突",
    en: "Chapter 5: Projects & Conflicts",
  },
  "bylaws/06-pay-distribution": {
    zh: "第六章：薪資與分配",
    en: "Chapter 6: Pay & Distribution",
  },
  "bylaws/07-pool": { zh: "第七章：公司池", en: "Chapter 7: Common Pool" },
  "bylaws/08-ip-commons": {
    zh: "第八章：知識共享與智慧財產",
    en: "Chapter 8: IP & Commons",
  },
  "bylaws/09-discipline-disputes": {
    zh: "第九章：爭議處理與紀律",
    en: "Chapter 9: Discipline & Disputes",
  },
  "bylaws/10-amendments": {
    zh: "第十章：修章與附則",
    en: "Chapter 10: Amendments",
  },
  "meta/glossary": { zh: "詞彙表", en: "Glossary" },
  "meta/contributing": { zh: "貢獻指南", en: "Contributing Guide" },
  "params.json": { zh: "章程參數", en: "Bylaw Parameters" },
  "data/glossary.json": { zh: "詞彙資料", en: "Glossary Data" },
  "index.mdx": { zh: "首頁", en: "Home Page" },
  "guide.mdx": { zh: "使用指南", en: "User Guide" },
};

function getChapterNames(file) {
  for (const [fragment, names] of Object.entries(CHAPTER_NAMES)) {
    if (file.includes(fragment)) return names;
  }
  return null;
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

function getCommits() {
  try {
    // Get all commits that touch docs, params, or data
    const raw = execSync(
      `git log --pretty=format:"%H|||%as|||%D|||%s" -- \
        "src/content/docs/bylaws/" \
        "src/content/docs/meta/" \
        "src/content/docs/index.mdx" \
        "src/content/docs/guide.mdx" \
        "src/params.json" \
        "src/data/" 2>/dev/null`,
      { cwd: ROOT, encoding: "utf-8" },
    ).trim();

    if (!raw) return [];

    return raw.split("\n").map((line) => {
      const [hash, date, refs, subject] = line.split("|||");
      const tags =
        (refs || "")
          .match(/tag: ([^\s,)]+)/g)
          ?.map((t) => t.replace("tag: ", "")) || [];
      return { hash, date, tags, subject: subject?.trim() };
    });
  } catch {
    return [];
  }
}

function getFilesChanged(hash) {
  try {
    const output = execSync(
      `git diff-tree --no-commit-id -r --name-only "${hash}" 2>/dev/null`,
      { cwd: ROOT, encoding: "utf-8" },
    ).trim();
    return output ? output.split("\n") : [];
  } catch {
    return [];
  }
}

// ─── Group commits by version/month ──────────────────────────────────────────

function groupCommits(commits) {
  const groups = []; // [{version, date, commits: [...]}]
  let currentGroup = null;

  for (const commit of commits) {
    // If this commit has a version tag, start a new group
    const versionTag = commit.tags.find((t) => /^v\d/.test(t));
    if (versionTag || !currentGroup) {
      const version = versionTag || deriveVersion(commit.date, groups.length);
      currentGroup = { version, date: commit.date, commits: [] };
      groups.push(currentGroup);
    }
    currentGroup.commits.push(commit);
  }

  return groups;
}

function deriveVersion(date, index) {
  // If no tags exist yet, use 0.x.0-draft numbering
  if (index === 0) return "0.1.0-draft";
  return `0.0.${index}-draft`;
}

// ─── MDX generators ───────────────────────────────────────────────────────────

function generateZH(groups) {
  const lines = [];
  lines.push(`---`);
  lines.push(`title: 變更紀錄`);
  lines.push(`description: CoAssembly 章程的修訂歷史（由 git log 自動產生）`);
  lines.push(`---`);
  lines.push(``);
  lines.push(
    `{/* ⚠️  此頁面由 scripts/gen-changelog.mjs 自動產生，請勿手動編輯。 */}`,
  );
  lines.push(
    `{/* 修訂紀錄來自 git log。每次 commit 後執行 npm run gen:changelog 更新。 */}`,
  );
  lines.push(``);
  lines.push(`本頁面記錄所有章程的修訂歷史，自動從 git 提交紀錄產生。`);
  lines.push(``);
  lines.push(`:::tip[版本編號規則]`);
  lines.push(`- **0.x.x-draft** 草稿階段，尚未正式通過`);
  lines.push(`- **1.0.0** 首次正式發布（需經 2/3 勞工老闆同意）`);
  lines.push(`- **1.x.0** 次要更新（新增章節或重大修訂）`);
  lines.push(`- **1.0.x** 修正更新（文字修正、澄清說明）`);
  lines.push(`:::`);
  lines.push(``);

  if (groups.length === 0) {
    lines.push(`_尚無 git 提交紀錄。_`);
    lines.push(``);
    return lines.join("\n");
  }

  for (const group of groups) {
    lines.push(`---`);
    lines.push(``);
    lines.push(
      `## 版本 ${group.version} (${group.date}) {#v${group.version.replace(/\./g, "-")}}`,
    );
    lines.push(``);

    // Collect affected chapters
    const affected = new Set();
    for (const commit of group.commits) {
      const files = getFilesChanged(commit.hash);
      for (const f of files) {
        const names = getChapterNames(f);
        if (names) affected.add(names.zh);
      }
    }

    if (affected.size) {
      lines.push(`**影響範圍：** ${[...affected].join("、")}`);
      lines.push(``);
    }

    lines.push(`### 修改內容`);
    lines.push(``);
    for (const commit of group.commits) {
      // Skip auto-generated commits (from our own scripts)
      if (commit.subject?.match(/^(gen:|auto:|chore:|build:|ci:)/i)) continue;
      lines.push(`- ${commit.subject} *(${commit.date})*`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

function generateEN(groups) {
  const lines = [];
  lines.push(`---`);
  lines.push(`title: Changelog`);
  lines.push(
    `description: Revision history for CoAssembly Bylaws (auto-generated from git log)`,
  );
  lines.push(`---`);
  lines.push(``);
  lines.push(
    `{/* ⚠️  This page is auto-generated by scripts/gen-changelog.mjs — do not edit manually. */}`,
  );
  lines.push(
    `{/* Revision history comes from git log. Run npm run gen:changelog after each commit. */}`,
  );
  lines.push(``);
  lines.push(
    `This page records all bylaw revisions, auto-generated from git commit history.`,
  );
  lines.push(``);
  lines.push(`:::tip[Version numbering]`);
  lines.push(`- **0.x.x-draft** Draft stage, not yet formally adopted`);
  lines.push(
    `- **1.0.0** First official release (requires 2/3 worker-owner approval)`,
  );
  lines.push(`- **1.x.0** Minor update (new sections or major revisions)`);
  lines.push(`- **1.0.x** Patch update (text corrections, clarifications)`);
  lines.push(`:::`);
  lines.push(``);

  if (groups.length === 0) {
    lines.push(`_No git commits yet._`);
    lines.push(``);
    return lines.join("\n");
  }

  for (const group of groups) {
    lines.push(`---`);
    lines.push(``);
    lines.push(
      `## Version ${group.version} (${group.date}) {#v${group.version.replace(/\./g, "-")}}`,
    );
    lines.push(``);

    const affected = new Set();
    for (const commit of group.commits) {
      const files = getFilesChanged(commit.hash);
      for (const f of files) {
        const names = getChapterNames(f);
        if (names) affected.add(names.en);
      }
    }

    if (affected.size) {
      lines.push(`**Affected:** ${[...affected].join(", ")}`);
      lines.push(``);
    }

    lines.push(`### Changes`);
    lines.push(``);
    for (const commit of group.commits) {
      if (commit.subject?.match(/^(gen:|auto:|chore:|build:|ci:)/i)) continue;
      lines.push(`- ${commit.subject} *(${commit.date})*`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

// ─── Write files ──────────────────────────────────────────────────────────────

const commits = getCommits();
const groups = groupCommits(commits);

mkdirSync(resolve(ROOT, "src/content/docs/meta"), { recursive: true });
mkdirSync(resolve(ROOT, "src/content/docs/en/meta"), { recursive: true });

const zhOut = resolve(ROOT, "src/content/docs/meta/changelog.mdx");
const enOut = resolve(ROOT, "src/content/docs/en/meta/changelog.mdx");

writeFileSync(zhOut, generateZH(groups));
writeFileSync(enOut, generateEN(groups));

console.log(
  `✅ Generated changelog from ${commits.length} commit(s) in ${groups.length} version group(s):`,
);
console.log(`   ${zhOut}`);
console.log(`   ${enOut}`);
