import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Go 実務学習ガイド",
        short_name: "GoStudy",
        description: "バックエンドエンジニア向けGo中級者学習アプリ",
        theme_color: "#0d7490",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"],
        navigateFallback: null,
      },
    }),
  ],
  base: "./",
  esbuild: {
    jsxImportSource: "hono/jsx/dom",
  },
});
