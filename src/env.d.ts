/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Astro 環境變數類型定義
interface ImportMetaEnv {
    readonly PROD: boolean;
    readonly DEV: boolean;
    readonly MODE: string;
    readonly BASE_URL: string;
    readonly SITE: string;
    readonly ASSETS_PREFIX: string | undefined;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
