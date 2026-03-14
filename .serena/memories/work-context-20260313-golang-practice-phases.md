# golang-practice 作業記録

## PRD目標: 達成済み

- クイズ総数: **188問** (PRD目標: 188+)
- トピック数: 79 / セクション数: 14（+ TL面接セクション追加で15）

## 実装済み機能 (2026-03-14 時点)

### テックリード面接対策ページ (2026-03-14 追加)
- `src/tl-data.ts`: TLQuestion/CaseStudy/TLQuizの型定義 + コンテンツ
  - Q&A 26問（技術設計10/品質8/チームリード8）
  - ケーススタディ 6件
  - クイズ 12問
- `src/tech-lead-interview.tsx`: 独立ページコンポーネント
  - カテゴリフィルター + Q&A/ケーススタディ/クイズ切替
  - 確認済み進捗管理（localStorage）
  - Go コード例ハイライト（hljs.highlightElement）
- `src/data.ts`: SECTIONSに「TL面接（★）」追加
- `src/app.tsx`: tl-interview ルーティング追加

### Dashboard 強化
- SRS復習カード（今日の復習件数 + 復習ボタン）
- 7日間学習量トレンドグラフ + 修了予測日数

### Random Quiz モード
- QuizMode: normal / review（SRS due） / weak（正答率<80%）

### Go Playground
- 行番号オーバーレイ（スクロール同期）
- テンプレート5種 + エラー行番号ハイライト

### テスト
- vitest導入、srs.test.ts(16件) + daily-challenge.test.ts(5件)

## アーキテクチャ
- 実行: Go Playground API経由 (Worker proxy)
- エディタ: textarea + 行番号オーバーレイ
- 保存: localStorage

## デプロイ先
- Frontend: https://go-study-app.pages.dev
- Worker API: https://go-study-api.daichi-go-study.workers.dev
- Branch: main

### CF Pages 自動デプロイ (GitHub Actions)
- `.github/workflows/deploy.yml` で build → GitHub Pages + Cloudflare Pages 同時デプロイ
- Secrets: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` 設定済み
- main push で自動反映（手動デプロイ不要）

## UI改善済み (2026-03-14, commit 2c6feaa)
- Dashboard: 「今すぐやること/今日のおすすめ」をトップに配置、セクションヘッダー追加
- Dashboard: dueCount=0時ヘッダー動的切り替え、recSection null安全対応
- RandomQuiz: フィルターに「セクション/難易度/出題モード」グループラベル追加
- SectionView: 完了トピックに border-l-4 border-success で視認性向上
- Sidebar: 「ツール」ヘッダーでツールと学習セクションを視覚分離

## 未実装 (保留)
- WebAssembly (yaegi) によるオフライン実行（難易度高）
- CodeMirror 6（Go公式LSP/langパッケージなし → 保留）
- LSP 自動補完（難易度高）
