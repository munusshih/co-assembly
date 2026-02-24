// Astro 配置檔案
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeCatppuccin from "@catppuccin/starlight";
import remarkCustomHeadingId from "remark-custom-heading-id";
import mermaid from "astro-mermaid";

// https://astro.build/config
export default defineConfig({
  site: "https://munusshih.github.io",
  base: import.meta.env.PROD ? "/co-assembly" : "/",
  markdown: {
    remarkPlugins: [remarkCustomHeadingId],
  },
  integrations: [
    mermaid(),
    starlight({
      title: "CoAssembly 章程",
      description: "共同集合設計合作社組織章程 v0.1.0 草稿",
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
          items: [{ label: "首頁", link: "/" }],
        },
        {
          label: "章程條文",
          autogenerate: { directory: "bylaws" },
        },
        {
          label: "參考資料",
          autogenerate: { directory: "meta" },
        },
        {
          label: "技術文檔",
          autogenerate: { directory: "reference" },
        },
      ],
      defaultLocale: "root",
      locales: {
        root: {
          label: "繁體中文",
          lang: "zh-TW",
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
            content: "CoAssembly 章程",
          },
        },
      ],
    }),
  ],
});
