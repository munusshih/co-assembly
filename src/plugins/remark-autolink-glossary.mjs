/**
 * remark-autolink-glossary.mjs
 *
 * A remark plugin that automatically converts glossary term text into links
 * pointing to the glossary page. Works for both ZH (root) and EN locales.
 *
 * Rules:
 * - Each term is only linked ONCE per page (first occurrence)
 * - Terms inside existing links, headings, code blocks are skipped
 * - The glossary page itself is skipped (no self-linking)
 * - Locale detected from the file path (/en/ = English terms)
 */

import { findAndReplace } from "mdast-util-find-and-replace";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GLOSSARY_PATH = resolve(__dirname, "../data/glossary.json");

/** Load glossary once and cache */
let _cache = null;
function loadGlossary() {
  if (!_cache) {
    _cache = JSON.parse(readFileSync(GLOSSARY_PATH, "utf-8"));
  }
  return _cache;
}

/** Escape special regex characters in a string */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function remarkAutolinkGlossary() {
  return (tree, file) => {
    const glossary = loadGlossary();
    const filePath = file.history[0] || "";

    // Skip glossary pages to avoid self-referential links
    if (filePath.includes("glossary")) return;

    const isEnglish = filePath.includes("/docs/en/");
    const baseGlossaryPath = isEnglish
      ? "/en/meta/glossary/"
      : "/meta/glossary/";

    // Build term list for this locale, sorted longest-first to prevent
    // short-term matches clobbering longer terms (e.g. "pool" vs "common pool")
    const terms = Object.entries(glossary)
      .map(([id, entry]) => ({
        id,
        term: isEnglish ? entry.en : entry.zh,
        href: `${baseGlossaryPath}#${id}`,
      }))
      .filter((t) => t.term && t.term.length > 1)
      .sort((a, b) => b.term.length - a.term.length);

    // Track which term IDs have already been linked on this page
    const linked = new Set();

    // Build replacements array for findAndReplace
    // findAndReplace accepts: [regex, replacer] pairs
    const replacements = terms.map(({ id, term, href }) => {
      let regex;
      if (isEnglish) {
        // Word-boundary matching for English (case-insensitive)
        regex = new RegExp(`(?<![\\w-])${escapeRegex(term)}(?![\\w-])`, "gi");
      } else {
        // Exact match for Chinese (no word boundaries in Chinese text)
        regex = new RegExp(escapeRegex(term), "g");
      }

      return [
        regex,
        (match) => {
          // Only link the first occurrence per page
          if (linked.has(id)) return false; // false = leave as-is
          linked.add(id);
          return {
            type: "link",
            url: href,
            children: [{ type: "text", value: match }],
            data: { hProperties: { class: "glossary-autolink" } },
          };
        },
      ];
    });

    // Apply replacements, skipping inside headings and existing links
    findAndReplace(tree, replacements, {
      ignore: [
        "heading",
        "link",
        "linkReference",
        "image",
        "code",
        "inlineCode",
      ],
    });
  };
}
