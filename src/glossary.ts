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

  // ── 型システム（追加） ──
  {
    term: "generics",
    description:
      "Go 1.18 で導入された型パラメータ。[T any] や [T comparable] のように制約を指定する。コンテナ型やユーティリティ関数の汎用化に使うが、interface で済む場合は不要。",
  },
  {
    term: "type constraint",
    description:
      "generics の型パラメータに課す制約。any（制約なし）、comparable（== 比較可能）、独自の interface 制約を定義できる。~ を使うと underlying type でもマッチする。",
  },

  // ── 並行処理（追加） ──
  {
    term: "sync.RWMutex",
    description:
      "読み取りと書き込みを区別するロック。RLock/RUnlock で複数の読み取りを並行許可し、Lock/Unlock で排他的な書き込みを行う。read-heavy なワークロードで Mutex より高スループット。",
  },
  {
    term: "sync.Map",
    description:
      "goroutine 安全な map 実装。read-heavy で key が安定しているケースに最適化されている。通常の map + Mutex の方が適切な場合も多いので、benchmark で比較すべき。",
  },
  {
    term: "sync.Once",
    description:
      "一度だけ関数を実行する同期プリミティブ。Do(func()) は何度呼んでも最初の1回だけ実行される。シングルトン初期化や遅延初期化に使う。",
  },
  {
    term: "rate limiting",
    description:
      "一定時間あたりのリクエスト数を制限する手法。Go では golang.org/x/time/rate の Limiter（トークンバケット）や time.Ticker を使って実装する。",
  },
  {
    term: "graceful shutdown",
    description:
      "サーバーを停止する際に処理中のリクエストを完了させてから終了する手法。os.Signal で SIGTERM を受け取り、context.WithTimeout で猶予時間を設定する。",
  },

  // ── ツールチェイン ──
  {
    term: "golangci-lint",
    description:
      "Go の静的解析ツールランナー。50以上の linter を統合実行できる。.golangci.yml で有効/無効を制御。CI に組み込むのが標準的。",
  },
  {
    term: "go generate",
    description:
      "ソースコード中の //go:generate コメントからコード生成を実行するツール。stringer、mockgen、protoc などと組み合わせて使う。生成結果はリポジトリにコミットするのが慣習。",
  },
  {
    term: "go vet",
    description:
      "Go 標準の静的解析ツール。printf フォーマット不一致、到達不能コード、コピー禁止の構造体のコピーなどを検出する。go build とは別に実行が推奨される。",
  },

  // ── パフォーマンス（追加） ──
  {
    term: "strings.Builder",
    description:
      "string の連結を効率的に行うための型。内部で []byte バッファを使い、+ 演算子による毎回のメモリ確保を避ける。ループ内での文字列構築に必須。",
  },

  // ── テスト（追加） ──
  {
    term: "testify",
    description:
      "Go の人気テストライブラリ。assert（アサーション）、require（失敗時即停止）、mock（モック生成）、suite（テストスイート）の4パッケージを提供する。",
  },

  // ── 設計（追加） ──
  {
    term: "middleware",
    description:
      "HTTP ハンドラを wrap して横断的関心事（認証、ログ、リカバリ等）を追加するパターン。func(http.Handler) http.Handler シグネチャが Go の標準的な形式。",
  },

  // ── 設計パターン（追加） ──
  {
    term: "Functional Options",
    description:
      "可変長引数で設定を渡す Go のイディオム。type Option func(*T) と WithXxx ファクトリ関数で構成。API の後方互換を保ちつつ柔軟な設定が可能。Dave Cheney が提唱。",
  },
  {
    term: "DI",
    description:
      "依存性注入 (Dependency Injection)。Go ではコンストラクタ引数で依存を渡すのが標準的。interface で抽象化し、テスト時にモックを注入する。",
  },

  // ── 並行処理パターン（追加） ──
  {
    term: "Pipeline",
    description:
      "channel で処理ステージを直列に接続するパターン。各ステージは独立した goroutine で動作し、Fan-out/Fan-in で並列化できる。",
  },
  {
    term: "Fan-out",
    description:
      "1つの channel を複数の goroutine が読み取るパターン。処理を並列化してスループットを向上させる。",
  },
  {
    term: "Fan-in",
    description:
      "複数の channel からの出力を1つの channel に集約するパターン。sync.WaitGroup で全 goroutine の完了を待ち、merged channel を close する。",
  },

  // ── パフォーマンス（追加） ──
  {
    term: "GOGC",
    description:
      "Go の GC 頻度を制御する環境変数。ヒープが前回 GC 後の N% 増えたら GC を実行（デフォルト 100 = 2倍で実行）。GOGC=off で GC を無効化。",
  },
  {
    term: "GOMEMLIMIT",
    description:
      "Go 1.19+ で追加されたソフトメモリ上限の環境変数。この上限に近づくと積極的に GC が走る。コンテナのメモリ上限の 80-90% に設定するのが目安。",
  },

  // ── テスト（追加） ──
  {
    term: "Fuzzing",
    description:
      "ランダムな入力を自動生成してバグを発見するテスト手法。Go 1.18 で testing.F として標準ライブラリに統合。パーサーやバリデータに特に有効。",
  },

  // ── 実務パターン ──
  {
    term: "slog",
    description:
      "Go 1.21 で追加された標準の構造化ログパッケージ (log/slog)。JSONHandler / TextHandler を標準提供し、key-value ペアで構造化データを出力する。",
  },
  {
    term: "LimitReader",
    description:
      "io.LimitReader(r, n) で読み取りバイト数を制限する。外部 API のレスポンスや、ユーザーアップロードのサイズ制限に使い、OOM を防ぐ。",
  },
];

// 検索用: 用語 → 説明のマップ
export const GLOSSARY_MAP = new Map<string, string>(
  GLOSSARY.map((e) => [e.term, e.description]),
);
