// ═══════════════════════════════════════════════════════════
// Go 用語辞書 — ツールチップで表示する詳細説明
// ═══════════════════════════════════════════════════════════

export interface GlossaryEntry {
  term: string;
  description: string;
}

// 長い用語から先にマッチさせるため、登録順は長さ降順を推奨
export const GLOSSARY: GlossaryEntry[] = [
  // ── 並行処理 ──
  {
    term: "goroutine",
    description:
      "Go ランタイムが管理する軽量スレッド。OS スレッドの約 1/1000 のメモリ（初期 2KB スタック）で起動でき、M:N スケジューリングで数十万単位の並行実行が可能。go キーワードで起動する。",
  },
  {
    term: "channel",
    description:
      "goroutine 間でデータを安全に受け渡すための型付きパイプ。unbuffered channel は送受信が同期的にブロックし、buffered channel はバッファが満杯になるまで非同期に動作する。",
  },
  {
    term: "worker pool",
    description:
      "固定数の goroutine がジョブ channel からタスクを取り出して処理するパターン。goroutine の無制限生成を防ぎ、リソース消費を制御できる。",
  },
  {
    term: "WaitGroup",
    description:
      "sync.WaitGroup。複数の goroutine の完了を待つためのカウンター。Add() でカウント増加、Done() で減少、Wait() でゼロになるまでブロックする。",
  },
  {
    term: "Mutex",
    description:
      "sync.Mutex。排他制御のためのロック機構。Lock() で取得、Unlock() で解放。共有リソースへの同時アクセスを防ぐ。RWMutex は読み取りの並行を許可する変種。",
  },
  {
    term: "select",
    description:
      "複数の channel 操作を同時に待ち受ける制御構文。ready な case をランダムに選択して実行する。default を付けると非ブロッキングになる。タイムアウトやキャンセルの実装に不可欠。",
  },
  {
    term: "data race",
    description:
      "2つ以上の goroutine が同じメモリに同時アクセスし、少なくとも1つが書き込みである状態。go run -race や go test -race で検出可能。",
  },
  {
    term: "errgroup",
    description:
      "golang.org/x/sync/errgroup。goroutine グループの同期とエラー伝播を行うパッケージ。いずれかの goroutine がエラーを返すと context がキャンセルされる。",
  },

  // ── 設計・型システム ──
  {
    term: "interface",
    description:
      "メソッドシグネチャの集合で定義される型。Go では暗黙的に満たされる（implements 宣言不要）。小さな interface（1-2メソッド）を消費者側で定義するのが Go の慣習。",
  },
  {
    term: "context",
    description:
      "context.Context。リクエストスコープの値、デッドライン、キャンセルシグナルを goroutine 間で伝播する標準パッケージ。関数の第一引数として渡すのが慣習。",
  },
  {
    term: "error",
    description:
      "Go の組み込み interface（Error() string メソッドを持つ）。Go では例外ではなく戻り値でエラーを返す。errors.Is / errors.As でラップされたエラーを判定する。",
  },
  {
    term: "defer",
    description:
      "関数の終了時に実行される遅延呼び出し。LIFO（後入れ先出し）で実行される。リソース解放やロック解除に使うが、ループ内での使用は意図しないリソース保持の原因になる。",
  },
  {
    term: "receiver",
    description:
      "メソッドに関連付けられた型。値レシーバ（T）はコピーを受け取り、ポインタレシーバ（*T）は元の値を変更できる。構造体が大きい場合やフィールドを変更する場合はポインタレシーバを使う。",
  },
  {
    term: "nil",
    description:
      "ポインタ、interface、map、slice、channel、関数のゼロ値。interface の nil は（型情報, 値）のペアで、型情報が入っていると nil 比較が false になるトラップがある。",
  },
  {
    term: "struct",
    description:
      "フィールドの集合で定義される複合型。Go にはクラスがなく、struct + メソッドで OOP を表現する。埋め込み（embedding）で擬似的な継承を実現できる。",
  },
  {
    term: "embedding",
    description:
      "struct に無名フィールドとして別の型を埋め込む機能。埋め込まれた型のメソッドが昇格し、委譲パターンを簡潔に書ける。ただし is-a 関係ではなく has-a 関係。",
  },

  // ── パッケージ・ビルド ──
  {
    term: "package",
    description:
      "Go のコード整理単位。ディレクトリ = パッケージ。大文字で始まる名前はエクスポートされ、小文字は非公開。internal/ ディレクトリで公開範囲を制限できる。",
  },
  {
    term: "go module",
    description:
      "Go の依存管理システム。go.mod でモジュールパスと依存関係を定義。go.sum でチェックサムを検証する。セマンティックバージョニングに準拠。",
  },

  // ── パフォーマンス ──
  {
    term: "pprof",
    description:
      "Go 標準のプロファイリングツール。CPU、メモリ（heap）、goroutine、ブロックの各プロファイルを取得できる。net/http/pprof でHTTPエンドポイントとしても公開可能。",
  },
  {
    term: "benchmark",
    description:
      "testing.B を使った性能測定テスト。func BenchmarkXxx(b *testing.B) で定義し、go test -bench で実行。b.N 回のループで安定した計測が行われる。",
  },
  {
    term: "GC",
    description:
      "ガベージコレクション。Go は並行マーク&スイープ GC を採用。GOGC 環境変数でGC頻度を調整可能（デフォルト100）。Go 1.19+ では GOMEMLIMIT でメモリ上限を指定できる。",
  },
  {
    term: "escape analysis",
    description:
      "コンパイラがローカル変数をスタックに置くかヒープに置くかを決定する解析。go build -gcflags='-m' で結果を確認できる。ヒープ割り当てが増えると GC 負荷が上がる。",
  },
  {
    term: "sync.Pool",
    description:
      "一時オブジェクトのキャッシュプール。GC 間でオブジェクトを再利用することでヒープ割り当てを減らす。高頻度で生成・破棄されるバッファなどに有効。",
  },

  // ── テスト ──
  {
    term: "table-driven test",
    description:
      "テストケースをスライスで定義し、ループで実行するGoのテストイディオム。t.Run でサブテスト化し、各ケースに名前をつけることで失敗時の特定が容易になる。",
  },
  {
    term: "mock",
    description:
      "テスト時に本物の依存を置き換える偽の実装。Go では interface を使って差し替える。mockgen や手書き mock が一般的。DI（依存性注入）と組み合わせて使う。",
  },
  {
    term: "t.Helper",
    description:
      "テストヘルパー関数であることを宣言するメソッド。失敗時のスタックトレースからヘルパー関数を除外し、実際のテストコードの行番号が報告されるようにする。",
  },

  // ── その他重要概念 ──
  {
    term: "backing array",
    description:
      "slice の裏にある連続メモリ領域。複数の slice が同じ backing array を共有できるため、一方の変更が他方に影響する。append で容量を超えると新しい配列が確保される。",
  },
  {
    term: "zero value",
    description:
      'Go で変数を初期化しなかった場合のデフォルト値。数値は 0、文字列は ""、bool は false、ポインタ・slice・map・channel は nil。意図的にゼロ値で動作する設計が推奨される。',
  },
  {
    term: "goroutine leak",
    description:
      "終了しない goroutine がメモリやリソースを消費し続ける問題。context によるキャンセル伝播や、channel の適切な close で防ぐ。go vet や runtime.NumGoroutine() で検出。",
  },
  {
    term: "panic",
    description:
      "回復不能なランタイムエラーを発生させる組み込み関数。recover() でキャッチ可能だが、通常のエラーハンドリングには error を使うべき。本当に続行不能な場合のみ使用する。",
  },
  {
    term: "init",
    description:
      "パッケージ初期化時に自動実行される特殊関数。引数なし・戻り値なし。テストが困難になるため、可能な限り明示的な初期化関数を使う方が好ましい。",
  },
];

// 検索用: 用語 → 説明のマップ
export const GLOSSARY_MAP = new Map<string, string>(
  GLOSSARY.map((e) => [e.term, e.description]),
);
