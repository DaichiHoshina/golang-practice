# Go 実務学習ガイド

バックエンドエンジニア向け Go 中級者の学び直しページ。

**https://go-study-app.pages.dev**

## セクション

- 基本文法 — Slice / interface nil トラップ / defer / receiver
- 設計 — error handling / context / interface / package
- 並行処理 — goroutine / channel / worker pool / リーク防止
- パフォーマンス — benchmark / pprof / メモリ最適化
- テスト — table-driven / mock
- 実務アンチパターン — 避けるべき書き方
- 面接対策 — goroutine / GC / interface
- 要点まとめ — 設計判断フローチャート

## 技術スタック

| 技術 | 用途 |
|------|------|
| [Hono](https://hono.dev/) (`hono/jsx/dom`) | クライアントサイド JSX |
| [Vite](https://vite.dev/) | ビルド + HMR |
| TypeScript | 型安全 |
| [Tailwind CSS v4](https://tailwindcss.com/) | ユーティリティ CSS |
| [DaisyUI v5](https://daisyui.com/) | UI コンポーネント (night theme) |
| [highlight.js](https://highlightjs.org/) | Go シンタックスハイライト |

## 開発

```bash
npm install
npm run dev      # localhost:5173
npm run build    # dist/ に出力
npm run preview  # ビルド結果をプレビュー
```

## デプロイ

| 環境 | URL |
|------|-----|
| Frontend | https://go-study-app.pages.dev |
| Worker API | https://go-study-api.daichi-go-study.workers.dev |

`main` ブランチに push すると Cloudflare Pages で自動デプロイ。
