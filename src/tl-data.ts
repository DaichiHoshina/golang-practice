// Tech Lead Interview Data
// Separate file to avoid bloating data.ts (already 7500+ lines)

export type TLCategory = "arch" | "quality" | "team";

export interface TLQuestion {
  id: string;
  category: TLCategory;
  question: string;
  context?: string;
  modelAnswer: string;
  keyPoints: string[];
  goExample?: string;
  difficulty: "basic" | "advanced";
  tags: string[];
}

export interface CaseStudy {
  id: string;
  category: TLCategory;
  scenario: string;
  question: string;
  considerations: string[];
  sampleApproach: string;
  goExample?: string;
}

export interface TLQuiz {
  id: string;
  category: TLCategory;
  question: string;
  answer: string;
  explanation: string;
  difficulty: "basic" | "advanced";
}

// ─── 技術設計・アーキテクチャ ────────────────────────────

export const ARCH_QUESTIONS: TLQuestion[] = [
  {
    id: "arch-microservices-split",
    category: "arch",
    question: "マイクロサービスに分割するかどうかの判断基準を教えてください。",
    modelAnswer:
      "まずモノリスが抱えている具体的な問題を確認します。判断基準は主に3つです。①チームの独立デプロイ要件（デプロイ頻度が高く、他チームとの調整コストが問題になっているか）、②スケーリング要件の分離（特定機能のみ高負荷で、個別スケールしたいか）、③障害分離（あるコンポーネントの障害が全体に波及することを防ぎたいか）。これらの問題がなければ、分散システムの複雑性（ネットワーク遅延、分散トレーシング、データ整合性）を背負う価値はありません。段階的に進める場合は Strangler Fig パターンを使い、新機能から順に切り出す方法が安全です。",
    keyPoints: [
      "問題ドリブンで判断する（技術トレンドに流されない）",
      "Conway's Law: チーム構造とシステム構造は一致する",
      "分散システムの複雑性コストを正直に評価する",
      "Strangler Fig で段階的移行",
    ],
    goExample: `// モノリス内での境界分離から始める（後のマイクロサービス化を見据えて）
// 各ドメインを独立したパッケージに分け、パッケージ間の依存を最小化

// user/service.go — user ドメインの境界
package user

type Service interface {
    Create(ctx context.Context, req CreateRequest) (User, error)
    Get(ctx context.Context, id string) (User, error)
}

// order/service.go — order ドメインは user を直接importしない
// インターフェース経由で依存関係を逆転させておく
package order

type UserResolver interface {
    Get(ctx context.Context, id string) (UserInfo, error)
}`,
    difficulty: "advanced",
    tags: ["microservices", "architecture", "design"],
  },
  {
    id: "arch-db-selection",
    category: "arch",
    question: "新規サービスのDB選定をどのように行いますか？RDBとNoSQLの使い分けは？",
    modelAnswer:
      "デフォルトはPostgreSQLのようなRDBを選びます。理由はACID保証、スキーマによる整合性強制、JOINの柔軟性、豊富な運用知見です。NoSQLを選ぶのは具体的な要件がある場合に限ります。例えば、スキーマレスな書き込みが多く、読み取りパターンが単純な場合はDynamoDB/MongoDB。グラフ構造のデータはNeo4j。時系列データはTimescaleDBやInfluxDB。全文検索はElasticsearch。重要なのは「〇〇の方がクール」ではなく、アクセスパターン・スケール要件・整合性要件・チームの習熟度を基準に選ぶことです。",
    keyPoints: [
      "デフォルトはRDB（PostgreSQL）",
      "アクセスパターン・整合性要件を最初に明確化",
      "チームの習熟度も選定基準に含める",
      "ポリグロット永続化は運用コスト増を意識する",
    ],
    difficulty: "basic",
    tags: ["database", "architecture"],
  },
  {
    id: "arch-scaling-strategy",
    category: "arch",
    question: "システムが急激にスケールする必要が生じた場合、どこから手をつけますか？",
    modelAnswer:
      "まずボトルネックを計測します。pprof/distributed tracingでどこで時間がかかっているか確認せずに対処するのは危険です。典型的なボトルネック順に対処します。①読み取りが多い場合: Read Replicaの追加、アプリケーションキャッシュ（Redis）の導入。②書き込みが多い場合: 非同期化（Message Queue）、シャーディング。③コンピュート: Horizontal Pod Autoscalerで水平スケール。④N+1問題など根本的な非効率: コードレベルの修正。短期的にはキャッシュとRead Replicaで対応し、長期的にアーキテクチャを改善するのが現実的です。",
    keyPoints: [
      "「計測してから対処」—推測でスケールアウトしない",
      "読み取りと書き込みのボトルネックは対策が異なる",
      "垂直スケール（インスタンスアップ）が最速だが上限がある",
      "キャッシュ戦略はCache Invalidationの複雑さとセット",
    ],
    goExample: `// Go での pprof 統合（本番でも有効化できる）
import _ "net/http/pprof"

// go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
// 上記コマンドで 30 秒間の CPU プロファイルを取得`,
    difficulty: "advanced",
    tags: ["scaling", "performance", "architecture"],
  },
  {
    id: "arch-api-versioning",
    category: "arch",
    question: "APIのバージョニング戦略はどう設計しますか？",
    modelAnswer:
      "バージョニング方法はURL（/v1/users）、ヘッダー（Accept: application/vnd.api+json;version=1）、クエリパラメータの3通りあります。私はURLバージョニングを推奨します。理由は明示性（ブラウザのURLで分かる）、キャッシュのしやすさ（CDN対応）、開発者が誤解しにくいためです。重要な設計原則は後方互換性の維持です。フィールドの追加はOK、削除・型変更はbreaking changeです。非推奨（deprecated）フィールドをしばらく残してから削除するSunsetポリシーを設けます。内部APIとPublic APIで戦略を変えることも有効です。",
    keyPoints: [
      "URLバージョニングが最も分かりやすい",
      "Breaking changeを避ける設計（拡張可能なスキーマ）",
      "Sunsetポリシー（非推奨から削除まで最低3ヶ月）",
      "内部API vs 外部APIで要件が異なる",
    ],
    difficulty: "basic",
    tags: ["api", "versioning", "design"],
  },
  {
    id: "arch-event-driven",
    category: "arch",
    question: "イベント駆動アーキテクチャを採用する場合の注意点は何ですか？",
    modelAnswer:
      "イベント駆動は疎結合とスケーラビリティで優れますが、いくつかの落とし穴があります。①べき等性の確保: メッセージは少なくとも1回届くが、重複して届くこともある（at-least-once delivery）。Consumerはべき等（同じメッセージを2回処理しても同じ結果）にする必要があります。②分散トレーシング: 同期呼び出しと異なりトレースIDを明示的に伝搬しないと追跡困難になります。③メッセージスキーマの進化: Protobuf/Avroのような後方互換スキーマを使い、フィールド削除は段階的に。④最終的整合性: RDBのトランザクションのような強整合性は持てない。UIへの影響（楽観的更新など）も考える必要があります。",
    keyPoints: [
      "べき等処理は必須（at-least-once delivery の前提）",
      "分散トレーシングを最初から設計に組み込む",
      "スキーマ進化戦略（Protobuf/Avro推奨）",
      "最終的整合性をアプリ層がどう扱うか設計する",
    ],
    goExample: `// べき等処理の実装例（処理済みイベントIDをDBに記録）
func (h *Handler) ProcessOrderCreated(ctx context.Context, event OrderCreatedEvent) error {
    // 処理済みチェック（idempotency key）
    processed, err := h.store.IsProcessed(ctx, event.ID)
    if err != nil {
        return err
    }
    if processed {
        return nil // 重複処理をスキップ
    }

    // トランザクション内で処理 + 処理済み記録を原子的に
    return h.store.WithTx(ctx, func(tx Store) error {
        if err := tx.MarkProcessed(ctx, event.ID); err != nil {
            return err
        }
        return tx.CreateInventoryReservation(ctx, event.OrderID)
    })
}`,
    difficulty: "advanced",
    tags: ["event-driven", "messaging", "architecture"],
  },
  {
    id: "arch-monolith-first",
    category: "arch",
    question: "新規プロダクトをマイクロサービスで始めるべきですか？",
    modelAnswer:
      "初期フェーズはモノリスから始めるべきです（モノリスファースト）。理由は3つです。①ドメイン境界が不明確: プロダクト初期は何が正しい境界か分からない。間違った境界でマイクロサービスを作ると後で大規模リファクタリングが必要になります。②チームが小さい: マイクロサービスは複数チームが独立して動けるメリットがあるが、5人以下なら通信オーバーヘッドの方が大きい。③速度が命: スタートアップは製品-市場フィットを探す時期。インフラ複雑度が開発速度を落とすのは致命的。成長に合わせて段階的に切り出すStrangler Figが理想的なアプローチです。",
    keyPoints: [
      "モノリスファーストが基本原則",
      "ドメイン境界はプロダクトが成熟してから明確になる",
      "Strangler Figで段階的マイクロサービス化",
      "チームサイズとアーキテクチャは対応する（Conway's Law）",
    ],
    difficulty: "basic",
    tags: ["microservices", "architecture", "startup"],
  },
  {
    id: "arch-cache-strategy",
    category: "arch",
    question: "キャッシュ戦略を設計する際のトレードオフを説明してください。",
    modelAnswer:
      "キャッシュの本質的なトレードオフは「一貫性 vs 性能」です。主要パターン：①Cache-Aside（Lazy Loading）: アプリがキャッシュとDBを管理。シンプルだがキャッシュミス時にレイテンシが増加。②Write-Through: 書き込み時にキャッシュとDBを同時更新。一貫性は高いがWrite遅延が増加。③Write-Behind: キャッシュに書き込み後、非同期でDB更新。Write高速だがDB障害時にデータロスのリスク。④Read-Through: キャッシュがDBを読む。アプリが意識しなくて良い。TTLの設定は重要で、短すぎるとキャッシュ効果が薄く、長すぎると古いデータを返す。Cache Invalidationはキャッシュの最難関であり、特にマイクロサービス間での整合性管理は慎重に設計します。",
    keyPoints: [
      "Cache Invalidationがキャッシュ設計の最難関",
      "TTL は SLA（許容staleness）から逆算する",
      "キャッシュ スタンピード（大量ミスヒット）に注意",
      "分散キャッシュは一貫性保証のレベルを明確にする",
    ],
    difficulty: "advanced",
    tags: ["cache", "performance", "architecture"],
  },
  {
    id: "arch-observability",
    category: "arch",
    question: "本番システムの可観測性（Observability）をどう設計しますか？",
    modelAnswer:
      "可観測性は3本柱（Metrics・Logs・Traces）を揃えることから始めます。Metrics: SLI（Error Rate、Latency p99、Availability）を定義し、SLO（例: 99.9% availability）を設定。PrometheusとGrafanaで可視化。Logs: 構造化ログ（JSON）を出力し、トレースIDを必ず付与。Elasticsearchや Cloud Loggingで集中管理。Traces: 分散トレーシング（OpenTelemetry）でサービス間のレイテンシ分布を把握。設計原則として「計測ファースト」—アラートは症状（高レイテンシ、エラー率上昇）を検知し、原因（CPU、DB遅延）は調査時に掘り下げます。テックリードとして、開発初期から可観測性を組み込む文化を作ることが重要です。",
    keyPoints: [
      "Metrics・Logs・Traces の3本柱",
      "SLI/SLO を先に定義してからアラートを設定",
      "構造化ログ + トレースID の伝搬は必須",
      "開発初期から可観測性を組み込む（後付けはコストが高い）",
    ],
    goExample: `// OpenTelemetry 統合の基本パターン
import "go.opentelemetry.io/otel"

func (s *Service) GetUser(ctx context.Context, id string) (User, error) {
    ctx, span := otel.Tracer("user-service").Start(ctx, "GetUser")
    defer span.End()

    span.SetAttributes(attribute.String("user.id", id))

    user, err := s.repo.Find(ctx, id)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return User{}, err
    }
    return user, nil
}`,
    difficulty: "advanced",
    tags: ["observability", "monitoring", "operations"],
  },
  {
    id: "arch-tech-selection",
    category: "arch",
    question: "新技術を採用するかどうかの意思決定プロセスを説明してください。",
    modelAnswer:
      "新技術採用は4段階で評価します。①必要性の確認: 現在の問題を解決するか？既存技術では本当に解決できないか？②リスク評価: 本番実績はあるか？コミュニティのサポートは活発か？セキュリティの脆弱性対応は迅速か？③コスト評価: 学習コスト（チーム全体）、移行コスト、運用コスト。④試験的導入: まず非クリティカルなサービスや新機能に限定して試す。ThoughtWorksのTechnology Radarのようなフレームワークを参考に「Adopt/Trial/Assess/Hold」で評価するのも有効です。テックリードとして「新しいから採用する」ではなく「問題を解決するから採用する」文化を作ることが重要です。",
    keyPoints: [
      "技術選定は問題ドリブン（トレンドドリブンではない）",
      "Proof of Conceptを小規模から始める",
      "チーム全体の学習コストを見積もる",
      "「採用しない」という判断も重要な意思決定",
    ],
    difficulty: "basic",
    tags: ["decision-making", "architecture", "leadership"],
  },
  {
    id: "arch-go-concurrency-design",
    category: "arch",
    question: "高スループットが必要なGoサービスの並行処理をどう設計しますか？",
    modelAnswer:
      "Goの並行処理設計はいくつかの原則に従います。①ゴルーチンリーク防止: 起動したゴルーチンは必ず終了させる。contextのキャンセルを伝播させ、タイムアウトを設定。②バックプレッシャー設計: チャネルのバッファサイズで流量を制御。Workerプールでゴルーチン数を制限し、メモリ使用量を予測可能に保つ。③共有メモリより通信を好む: sync.Mutexより channel通信を優先。ただしMutexの方がシンプルな場合はMutexを使う（Race detectorで検証）。④負荷テストと計測: go test -race で競合検出。benchmarkと pprof でボトルネック特定。",
    keyPoints: [
      "ゴルーチンリークは長期稼働サービスで致命的",
      "Workerプールでゴルーチン数を上限設定",
      "sync.Mutex vs channel: 単純な排他制御はMutexで十分",
      "go test -race は CI に必ず組み込む",
    ],
    goExample: `// Workerプールの基本パターン
func NewWorkerPool(ctx context.Context, workers int, jobs <-chan Job) <-chan Result {
    results := make(chan Result, workers)
    var wg sync.WaitGroup

    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                select {
                case <-ctx.Done():
                    return
                default:
                    results <- process(job)
                }
            }
        }()
    }

    go func() {
        wg.Wait()
        close(results) // 全Worker終了後に閉じる
    }()

    return results
}`,
    difficulty: "advanced",
    tags: ["concurrency", "go", "performance"],
  },
];

// ─── コードレビュー・品質 ────────────────────────────────

export const QUALITY_QUESTIONS: TLQuestion[] = [
  {
    id: "quality-review-focus",
    category: "quality",
    question: "コードレビューで最も重視するポイントは何ですか？",
    modelAnswer:
      "コードレビューの優先順位は「正確さ > 保守性 > 性能 > スタイル」の順です。①正確さ: 仕様通りに動くか？エッジケース（ゼロ値、空リスト、タイムアウト）は考慮されているか？②保守性: 変更が必要になった時に別の開発者が理解・修正しやすいか？複雑な処理にはコメントがあるか？③エラー処理: エラーを握りつぶしていないか？適切なログと文脈（context）が付与されているか？スタイルはlinterに任せる。重要なのは「正しいか？」「安全か？」「理解しやすいか？」の3点です。また承認をためらわない文化—ニトピックはNitと明示し、必須ではないことを示すことも重要です。",
    keyPoints: [
      "正確さ・安全性を最優先、スタイルはlinterに任せる",
      "エラーハンドリングのパターンは統一されているか",
      "レビューコメントは「Nit:」「Required:」などで優先度を明示",
      "承認の速さも開発速度に直結する",
    ],
    goExample: `// レビューで必ずチェックするエラー処理パターン

// Bad: エラーを無視
result, _ := fetchData(ctx)

// Bad: コンテキストなしでwrap
if err != nil {
    return err
}

// Good: エラーに文脈を付加
result, err := fetchData(ctx)
if err != nil {
    return fmt.Errorf("fetchData for user %s: %w", userID, err)
}`,
    difficulty: "basic",
    tags: ["code-review", "quality", "team"],
  },
  {
    id: "quality-tech-debt",
    category: "quality",
    question: "技術的負債をどのように管理・解消しますか？",
    modelAnswer:
      "技術的負債は「意図的な負債」と「不意の負債」に分類します。意図的な負債（リリース優先でのショートカット）は記録してチケット化し、後で必ず返済する。不意の負債（知識不足や設計ミス）は発見次第記録。管理方法：①可視化: 負債を Tech Debt backlogとして管理し、四半期ごとにビジネス側と共有。②返済の組み込み: スプリントの20%をリファクタリングに充てる。③ボーイスカウトルール: 触ったコードは触る前より少し良くして返す。④リファクタリングの優先基準: 変更頻度が高いコード、バグが多いコード、新機能追加を妨げているコードを優先。",
    keyPoints: [
      "負債を可視化・記録しないと存在しないことになる",
      "スプリントに技術的負債返済の時間を意図的に確保",
      "ボーイスカウトルール: 触ったコードを少し良くして返す",
      "ビジネス側に負債のコスト（開発速度低下）を説明できること",
    ],
    difficulty: "basic",
    tags: ["tech-debt", "quality", "team"],
  },
  {
    id: "quality-test-strategy",
    category: "quality",
    question: "テスト戦略はどのように設計しますか？どのテストをどれだけ書くべきですか？",
    modelAnswer:
      "テストピラミッドが基本です。Unit Test（70%）: 高速、安定、ビジネスロジックを網羅。Integration Test（20%）: DBやHTTPなど外部依存とのインターフェースをテスト。E2E Test（10%）: 重要なユーザーフロー（ハッピーパス）のみ。テスト戦略の判断軸：①変更されやすい実装詳細ではなく、振る舞いをテストする。②テストダブル（モック）は外部IO（DB、HTTP）に限定。内部実装のモックは避ける。③テストが壊れやすい場合は設計が悪いサイン。Goでは table-driven testで多くのケースを簡潔に記述し、-race フラグで並行バグを早期発見します。",
    keyPoints: [
      "テストピラミッド: Unit 70% / Integration 20% / E2E 10%",
      "実装詳細ではなく振る舞いをテストする",
      "テストが脆い場合は設計の問題を疑う",
      "CI に go test -race を組み込む",
    ],
    goExample: `// table-driven test の標準パターン
func TestValidate(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    bool
        wantErr bool
    }{
        {"valid email", "user@example.com", true, false},
        {"empty input", "", false, true},
        {"no domain", "user@", false, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Validate(tt.input)
            if (err != nil) != tt.wantErr {
                t.Fatalf("unexpected error: %v", err)
            }
            if got != tt.want {
                t.Errorf("got %v, want %v", got, tt.want)
            }
        })
    }
}`,
    difficulty: "basic",
    tags: ["testing", "quality"],
  },
  {
    id: "quality-refactoring-judgment",
    category: "quality",
    question: "リファクタリングが必要かどうかの判断基準と進め方は？",
    modelAnswer:
      "リファクタリングのトリガーは「変更するたびに辛いと感じるコード」です。具体的な兆候：①同じロジックが3箇所以上ある（Rule of Three）②500行超のファイルや100行超の関数③条件分岐の複雑さ（Cyclomatic Complexity > 10）④テストを書くのが異常に難しい。進め方の鉄則は「テストなしでのリファクタリングは禁止」です。手順：①まず既存動作をカバーするテストを書く。②小さなステップで変更、各ステップでテストを通す。③一度に1つの変更（命名変更なら命名変更だけ）。大規模リファクタリングの場合はフィーチャーフラグや Strangler Figパターンで段階的に切り替える。",
    keyPoints: [
      "Rule of Three: 3回繰り返したらリファクタリングのサイン",
      "テストなしのリファクタリングは禁止",
      "小さなステップ + 継続的なテスト通過",
      "リファクタリングと機能追加を同じPRに混ぜない",
    ],
    difficulty: "basic",
    tags: ["refactoring", "quality"],
  },
  {
    id: "quality-ci-cd",
    category: "quality",
    question: "CI/CDパイプラインで必ず設定すべき品質チェックは何ですか？",
    modelAnswer:
      "CIパイプラインの必須チェック一覧：①Build: コンパイルエラーを最初に検出。②Unit Tests with race detector: go test -race ./...。③Lint: golangci-lintで静的解析（errcheck、govet、staticcheck）。④Security Scan: go vuln check、または trivy でCVEスキャン。⑤Coverage gate: コアロジックのカバレッジ閾値（例: 80%以上）。⑥Integration Tests: Dockerを使ってDB込みのテスト。CDパイプラインでは、本番デプロイ前に staging環境でのSmoke Testを実行し、メトリクス（エラー率、レイテンシ）が閾値内であることを確認してから本番展開します。Blue/Greenデプロイでロールバックを容易にすることも重要です。",
    keyPoints: [
      "CIは高速であること（10分以内を目標）",
      "go test -race は必須",
      "Security scan は定期実行だけでなくPRにも",
      "Coverage は目的ではなく手段（パーセントより重要な部分のカバレッジ）",
    ],
    difficulty: "basic",
    tags: ["ci-cd", "quality", "automation"],
  },
  {
    id: "quality-code-review-culture",
    category: "quality",
    question: "コードレビュー文化をチームに定着させるにはどうしますか？",
    modelAnswer:
      "コードレビュー文化の構築は3つの側面から進めます。①プロセスの整備: PRサイズの基準を設ける（推奨500行以内）。レビュー完了の期待値を明確に（例: 24時間以内）。②フィードバックの質向上: 「なぜ」を説明するコメント文化。承認ニトピックは「Nit:」で明示。コードではなく行為を批評する（「このコードは...」ではなく「こういう実装だと...の問題が起きます」）。③心理的安全性: テックリード自身が積極的にフィードバックを求める。「私のコードも間違えます」というモデリング。レビューで問題が見つかれば「良い発見！」と称える。",
    keyPoints: [
      "PRサイズを小さく保つ（大きなPRはレビュー品質が落ちる）",
      "コードではなく行為に対してフィードバックする",
      "テックリード自身がレビューを求めるモデリング",
      "承認速度も品質指標（WIP上限の管理）",
    ],
    difficulty: "basic",
    tags: ["code-review", "culture", "team"],
  },
  {
    id: "quality-incident-prevention",
    category: "quality",
    question: "本番障害を減らすための品質プロセスを設計してください。",
    modelAnswer:
      "障害防止の多層防御アプローチ：①設計段階: フェイルセーフ設計（デフォルト安全）、Circuit Breakerで障害伝播を防止、Chaos Engineeringで弱点を事前発見。②開発段階: コードレビュー（特にエラーパスとリソースリーク）、統合テストでエッジケース網羅、負荷テスト（本番相当のデータ量で）。③デプロイ段階: Canary/Blue-Green デプロイで段階的展開、自動ロールバックトリガー（エラー率閾値）。④障害発生後: Blameless Post-mortem（責任追及なし）、根本原因分析（5 Whys）、検出時間・復旧時間のSLO化。「障害はゼロにできない、検出と復旧を速くする」が現代の考え方です。",
    keyPoints: [
      "障害はゼロにできない—検出と復旧速度（MTTR）を最小化",
      "Blameless Post-mortemで心理的安全性を保つ",
      "Canary デプロイで影響範囲を最小化",
      "根本原因を直さないと同じ障害が繰り返す",
    ],
    difficulty: "advanced",
    tags: ["reliability", "quality", "operations"],
  },
  {
    id: "quality-go-linting",
    category: "quality",
    question: "GoプロジェクトでのLint設定とコードスタイルの統一方法を教えてください。",
    modelAnswer:
      "Goはgofmtで基本フォーマットが統一されるため、スタイル論争が少ないのが強みです。追加のツール：①golangci-lint: 複数のlinterをまとめて実行。推奨有効化: errcheck（エラー未処理検出）、govet（疑わしいコード）、staticcheck（静的解析）、gosec（セキュリティ）、gocritic（コードスメル）。②.golangci.yml でプロジェクト固有のルールを定義。③pre-commit フックでコミット前にgofmt + golangci-lint実行。④エラーには必ずwrapする: fmt.Errorf('operation: %w', err)。設定は厳格にしすぎず、チームで合意した最低限のルールから始めて段階的に追加するのが実践的です。",
    keyPoints: [
      "golangci-lint を CI に必ず組み込む",
      "設定は段階的に厳格化（最初から厳しくしすぎない）",
      "pre-commit フックで開発者の手元でも早期検出",
      "errcheck はほぼ必須（エラー握りつぶし防止）",
    ],
    difficulty: "basic",
    tags: ["linting", "go", "quality"],
  },
];

// ─── チームリード・組織 ──────────────────────────────────

export const TEAM_QUESTIONS: TLQuestion[] = [
  {
    id: "team-1on1",
    category: "team",
    question: "1on1ミーティングをどのように運営しますか？",
    modelAnswer:
      "1on1は「マネージャーのための会議ではなく、メンバーのための会議」です。週次30-60分を推奨。アジェンダはメンバーが作り、テックリードはファシリテート。話すべき主要トピック：①近況・モチベーション（最近の仕事はどうか？）②課題・ブロッカー（何か困っていることは？）③キャリア・成長（3ヶ月後にどうなりたいか？）④フィードバック（私への率直なフィードバックは？）重要なのは「アクションアイテムを記録して次の1on1でフォローアップすること」と「上司への不満ではなく成長と問題解決に焦点を当てること」です。",
    keyPoints: [
      "メンバーのアジェンダ優先—テックリードが話しすぎない",
      "一貫して開催する（キャンセルしない文化）",
      "アクションアイテムを記録してフォローアップ",
      "心理的安全性を作ることが最初の仕事",
    ],
    difficulty: "basic",
    tags: ["1on1", "management", "team"],
  },
  {
    id: "team-hiring",
    category: "team",
    question: "エンジニアの採用面接でどのような点を評価しますか？",
    modelAnswer:
      "採用面接の評価軸は4つです。①技術力: コーディング問題だけでなく、設計の思考プロセスを重視。正解よりも「どう考えるか」を見る。②コラボレーション: ペアプロ形式で、ヒントをどう活用するか、フィードバックをどう受けるかを観察。③成長マインドセット: 過去の失敗から何を学んだか？知らないことを素直に言えるか？④チームフィット: バリューと文化への適合（ただし多様性を排除しない）。採用の失敗コストは極めて高いため、迷ったら採用しない原則を持つ。構造化面接（全候補者に同じ質問）で公平性を確保します。",
    keyPoints: [
      "思考プロセスを評価する（正解より過程）",
      "迷ったら採用しない原則",
      "構造化面接で公平性を確保",
      "多様性 vs チームフィットのバランス",
    ],
    difficulty: "basic",
    tags: ["hiring", "team", "management"],
  },
  {
    id: "team-onboarding",
    category: "team",
    question: "新メンバーのオンボーディングをどのように設計しますか？",
    modelAnswer:
      "30-60-90日計画が効果的です。最初の30日: 環境セットアップ、コードベース理解、小さな修正タスク（バグ修正・ドキュメント）。目標はアーキテクチャを理解し、デプロイを1回経験すること。60日まで: 機能開発を担当、積極的なコードレビューへの参加。メンターを1人指定しサポート。90日まで: 独立したフィーチャー開発、チームのレトロスペクティブでの発言。重要な仕掛け：①セットアップドキュメントを常に最新に保つ（新メンバーに更新してもらう）②ファーストプルリクエストを早期に出させる③「聞いて当然の雰囲気」を明示的に作る。",
    keyPoints: [
      "30-60-90日計画で段階的に自立を促す",
      "最初の1週間でデプロイを経験させる",
      "ドキュメントを新メンバーに更新してもらうことでドキュメントが生き続ける",
      "メンターをアサインして孤立を防ぐ",
    ],
    difficulty: "basic",
    tags: ["onboarding", "team", "management"],
  },
  {
    id: "team-estimation",
    category: "team",
    question: "見積もりの精度を上げるにはどうすればよいですか？",
    modelAnswer:
      "見積もりは予測ではなくコミットメントです。精度向上のプラクティス：①タスク分解: 「2週間の作業」を「1日以内のタスク」に分解。分解できないものはリスクが高い。②3点見積もり: 楽観・現実的・悲観の3パターンを出し、(楽観 + 4×現実 + 悲観) / 6 でWACC計算。③バッファの明示: バッファを見積もりに隠すのではなく、スコープのどこにリスクがあるかを明示して別途バッファを確保。④前回の実績参照: チームのベロシティ（過去スプリントの実績）を基準に。⑤ユーザーストーリーポイント: 絶対時間より相対サイズで比較。最終的に「見積もりが外れた場合の早期報告文化」が最も重要です。",
    keyPoints: [
      "タスクは1日以内に分解できるまで細かく",
      "バッファを隠さずリスクとして明示する",
      "チームのベロシティ（過去実績）を基準にする",
      "見積もり外れを早期に報告できる文化が最重要",
    ],
    difficulty: "basic",
    tags: ["estimation", "project-management", "team"],
  },
  {
    id: "team-conflict",
    category: "team",
    question: "チーム内で技術的な意見対立が起きた場合、どう解決しますか？",
    modelAnswer:
      "技術的意見対立の解決フレームワーク：①まず意見を正確に理解する: 双方が相手の主張を自分の言葉で説明できるか確認（Rubber Duck討論）。②判断基準を明確にする: 何を優先するのか（スピード・保守性・コスト）合意する。③データで判断する: PoC（Proof of Concept）や benchmarkで実測。感情ではなくデータ。④時間制限を設ける: 合意できない場合はテックリードが決定し、理由を明示。決定後は全員が一致して進む。重要なのは「Disagree and Commit」文化—反対意見を言う権利はあるが、決定後は一致して動く。",
    keyPoints: [
      "双方の主張を正確に理解してから議論を進める",
      "判断基準（優先事項）を先に合意する",
      "データ（PoC・benchmark）で判断",
      "Disagree and Commit: 決定後は全員が一致して動く",
    ],
    difficulty: "advanced",
    tags: ["conflict-resolution", "team", "decision-making"],
  },
  {
    id: "team-feedback",
    category: "team",
    question: "パフォーマンスが低いメンバーへのフィードバックはどうしますか？",
    modelAnswer:
      "フィードバックの基本はSBIフレームワーク（Situation・Behavior・Impact）です。「先週のXというミーティングで（Situation）、推定を求められた時にデータなしで即答しました（Behavior）。その結果、ステークホルダーが誤った期待を持ち、後で修正が必要でした（Impact）。」と具体的に伝えます。重要な原則：①早いフィードバック: 気づいた直後に伝える（月次レビューを待たない）。②プライベートで: 否定的フィードバックは1on1で。ポジティブは公開で。③改善の余地を示す: 「次からこうしてほしい」という明確な期待値。④記録: 継続する問題は文書化し、改善計画を共有。",
    keyPoints: [
      "SBIフレームワーク（状況・行動・影響）で具体的に",
      "早くフィードバック（問題が大きくなる前に）",
      "否定的フィードバックはプライベートで、ポジティブは公開で",
      "改善への具体的な行動期待を示す",
    ],
    difficulty: "advanced",
    tags: ["feedback", "management", "team"],
  },
  {
    id: "team-priority",
    category: "team",
    question: "複数のタスクや要求が競合した場合の優先順位付けはどうしますか？",
    modelAnswer:
      "優先順位付けのフレームワーク：①RICE スコアリング: Reach（影響ユーザー数）× Impact（ユーザーへの影響度）× Confidence（確信度）÷ Effort（工数）。②緊急性と重要性の2軸（アイゼンハワーマトリクス）: 重要かつ緊急→即対応、重要だが緊急でない→計画、緊急だが重要でない→委譲、どちらでもない→削除。③ステークホルダーとのコミュニケーション: 何を削るかを明示。「AとBを両方やるには〇〇の期間がかかる。優先順位を決めましょう」と交渉する。④テックリードとして: 技術的コンテキスト（負債・リスク）をビジネス側が優先度決定できるよう翻訳することが重要な役割。",
    keyPoints: [
      "RICEスコアで客観的に優先順位付け",
      "「全部やる」は約束しない—削るものを明示",
      "技術的コンテキストをビジネス言語に翻訳する役割",
      "アイゼンハワーマトリクスで緊急性と重要性を分ける",
    ],
    difficulty: "basic",
    tags: ["prioritization", "project-management", "team"],
  },
  {
    id: "team-knowledge-sharing",
    category: "team",
    question: "チームの知識共有とバス係数（Bus Factor）向上をどう進めますか？",
    modelAnswer:
      "バス係数（1人がバスにひかれてもプロジェクトが継続できるか）の向上は可用性リスク管理です。実践：①ドキュメント文化: ADR（Architecture Decision Records）でなぜそう設計したかを記録。README + Runbookを常に最新に。②コードレビューのローテーション: 毎回同じ人がレビューしない。全員が全ドメインに触れる機会を作る。③ペアプロ・モブプロ: 知識の属人化が高い部分を優先。④Tech Talk: 月1回のLT（5分）で調査内容や設計判断を共有。⑤オンコール（障害対応）のローテーション: 全員がシステム全体を理解するきっかけになる。",
    keyPoints: [
      "ADR（設計意思決定記録）で文脈を残す",
      "コードレビューをローテーションしてバス係数を上げる",
      "ドキュメントより「新人が自力で環境構築できるか」で品質を測る",
      "ペアプロは効率より知識移転を目的にする場合もある",
    ],
    difficulty: "advanced",
    tags: ["knowledge-sharing", "team", "documentation"],
  },
];

// ─── ケーススタディ ──────────────────────────────────────

export const CASE_STUDIES: CaseStudy[] = [
  // arch
  {
    id: "case-arch-rewrite",
    category: "arch",
    scenario:
      "5年稼働しているモノリシックなGoサービス（20万行）があります。DBのクエリが遅く、新機能追加のたびに別チームとの調整が発生し、デプロイが月1回になっています。CTOから「マイクロサービス化を検討してほしい」と言われました。",
    question: "テックリードとして、どのようなアプローチで対応しますか？",
    considerations: [
      "本当の問題はマイクロサービス化で解決するのか、それとも別の問題か？",
      "段階的移行か全面リライトか（リライトのリスクは？）",
      "どのコンポーネントから切り出すか（依存関係の少ない部分から？）",
      "既存チームのスキルセットはマイクロサービス運用に対応しているか？",
      "デプロイ頻度の低さとDBクエリ遅延は別々の問題では？",
    ],
    sampleApproach:
      "まず問題を分解します。DBクエリ遅延とデプロイ頻度低下は異なる問題です。①DBクエリ: スロークエリログを取得し、インデックス追加やクエリ最適化から対処。②デプロイ頻度: モノリス内での独立デプロイを妨げているプロセス問題か、コード結合の問題か特定。Strangler Figパターンを採用し、まず新機能から独立サービスとして切り出す試験的移行から始めます。全面リライトは実績として避ける—第2システム症候群のリスクが高い。移行時のKPIを設定（デプロイ頻度・インシデント件数・開発速度）し、効果を測定しながら進めます。",
    goExample: `// Strangler Fig: 既存モノリスのハンドラにフィーチャーフラグを追加
// 新サービスへのルーティングを段階的に切り替える

func (h *Handler) HandleOrder(w http.ResponseWriter, r *http.Request) {
    if h.flags.IsEnabled("new-order-service", r.Context()) {
        // 新サービスにプロキシ
        h.orderServiceProxy.ServeHTTP(w, r)
        return
    }
    // 既存の処理
    h.legacyHandleOrder(w, r)
}`,
  },
  {
    id: "case-arch-scaling",
    category: "arch",
    scenario:
      "あなたのサービスが突然バイラルし、通常の100倍のトラフィックが来ることが予測されます。現在のシステムはシングルインスタンスのGoサーバー + PostgreSQL（スペック: 2CPU / 4GB RAM）で動いています。1週間でスケールする必要があります。",
    question: "何を最優先で対応しますか？",
    considerations: [
      "1週間という制約の中でできることとできないことの仕分け",
      "水平スケールの障壁（ステートフルな部分はあるか？）",
      "DBがボトルネックになる可能性（最も危険なポイント）",
      "コスト vs 対応スピードのトレードオフ",
    ],
    sampleApproach:
      "1週間でできる現実的な対応（優先度順）：①DBインスタンスアップサイズ（即効性高い、数時間で適用）②Read Replica追加（読み取りを分散）③Goサーバーを複数インスタンスに水平スケール（ステートレスか確認。セッションがあればRedisで外部化）④CDNでの静的アセットキャッシュ⑤頻繁にアクセスされるDBクエリのRedisキャッシュ。並行して1ヶ月後の対応（DB接続プール調整、スロークエリ最適化、Auto Scaling設定）も計画します。完璧な解を目指さず「まず動く状態を維持する」を最優先にします。",
  },
  // quality
  {
    id: "case-quality-pr-review",
    category: "quality",
    scenario:
      "シニアエンジニアが1000行のPRを提出しました。コードは動作しているように見えますが、テストがなく、エラーハンドリングが一部雑で、変数名が不明確な箇所があります。本人はリリース期限が迫っていると言っています。",
    question: "このPRをどう扱いますか？",
    considerations: [
      "期限のプレッシャーと品質のトレードオフをどう判断するか",
      "1000行PRに対してどのようなフィードバックをするか",
      "今後この状況を防ぐためにどうするか",
      "シニアエンジニアに対するフィードバックの仕方（心理的安全性）",
    ],
    sampleApproach:
      "まずリリース期限の本当の緊急度を確認します。期限が絶対的でない場合: テストなしでのマージは将来の負債になることを伝え、最低限のテスト（ハッピーパス + 主要エラーケース）を追加を依頼。クリティカルな問題（エラー握りつぶし、セキュリティ問題）は必須修正、ニトピックはコメントのみ。期限が絶対的な場合: マージは承認し、テスト追加をフォローアップチケット化して明示的にコミットしてもらう。根本対策として、1000行PRが発生する前のレビューポイントを設ける（設計レビュー、中間コードレビュー）慣行を提案します。",
  },
  {
    id: "case-quality-flaky-test",
    category: "quality",
    scenario:
      "CIが頻繁にランダムに失敗するようになりました。原因は複数の非決定論的テスト（時刻依存、並行処理、外部APIへの実接続）です。チームは「CIが失敗したら再実行する」という文化になっています。",
    question: "この状況をどう改善しますか？",
    considerations: [
      "フレーキーなテストを放置するとどんな問題が起きるか",
      "原因ごとの修正アプローチ（時刻依存 vs 並行依存 vs 外部API）",
      "「再実行文化」を変えるにはどうするか",
      "短期対応と長期対応の分け方",
    ],
    sampleApproach:
      "フレーキーなテストは「テストへの信頼を壊す最悪の問題」と認識してもらうことが先決です。短期: 問題のあるテストを隔離（`t.Skip`または別のCI jobに移動）し、メインブランチのCIを安定させます。長期対応（原因別）：①時刻依存: `time.Now()`を注入可能にする。②並行処理: `go test -race` で検出し修正、またはテスト間の独立性を確保。③外部API: testcontainersでDBをローカル起動、HTTPはhttptestでモック。並行してフレーキーテスト数のダッシュボード化でモニタリングし、修正をチームの優先タスクとして扱います。",
    goExample: `// 時刻依存テストのリファクタリング
// Before: time.Now() 直呼び → テスト不安定
func (s *Service) IsExpired(token Token) bool {
    return token.ExpiresAt.Before(time.Now())
}

// After: 時刻を注入可能に
type TimeProvider func() time.Time

func (s *Service) IsExpiredAt(token Token, now TimeProvider) bool {
    return token.ExpiresAt.Before(now())
}

// テストで固定時刻を注入
fixedNow := func() time.Time { return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) }
assert.True(t, svc.IsExpiredAt(expiredToken, fixedNow))`,
  },
  // team
  {
    id: "case-team-underperformer",
    category: "team",
    scenario:
      "チームメンバーのAさん（入社1年目）は技術力は十分ですが、見積もりが常に2-3倍ズレ、コミュニケーションが少なく、ブロッカーを早期に共有しないパターンが続いています。1on1では「問題ない」と言います。",
    question: "テックリードとしてどうアプローチしますか？",
    considerations: [
      "問題の本質は何か（スキル不足？不安？プロセス理解？）",
      "「問題ない」という回答の背後にあるものは何か",
      "具体的な行動変容をどう促すか",
      "どの時点でマネージャーにエスカレーションするか",
    ],
    sampleApproach:
      "まず1on1の質問を変えます。「問題ないですか？」ではなく「今週一番大変だったことは何ですか？」「もし私が邪魔している場合はどういう点ですか？」と具体的に聞きます。見積もりズレには、タスク分解のやり方を一緒に練習します（1日以内のタスクに分解できるか）。ブロッカー未共有は「詰まったら2時間以内に報告する」という明確なルールを合意。改善が見られない場合、状況・期待・観察した結果・影響を文書化しマネージャーに共有。パフォーマンス管理（PIP）はテックリードではなくマネージャーの役割だと明確に認識します。",
  },
  {
    id: "case-team-deadline",
    category: "team",
    scenario:
      "重要な機能のリリース1週間前に、チームの主要エンジニアが体調不良で長期休養することになりました。残りのメンバーだけでは期日通りのリリースが難しい状況です。",
    question: "テックリードとしてどう対応しますか？",
    considerations: [
      "現状の正確な見積もりをどう作り直すか",
      "ステークホルダーへの説明タイミングと方法",
      "スコープ削減 vs 期日延長 vs リソース追加の判断",
      "残ったチームへの心理的影響への配慮",
    ],
    sampleApproach:
      "まず状況を正確に把握します。①残タスクの棚卸し（完成済み・未完成・ブロック中の分類）②残メンバーの実工数見積もり③MVP（最小リリース可能機能）の定義。その後、できるだけ早くステークホルダーに3つのシナリオを提示します：A）スコープ削減（コア機能のみ）で期日通りリリース、B）期日を2週間延長してフル機能リリース、C）追加リソース（他チームからの一時的なサポート）。選択肢を提示して判断をビジネス側に委ねます。残チームには状況を正直に説明し、過剰な残業を強いない。また属人化していた知識を文書化するきっかけとして活用します。",
  },
];

// ─── クイズ ─────────────────────────────────────────────

export const TL_QUIZZES: TLQuiz[] = [
  {
    id: "tlq-arch-1",
    category: "arch",
    question: "新規プロダクトのアーキテクチャ選択として「モノリスファースト」が推奨される主な理由は何ですか？",
    answer:
      "ドメイン境界が初期段階では不明確なため、間違った境界でマイクロサービスを作ると後で高コストなリファクタリングが必要になるから。また小規模チームでは分散システムの運用コストがメリットを上回るため。",
    explanation:
      "マイクロサービスのメリット（独立デプロイ・個別スケール）が活きるのはチームが大きく、ドメインが成熟した段階。早すぎる分割はシステム複雑性だけを増やす。",
    difficulty: "basic",
  },
  {
    id: "tlq-arch-2",
    category: "arch",
    question: "イベント駆動アーキテクチャでConsumerをべき等（Idempotent）にしなければならない理由は何ですか？",
    answer:
      "メッセージキューはat-least-once deliveryを保証するため、同じメッセージが複数回届く可能性があるから。べき等でなければ重複処理により二重決済や在庫の重複削減などのデータ不整合が発生する。",
    explanation:
      "exactly-once deliveryは理論的に難しく（2フェーズコミット等が必要）コストが高い。実用的にはConsumer側でべき等処理を実装する方が現実的。",
    difficulty: "advanced",
  },
  {
    id: "tlq-arch-3",
    category: "arch",
    question: "Cache Invalidationが「コンピュータサイエンスの2大難問の1つ」と言われる理由を簡潔に説明してください。",
    answer:
      "キャッシュを更新するタイミング（書き込み時・期限切れ・イベント通知）と粒度（全キャッシュ無効化 vs 部分無効化）の判断が難しく、更新漏れでデータ不整合が起き、過剰無効化でキャッシュ効果が失われるという矛盾が生じるため。",
    explanation:
      "分散環境ではさらに難しくなる（複数ノード間の整合性）。TTLベースのシンプルな戦略から始め、必要な場合のみ複雑な無効化戦略を採用するのが実践的。",
    difficulty: "advanced",
  },
  {
    id: "tlq-arch-4",
    category: "arch",
    question: "ReadとWriteのスケール戦略の違いを説明してください。",
    answer:
      "Readスケール: Read Replicaの追加、キャッシュ（Redis）、CDN。Writeスケール: 非同期化（メッセージキュー）、シャーディング（水平分割）、CQRSパターン（Read/Writeモデルの分離）。",
    explanation:
      "多くのWebアプリはRead負荷 >> Write負荷のため、まずRead Replicaとキャッシュで対処できる。Writeスケールはより複雑でデータ整合性への影響が大きい。",
    difficulty: "basic",
  },
  {
    id: "tlq-arch-5",
    category: "arch",
    question: "Strangler Figパターンとは何ですか？どの場面で使いますか？",
    answer:
      "既存システムを段階的に新システムに置き換えるパターン。新機能から順に新システムで実装し、フィーチャーフラグやリクエストルーティングで切り替えを管理。モノリスからマイクロサービスへの移行や大規模リライト時に使用。",
    explanation:
      "全面リライト（Big Bang）は「第2システム症候群」のリスクが高く、リリースまでの期間が長いと要件が変化してしまう。段階的移行はリスクを分散できる。",
    difficulty: "basic",
  },
  {
    id: "tlq-quality-1",
    category: "quality",
    question: "テストピラミッドにおける各テストの比率として一般的に推奨されるものはどれですか？",
    answer:
      "Unit Test: 70%、Integration Test: 20%、E2E Test: 10%。Unit Testは高速・安定でビジネスロジックをカバー。Integration Testは外部依存との境界。E2Eはクリティカルなフローのみ。",
    explanation:
      "逆ピラミッド（E2Eが多い）はテストが遅く不安定になる。テストアイスクリームコーンとも呼ばれ、CIを壊す原因になる。",
    difficulty: "basic",
  },
  {
    id: "tlq-quality-2",
    category: "quality",
    question: "コードカバレッジ100%を目標にすることの問題点は何ですか？",
    answer:
      "テスト件数やカバレッジが高くても品質を保証しない。assertion なしのテストや自明なコード（getter等）のテストでカバレッジを上げることができ、本当に重要なエッジケースや異常系の網羅より指標の達成が目的化してしまう。",
    explanation:
      "カバレッジはバグが残りやすい場所（複雑なロジック、エラーパス）のテスト状況を確認する手段。目標は「重要なビジネスロジックが網羅されているか」。",
    difficulty: "basic",
  },
  {
    id: "tlq-quality-3",
    category: "quality",
    question: "「フレーキーテスト（flaky test）」の典型的な原因を3つ挙げてください。",
    answer:
      "①時刻依存（time.Now()への依存、タイムゾーン問題）②並行処理の競合（共有状態へのロックなしアクセス）③外部依存（実際のDBやHTTP APIへの接続でタイムアウトや遅延）。テスト間の依存関係（テスト順序に依存する状態）も原因になる。",
    explanation:
      "go test -race でデータ競合を検出。時刻はinterfaceで注入。外部依存はtestcontainersやhttptestで制御。",
    difficulty: "advanced",
  },
  {
    id: "tlq-team-1",
    category: "team",
    question: "「バス係数（Bus Factor）」とは何ですか？それを上げる方法を1つ答えてください。",
    answer:
      "「何人がバスにひかれてもプロジェクトが継続できるか」を示す指標。1人に知識が集中している場合バス係数=1で非常にリスクが高い。向上方法例: コードレビューのローテーション、ペアプログラミング、ADR（設計意思決定記録）の記録、オンコールのローテーション。",
    explanation:
      "バス係数はリスク管理の観点だけでなく、個人の長期休暇・転職リスクも含む。知識移転はコスト（ペアプロの遅さ）と引き換えだが長期的には必須投資。",
    difficulty: "basic",
  },
  {
    id: "tlq-team-2",
    category: "team",
    question: "SBIフィードバックフレームワークのSBIとは何の略ですか？使い方を簡単に説明してください。",
    answer:
      "Situation（状況）・Behavior（行動）・Impact（影響）。「先週のスプリントレビューで（S）、実装中の問題を報告しなかったため（B）、ステークホルダーが誤った期待を持ちました（I）」のように具体的な事実と影響を伝える。",
    explanation:
      "「あなたはいつも...」のような一般化ではなく、具体的な事実に基づくフィードバックが変容につながる。批判ではなく行動と影響を伝えることで受け取りやすくなる。",
    difficulty: "basic",
  },
  {
    id: "tlq-team-3",
    category: "team",
    question: "「Disagree and Commit」文化とはどういう意味ですか？なぜ重要ですか？",
    answer:
      "意思決定プロセスで反対意見を言う権利は保証されるが、決定が下された後は全員が一致して実行するという文化。意見対立が意思決定を遅らせず、実行フェーズでの分裂を防ぐ。",
    explanation:
      "合意は「全員が同意すること」ではなく「全員が聞かれ、決定を尊重すること」。特にリモートチームや大規模チームで意思決定速度を保つために重要。",
    difficulty: "advanced",
  },
  {
    id: "tlq-team-4",
    category: "team",
    question: "30-60-90日オンボーディング計画で、最初の30日に最も重要なマイルストーンは何ですか？",
    answer:
      "1回目のデプロイ経験（本番またはステージング環境へのリリース）。コードベースの全体把握より、開発からデプロイまでのフローを1サイクル経験させることが信頼感・帰属意識の醸成に効果的。",
    explanation:
      "最初の1ヶ月に「自分の変更が本番に届いた」という経験をさせることで心理的な安心感が生まれる。小さなバグ修正でもよい。",
    difficulty: "basic",
  },
];

export const ALL_TL_QUESTIONS: TLQuestion[] = [
  ...ARCH_QUESTIONS,
  ...QUALITY_QUESTIONS,
  ...TEAM_QUESTIONS,
];

export const CATEGORY_LABELS: Record<TLCategory, string> = {
  arch: "技術設計",
  quality: "コードレビュー・品質",
  team: "チームリード",
};

export const CATEGORY_ICONS: Record<TLCategory, string> = {
  arch: "◇",
  quality: "✓",
  team: "⊕",
};
