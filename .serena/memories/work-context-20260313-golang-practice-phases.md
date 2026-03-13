# golang-practice 学習アプリ ブラッシュアップ進捗 (2026-03-13)

## 全フェーズ完了 - main に全マージ済み

### Phase 1-A: 検索 + ブックマーク
- src/search.tsx: Cmd+K グローバル検索モーダル
- src/icons.tsx: SearchIcon, BookmarkIcon, BookmarkOutlineIcon追加
- src/section-view.tsx: トピックカードにブックマーク機能

### Phase 1-B: SRS + 苦手分析 + 学習カレンダー
- src/srs.ts: SM-2アルゴリズム (SRSCard, processResult, recordActivity, getStreak, getCalendarData)
- src/dashboard.tsx: 学習カレンダーヒートマップ、セクション別正答率、苦手トピック
- src/random-quiz.tsx: SRS due問題を優先出題

### Phase 2: クイズ強化
- src/daily-challenge.tsx: 日付シードによる決定論的日次チャレンジ5問
- src/types.ts: difficulty + getQuizDifficulty() ヘルパー
- src/random-quiz.tsx: 難易度フィルターchips, 30秒タイマーモード
- src/icons.tsx: CalendarIcon, TimerIcon追加

### Phase 3: PWA + データ管理 + アニメーション
- vite.config.ts: vite-plugin-pwa (SW + manifest)
- public/icon.svg: Go teal SVGアイコン
- src/data-manager.tsx: JSON export/import
- src/index.css: page-enter アニメーション

### Phase 4: Cloudflare Workers + D1 + GitHub OAuth + 同期
- workers/src/index.ts: HTTPルーター (OAuth + sync PUT/GET)
- workers/src/auth.ts: HMAC-SHA256 JWT (Web Crypto API)
- workers/schema.sql: D1スキーマ (users + progress)
- wrangler.toml: Workers + D1バインディング設定
- src/sync.ts: APIクライアント
- src/sync-ui.tsx: SyncButton (ドロップダウン: 保存/取得/ログアウト)

## デプロイ手順 (Phase 4)
1. D1作成: `wrangler d1 create go-study-db`
2. スキーマ適用: `wrangler d1 execute go-study-db --file=workers/schema.sql`
3. シークレット設定: `wrangler secret put GITHUB_CLIENT_ID` など
4. デプロイ: `wrangler deploy`
5. フロントエンド: `.env` に `VITE_API_URL=https://go-study-api.<user>.workers.dev`

## 主要アーキテクチャ
- SPA: Hono/jsx/dom + Tailwind v4 + DaisyUI v5 (light theme, Go teal primary)
- ビルド: Vite v6 + TypeScript + vite-plugin-pwa
- 永続化: localStorage (go-study-completed/notes/quiz-scores/bookmarks/srs/log)
- バックエンド: Cloudflare Workers + D1 + GitHub OAuth + JWT (HttpOnly cookie)
