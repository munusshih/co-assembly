// Astro 配置檔案
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeCatppuccin from "@catppuccin/starlight";
import remarkCustomHeadingId from "remark-custom-heading-id";
import mermaid from "astro-mermaid";
import { remarkAutolinkGlossary } from "./src/plugins/remark-autolink-glossary.mjs";
import { remarkAutolinkArticles } from "./src/plugins/remark-autolink-articles.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://index.co-assembly.com",
  base: "/",
  markdown: {
    remarkPlugins: [
      remarkCustomHeadingId,
      remarkAutolinkGlossary,
      remarkAutolinkArticles,
    ],
  },
  integrations: [
    mermaid(),
    starlight({
      title: {
        "zh-TW": "CoAssembly 章程",
        en: "CoAssembly Bylaws",
      },
      description:
        "共同集合設計合作社組織章程 v0.1.0 草稿 / CoAssembly Cooperative Bylaws v0.1.0 draft",
      logo: {
        src: "./public/images/logo.svg",
      },
      social: [
        {
          label: "GitHub",
          icon: "github",
          href: "https://github.com/munusshih/co-assembly",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/munusshih/co-assembly/edit/main/",
      },
      lastUpdated: true,
      pagination: true,
      plugins: [
        starlightThemeCatppuccin({
          flavor: "mocha", // 可選：latte, frappe, macchiato, mocha
        }),
      ],
      sidebar: [
        {
          label: "開始閱讀",
          translations: { en: "Getting Started" },
          items: [
            { label: "首頁", translations: { en: "Home" }, link: "/" },
            {
              label: "使用指南",
              translations: { en: "User Guide" },
              link: "/guide/",
            },
          ],
        },
        {
          label: "章程條文",
          translations: { en: "Bylaws" },
          autogenerate: { directory: "bylaws" },
        },
        {
          label: "參考資料",
          translations: { en: "Reference" },
          autogenerate: { directory: "meta" },
        },
      ],
      defaultLocale: "root",
      locales: {
        root: {
          label: "繁體中文",
          lang: "zh-TW",
          dir: "ltr",
        },
        en: {
          label: "English",
          lang: "en",
          dir: "ltr",
        },
      },
      customCss: ["./src/styles/optimize.css"],
      components: {
        // 可以在這裡覆寫 Starlight 元件
      },
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:title",
            content: "CoAssembly 章程 / Bylaws",
          },
        },
      ],
    }),
  ],
});
