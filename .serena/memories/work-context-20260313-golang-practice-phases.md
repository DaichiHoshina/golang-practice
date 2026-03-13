# golang-practice 学習アプリ ブラッシュアップ進捗 (2026-03-13)

## 完了フェーズ

### Phase 1-A: 検索 + ブックマーク (main済み)
- src/search.tsx: Cmd+K グローバル検索モーダル
- src/icons.tsx: SearchIcon, BookmarkIcon, BookmarkOutlineIcon追加
- src/section-view.tsx: トピックカードにブックマーク機能
- src/app.tsx: サイドバーブックマーク一覧

### Phase 1-B: SRS + 苦手分析 + 学習カレンダー (main済み)
- src/srs.ts: SM-2アルゴリズム実装 (SRSCard, processResult, recordActivity, getStreak, getCalendarData)
- src/dashboard.tsx: 学習カレンダーヒートマップ、セクション別正答率、苦手トピック
- src/random-quiz.tsx: SRS due問題を優先出題

### Phase 2: クイズ強化 (main済み)
- src/daily-challenge.tsx: 日付シードによる決定論的日次チャレンジ5問
- src/types.ts: difficulty フィールド + getQuizDifficulty() ヘルパー
- src/random-quiz.tsx: 難易度フィルター chips (easy/medium/hard)、30秒タイマーモード
- src/icons.tsx: CalendarIcon, TimerIcon追加
- src/app.tsx: 今日のチャレンジ サイドバー + ルーティング

### Phase 3: PWA + データ管理 + アニメーション (main済み)
- vite.config.ts: vite-plugin-pwa追加 (SW + manifest自動生成)
- public/icon.svg: Go branded SVGアイコン
- src/data-manager.tsx: JSON export/import (全localStorage keys)
- src/dashboard.tsx: DataManager統合
- src/index.css: page-enter アニメーション追加
- src/app.tsx: key={currentSection} でページ遷移アニメーション
- index.html: PWA meta tags (theme-color, apple-mobile-web-app-*)

## 未実装
- Phase 4: Cloudflare Workers + D1 + GitHub OAuth + 進捗同期

## 主要アーキテクチャ
- SPA: Hono/jsx/dom (Preact-like)
- スタイル: Tailwind CSS v4 + DaisyUI v5 (light theme, Go teal primary)
- ビルド: Vite v6 + TypeScript
- 永続化: localStorage (go-study-completed/notes/quiz-scores/bookmarks/srs/log)

## Gitブランチ戦略
- main: 現在Phase 3まで完了
- feature/quiz-enhancements: Phase 2 (merge済み)
- feature/pwa-export-animations: Phase 3 (merge済み)
