// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "My Docs",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/withastro/starlight",
        },
      ],
      sidebar: [
        {
          label: "關於 Co-Assembly",
          autogenerate: { directory: "about-us" },
        },
        {
          label: "我們如何合作",
          autogenerate: { directory: "how-we-work" },
        },
        {
          label: "加入我們",
          autogenerate: { directory: "join-us" },
        },
        {
          label: "工作模式",
          autogenerate: { directory: "work-mode" },
        },
        {
          label: "尊重與照顧",
          autogenerate: { directory: "respect-and-care" },
        },
        {
          label: "溝通語言與工具",
          autogenerate: { directory: "communication-and-tools" },
        },
        {
          label: "離開與結束的方式",
          autogenerate: { directory: "leaving-and-ending" },
        },
      ],
    }),
  ],
});
