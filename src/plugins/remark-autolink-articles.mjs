/**
 * remark-autolink-articles.mjs
 *
 * Automatically converts article code references (like MEM-01, GOV-06, POOL-03A)
 * in prose text into hyperlinks pointing to the correct bylaw section anchor.
 *
 * Example: writing `MEM-01` in any MDX file automatically becomes
 *   [MEM-01](/bylaws/02-membership/#mem-01)
 *   or for EN locale:
 *   [MEM-01](/en/bylaws/02-membership/#mem-01)
 *
 * This replaces all the manual [MEM-01](/bylaws/02-membership/#mem-01) patterns.
 * You can still write explicit links if you want different link text.
 */

import { findAndReplace } from "mdast-util-find-and-replace";

// Map: article code prefix → bylaw file slug
const PREFIX_TO_FILE = {
  GEN: "01-general",
  MEM: "02-membership",
  GOV: "03-governance",
  FIN: "04-finance",
  PROJ: "05-projects-conflicts",
  PAY: "06-pay-distribution",
  POOL: "07-pool",
  IP: "08-ip-commons",
  DISC: "09-discipline-disputes",
  AMD: "10-amendments",
};

// Regex: matches codes like MEM-01, GOV-06, POOL-03A, PAY-07A
const ARTICLE_CODE_RE =
  /\b(GEN|MEM|GOV|FIN|PROJ|PAY|POOL|IP|DISC|AMD)-(\d+[A-Z]?)\b/g;

export function remarkAutolinkArticles() {
  return (tree, file) => {
    const filePath = file.history[0] || "";
    const isEnglish = filePath.includes("/docs/en/");
    const bylawsBase = isEnglish ? "/en/bylaws/" : "/bylaws/";

    findAndReplace(
      tree,
      [
        [
          ARTICLE_CODE_RE,
          (match, prefix, num) => {
            const fileSlug = PREFIX_TO_FILE[prefix];
            if (!fileSlug) return false; // unknown prefix, leave as-is
            const anchor = `${prefix.toLowerCase()}-${num.toLowerCase()}`;
            const href = `${bylawsBase}${fileSlug}/#${anchor}`;
            return {
              type: "link",
              url: href,
              children: [{ type: "text", value: match }],
              data: { hProperties: { class: "article-ref" } },
            };
          },
        ],
      ],
      {
        ignore: ["heading", "link", "linkReference", "code", "inlineCode"],
      },
    );
  };
}
