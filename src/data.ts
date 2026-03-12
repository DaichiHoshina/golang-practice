import type { Topic, Section, Recommendation } from "./types";

// ═══════════════════════════════════════════════════════════
// TOPICS
// ═══════════════════════════════════════════════════════════

export const TOPICS: Record<string, Topic> = {
  // ── 基本文法 ──────────────────────────────────────────

  "syntax-slice": {
    id: "syntax-slice",
    section: "syntax",
    title: "Slice の内部構造と落とし穴",
    tag: "必須",
    summary:
      "slice は (ptr, len, cap) の3要素。append の挙動を理解することが並行処理バグ防止の第一歩。",
    why: "slice を単純な動的配列として扱うと、append 後の参照共有や goroutine 間のデータ競合を引き起こす。内部構造を知れば設計判断が根本から変わる。",
    tradeoffs: [
      {
        title: "copy vs スライス共有",
        desc: "コピーはメモリを消費するが安全。共有はパフォーマンスは高いが変更が予期しない場所に伝播する。",
      },
      {
        title: "cap の事前確保",
        desc: "make([]T, 0, n) でキャパシティを指定すると append の reallocation が減り高速になる。ただし過剰確保はメモリの無駄遣い。",
      },
    ],
    badCode: `// 危険: append 後も s1 と s2 が backing array を共有する
s1 := make([]int, 3, 6)
s2 := s1[:3]
s2 = append(s2, 4)  // s1 の backing array を変更する可能性!

// goroutine 間で共有も危険
go func() { s1[0] = 99 }()  // data race!

// cap を指定しないと O(n log n) の realloc が発生
result := []Item{}
for _, v := range input {
    result = append(result, process(v))  // 都度 realloc
}`,
    goodCode: `// 安全: 明示的コピーで独立させる
s1 := []int{1, 2, 3}
s2 := make([]int, len(s1))
copy(s2, s1)  // 完全に独立した slice

// capacity を事前指定して realloc を防ぐ
result := make([]Item, 0, len(input))
for _, v := range input {
    result = append(result, process(v))
}

// 3-index slice で cap を制限
safe := s1[:2:2]  // len=2, cap=2 → append 時に必ず新配列を確保

// nil slice と empty slice の違い
var ns []int        // nil slice: json → null
es := []int{}       // empty slice: json → []`,
    interviewPoints: [
      "slice は値型だが内部でポインタを持つ（参照セマンティクス的に動く）",
      "append は cap を超えると新しい配列を確保し、元の配列とは別物になる",
      "goroutine 間で slice を共有する場合は copy するか channel 経由で渡す",
      "nil slice と empty slice は len==0 で同じだが json.Marshal の結果が違う（null vs []）",
    ],
  },

  "syntax-interface-nil": {
    id: "syntax-interface-nil",
    section: "syntax",
    title: "Interface の nil トラップ",
    tag: "ハマりポイント",
    summary:
      "interface 値は (type, value) のペア。nil ポインタを格納した interface は non-nil になる。",
    why: "この罠は Go 中級者への登竜門。error インターフェースで頻出し、本番バグの原因になりやすい。",
    tradeoffs: [
      {
        title: "具体型 vs interface 返却",
        desc: "関数が具体型を返す場合はこの問題が起きない。error を返す関数で nil を返すときは必ず untyped nil を使う。",
      },
    ],
    badCode: `// 典型的な罠: nil *MyError を error interface に詰める
type MyError struct{ msg string }
func (e *MyError) Error() string { return e.msg }

func getError(flag bool) error {
    var err *MyError  // nil ポインタ
    if flag {
        err = &MyError{"something went wrong"}
    }
    return err  // ← nil *MyError だが interface は non-nil!
}

if err := getError(false); err != nil {
    fmt.Println("ここに入ってしまう!")  // unexpected!
}`,
    goodCode: `// 正しい: nil は明示的に nil interface として返す
func getError(flag bool) error {
    if flag {
        return &MyError{"something went wrong"}
    }
    return nil  // 明示的に untyped nil を返す

}

// errors.As で安全に型チェック
var myErr *MyError
if errors.As(err, &myErr) {
    fmt.Println("MyError:", myErr.msg)
}`,
    interviewPoints: [
      "interface は (動的型, 動的値) のペアとして実装されている",
      "nil interface は型も値も nil だが、nil ポインタを持つ interface は型情報がある",
      "error を返す関数では具体型変数を経由して return しない",
      "errors.Is / errors.As を使うとラップされたエラーの型チェックができる",
    ],
  },

  "syntax-defer": {
    id: "syntax-defer",
    section: "syntax",
    title: "defer の評価タイミングと活用パターン",
    tag: "イディオム",
    summary:
      "defer は LIFO。引数は登録時に評価される。クロージャ経由で最終値を使う。名前付き返り値と組み合わせるとトランザクション制御が綺麗に書ける。",
    why: "リソース解放・パニックリカバリ・関数終了時の処理に defer は必須。ただし引数評価タイミングを間違えると計測が0nsになるなどのバグになる。",
    tradeoffs: [
      {
        title: "defer vs 明示的クリーンアップ",
        desc: "defer は確実に実行されるので安全。ループ内では関数終了まで解放されないため、ループ内リソース管理は関数化して defer を使うのが正しい。",
      },
    ],
    badCode: `// 引数が登録時に評価されるトラップ
start := time.Now()
defer fmt.Println(time.Since(start))  // ← 常に 0ns になる!

// ループ内 defer: ループ終了まで解放されない
for _, path := range paths {
    f, _ := os.Open(path)
    defer f.Close()  // 関数が終わるまで全 file が開きっぱなし!
}`,
    goodCode: `// クロージャで関数終了時の値を使う
start := time.Now()
defer func() { fmt.Println(time.Since(start)) }()

// 名前付き返り値 + defer でトランザクション制御
func withTx(db *sql.DB, fn func(*sql.Tx) error) (err error) {
    tx, err := db.Begin()
    if err != nil { return err }
    defer func() {
        if err != nil {
            tx.Rollback()
        } else {
            err = tx.Commit()
        }
    }()
    return fn(tx)
}

// ループ内は関数で囲む
for _, path := range paths {
    if err := processFile(path); err != nil { return err }
}
func processFile(path string) error {
    f, err := os.Open(path)
    if err != nil { return err }
    defer f.Close()
    return readAndProcess(f)
}`,
    interviewPoints: [
      "defer の引数は登録時に評価される（クロージャ経由なら回避可能）",
      "複数 defer は LIFO（後入れ先出し）順で実行される",
      "名前付き返り値と defer の組み合わせでトランザクション制御が書ける",
      "panic が起きても defer は実行される（recover はここで使う）",
    ],
  },

  "syntax-receiver": {
    id: "syntax-receiver",
    section: "syntax",
    title: "Value vs Pointer Receiver の判断基準",
    tag: "設計",
    summary:
      "状態変更・大きな構造体・nil チェックが必要なら pointer。immutable な計算は value。同一型で混在させない。",
    why: "receiver の選択は API の意図を表す設計決定。混在させると interface 実装で *T と T どちらが実装しているかが曖昧になる。",
    tradeoffs: [
      {
        title: "pointer receiver",
        desc: "状態変更できる。ゼロコピー。nil チェックが必要になる場合もある。",
      },
      {
        title: "value receiver",
        desc: "コピーを渡すため元の値を変更しない。小さな構造体・immutable な操作向き。",
      },
    ],
    badCode: `// 混在は避ける (interface 実装で混乱が生じる)
type Counter struct{ n int }
func (c Counter)  Value() int { return c.n }  // value
func (c *Counter) Inc()       { c.n++ }        // pointer
// → *Counter は両方実装するが Counter は Inc() を実装しない

// value receiver で状態変更しようとする (効果なし)
func (c Counter) Reset() { c.n = 0 }  // コピーが変更されるので無意味!`,
    goodCode: `// 状態を持つ型は一貫して pointer receiver
type Counter struct{ n int }
func (c *Counter) Value() int { return c.n }
func (c *Counter) Inc()       { c.n++ }
func (c *Counter) Reset()     { c.n = 0 }

// immutable な計算は value receiver
type Point struct{ X, Y float64 }
func (p Point) Distance(q Point) float64 {
    dx, dy := p.X-q.X, p.Y-q.Y
    return math.Sqrt(dx*dx + dy*dy)
}

// 判断チェックリスト
// pointer: mutate / 大きな struct / sync.Mutex / nil を扱う
// value:   小さな struct / 変更しない / map・slice・chan (既にポインタ的)`,
    interviewPoints: [
      "pointer receiver は mutation の意図を明示する",
      "同一型で value/pointer を混在させない（interface 実装が複雑になる）",
      "sync.Mutex を含む構造体は必ず pointer receiver（コピーするとロックが無効）",
      "map, slice, chan はそれ自体がポインタ的なので value receiver でも OK",
    ],
  },

  // ── 設計 ──────────────────────────────────────────────

  "design-error": {
    id: "design-error",
    section: "design",
    title: "Error Handling 設計",
    tag: "最重要",
    summary:
      "sentinel / wrapping / custom type の3層設計。fmt.Errorf + %w でラップ、errors.Is/As でアンラップ。",
    why: "エラー処理は Go で最も語られる設計課題。正しい設計がないとエラーの原因追跡が困難になり、障害対応コストが増大する。",
    tradeoffs: [
      {
        title: "sentinel error",
        desc: "比較が簡単。ただし pkg 間で依存が生まれる。io.EOF が代表例。",
      },
      {
        title: "error wrapping (%w)",
        desc: "コンテキストを付加でき errors.Is/As で検索可能。標準的な選択。",
      },
      {
        title: "custom error type",
        desc: "追加フィールドを持たせられる。errors.As で取得可能。詳細が必要な場合に使う。",
      },
    ],
    badCode: `// エラーを握りつぶす (最悪)
result, _ := doSomething()

// コンテキストなしで返す
func loadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil { return nil, err }  // ← どのファイルか情報がない
}

// string 比較でエラー判定 (brittle)
if err.Error() == "not found" { ... }

// log して return を忘れる
if err != nil {
    log.Printf("error: %v", err)
    // ← return を忘れて処理が続く!
}`,
    goodCode: `// sentinel error: 既知の終端条件
var ErrNotFound = errors.New("not found")

// wrapping: コンテキストを付加して伝播
func loadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("loadConfig %s: %w", path, err)
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("loadConfig parse: %w", err)
    }
    return &cfg, nil
}

// custom error type: 追加情報を持つ
type NotFoundError struct {
    Resource string
    ID       string
}
func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s %q not found", e.Resource, e.ID)
}

// errors.Is / errors.As で正しく判定
if errors.Is(err, ErrNotFound) { ... }

var nfe *NotFoundError
if errors.As(err, &nfe) {
    log.Printf("missing: %s/%s", nfe.Resource, nfe.ID)
}`,
    interviewPoints: [
      "fmt.Errorf の %w でエラーをラップ → errors.Is/As でアンラップ",
      'エラーには必ず操作コンテキストを付加する ("load user: decode: ..." の形式)',
      "sentinel error は pkg の公開 API として定義するのが適切",
      "panic は回復不能なプログラマーミスに限定。通常フローでは使わない",
    ],
  },

  "design-context": {
    id: "design-context",
    section: "design",
    title: "Context の正しい使い方",
    tag: "最重要",
    summary:
      "context は「いつキャンセルするか」を伝播させる仕組み。第一引数で渡す。struct に格納しない。Value はリクエストスコープのメタデータのみ。",
    why: "context を誤用するとキャンセルが伝播しない goroutine リーク、設計の混濁、テストの困難さが生まれる。",
    tradeoffs: [
      {
        title: "context.Value の使用",
        desc: "request-id などに使う。ビジネスロジックの引数として使うのは anti-pattern。",
      },
      {
        title: "WithTimeout vs WithDeadline",
        desc: "WithTimeout は相対時間、WithDeadline は絶対時間。外部 API は WithTimeout が自然。",
      },
    ],
    badCode: `// context を使わない (キャンセルできない)
func fetchData(url string) (*Data, error) {
    resp, err := http.Get(url)  // キャンセルできない!
    ...
}

// context.Value にビジネスデータを詰める (NG)
func processUser(ctx context.Context) error {
    userID := ctx.Value("userID").(string)  // unsafe
    db := ctx.Value("db").(*sql.DB)         // DB を context で渡すな
}

// context を struct に格納 (NG)
type Service struct {
    ctx context.Context  // フィールドにしない!
}`,
    goodCode: `// context は全 I/O 呼び出しに渡す (第一引数)
func fetchData(ctx context.Context, url string) (*Data, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil { return nil, err }
    resp, err := http.DefaultClient.Do(req)
    ...
}

// context.Value は型安全なキーで最小限に
type contextKey string
const requestIDKey contextKey = "requestID"

func WithRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, requestIDKey, id)
}

// timeout でリーク防止 (cancel は defer で必ず呼ぶ)
func callExternalAPI(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()  // 必須!
    return doRequest(ctx)
}

// キャンセルを確認
select {
case result := <-ch:
    return result, nil
case <-ctx.Done():
    return nil, ctx.Err()
}`,
    interviewPoints: [
      "context は第一引数で渡す（context.Context が最初）",
      "context.Value はリクエストスコープのメタデータのみ（DB は引数で渡す）",
      "WithTimeout/WithCancel の cancel は defer で必ず呼ぶ（リーク防止）",
      "context はフィールドに格納しない（関数の引数として渡す）",
    ],
  },

  "design-interface": {
    id: "design-interface",
    section: "design",
    title: "Interface を切るべき場面",
    tag: "設計",
    summary:
      "「使う側が必要なメソッドだけを宣言する」。実装より先に interface を作らない。テスタビリティと拡張点のために使う。",
    why: "過剰な interface 設計は indirection を増やして可読性を下げる。適切な interface はテストを容易にし依存を逆転させる。",
    tradeoffs: [
      {
        title: "interface の粒度",
        desc: "小さい interface（1-2メソッド）は再利用しやすい。大きな interface はモック化が大変。",
      },
      {
        title: "implicit interface",
        desc: "Go は暗黙的。後から interface を定義できる（レトロフィット可能）。",
      },
    ],
    badCode: `// 過剰設計: 実装前に全メソッドを定義 (Java 的)
type UserRepository interface {
    FindByID(id string) (*User, error)
    FindByEmail(email string) (*User, error)
    FindAll() ([]*User, error)
    Create(u *User) error
    Update(u *User) error
    Delete(id string) error
    Count() (int, error)
    // ← 使わないメソッドを全部モックするのが大変
}

// interface を返す (具体型を返すべき)
func NewUserRepo() UserRepository {
    return &MySQLUserRepo{}
}`,
    goodCode: `// 小さな interface: 使う側が必要なものだけ定義 (consumer side)
type UserFinder interface {
    FindByID(ctx context.Context, id string) (*User, error)
}

// 具体型を返す (interface は呼び出し側で使う)
func NewUserRepo(db *sql.DB) *UserRepo {
    return &UserRepo{db: db}
}

// テストでシンプルなモックを注入
type mockUserFinder struct{ user *User; err error }
func (m *mockUserFinder) FindByID(_ context.Context, _ string) (*User, error) {
    return m.user, m.err
}

// コンパイル時に interface 実装をチェック
var _ UserFinder = (*UserRepo)(nil)

// interface が有用な典型ケース
// 1. 外部 I/O (DB, HTTP) のモック化
// 2. 複数実装を差し替えたい場合
// 3. 循環依存を解消したい場合 (DIP)`,
    interviewPoints: [
      "interface は使う側（consumer）で定義する（Go 標準の思想）",
      "1-2 メソッドの小さな interface が compose しやすく理想的",
      "テスタビリティのために interface を切る（外部 I/O、時間、乱数など）",
      "var _ Interface = (*Impl)(nil) で実装をコンパイル時に検証",
    ],
  },

  "design-package": {
    id: "design-package",
    section: "design",
    title: "Package 設計の原則",
    tag: "設計",
    summary:
      "package は凝集度の単位。循環依存を避け、internal/ で隠蔽。utils/common は避ける。",
    why: "package 設計を誤ると循環依存・god package・utils の肥大化が起きる。適切な設計でコンパイル速度と可読性を維持。",
    tradeoffs: [
      {
        title: "flat vs layered",
        desc: "小さなプロジェクトは flat で十分。複雑になったら layered に分割。",
      },
      {
        title: "internal package",
        desc: "internal/ 以下は同一モジュール内からのみアクセス可。公開 API を制御するのに有効。",
      },
    ],
    badCode: `// アンチパターン: util/common/helper パッケージ
package util

func ParseDate(s string) time.Time    { ... }
func ValidateEmail(s string) bool     { ... }
func HashPassword(s string) string    { ... }
// ← 凝集度ゼロ。何が入っているか分からない

// 循環依存 (コンパイルエラー)
// package user → imports order → imports user ← 循環!

// package 名が実装詳細
package mysqlrepo   // ← DB 実装が漏れる`,
    goodCode: `// 役割・ドメインで分割
package user    // ユーザードメインモデル・ビジネスルール
package order   // 注文集約
package store   // DB 抽象化インターフェース
package mysql   // store interface の MySQL 実装

// 依存方向: handler → domain ← infrastructure
// domain は外部に依存しない!

// internal/ でモジュール外への公開を制限
// myapp/internal/validator/validator.go
package validator  // 外部モジュールからは import できない

// レイヤー構成例
// user/
//   user.go         ← User 型定義 (ドメインモデル)
//   service.go      ← UserService (ビジネスロジック)
//   store.go        ← UserStore interface

// 循環依存の解消: interface で依存を逆転させる`,
    interviewPoints: [
      "utils/common/helper パッケージは凝集度が低く成長すると管理不能になる",
      "循環依存は interface で依存を逆転させて解消する",
      "internal/ は外部からのアクセスをコンパイラが強制的に制限する",
      "package 名は単数形・短い・役割を表す名詞（userservice より user）",
    ],
  },

  // ── 並行処理 ──────────────────────────────────────────

  "concurrency-goroutine-channel": {
    id: "concurrency-goroutine-channel",
    section: "concurrency",
    title: "goroutine vs channel の使い分け",
    tag: "最重要",
    summary:
      'channel は「所有権の移転・同期・シグナリング」。状態の共有には sync。"通信して共有せよ"。',
    why: "goroutine と channel の誤用はデッドロック、リーク、データ競合の三大バグを生む。使い分けが並行処理の基礎。",
    tradeoffs: [
      {
        title: "buffered vs unbuffered",
        desc: "unbuffered は同期ポイント。buffered は非同期キュー。",
      },
      {
        title: "channel vs mutex",
        desc: "所有権移転 → channel。共有状態保護 → mutex。",
      },
    ],
    badCode: `// goroutine を leaky に起動 (結果を受け取れない)
func process(items []Item) {
    for _, item := range items {
        go processItem(item)  // エラーも結果も無視!
    }
    // goroutine の完了を待てない
}

// channel で複雑な状態管理 (mutex の方が適切)
type SafeMap struct {
    ops chan operation  // 複雑すぎる
}`,
    goodCode: `// WaitGroup + errChan で完了と結果を収集
func process(ctx context.Context, items []Item) error {
    var wg sync.WaitGroup
    errCh := make(chan error, len(items))

    for _, item := range items {
        item := item
        wg.Add(1)
        go func() {
            defer wg.Done()
            if err := processItem(ctx, item); err != nil {
                errCh <- err
            }
        }()
    }

    wg.Wait()
    close(errCh)

    var errs []error
    for err := range errCh { errs = append(errs, err) }
    return errors.Join(errs...)
}

// 共有状態には mutex (シンプルで明確)
type SafeCounter struct {
    mu sync.Mutex
    n  int
}
func (c *SafeCounter) Inc() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.n++
}

// channel はパイプライン・所有権移転に使う
func generate(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}`,
    interviewPoints: [
      "channel は所有権の移転とシグナリングに使う（状態共有には mutex）",
      "goroutine は必ず「いつ終わるか」を設計する（WaitGroup, done channel）",
      "buffered channel は backpressure の制御に使える",
      "select + ctx.Done() で goroutine のキャンセルをハンドリング",
    ],
  },

  "concurrency-worker-pool": {
    id: "concurrency-worker-pool",
    section: "concurrency",
    title: "Worker Pool パターン",
    tag: "実務頻出",
    summary:
      "固定数の worker goroutine でタスクを並列処理。unbounded goroutine spawn はメモリ枯渇を招く。",
    why: "unbounded goroutine spawn はメモリ枯渇とスケジューラ負荷を引き起こす。worker pool で並列度を制限することが実務では不可欠。",
    tradeoffs: [
      {
        title: "worker 数の決定",
        desc: "CPU bound: GOMAXPROCS。I/O bound: 10-100。ベンチマークで決定するのが最善。",
      },
      {
        title: "semaphore pattern",
        desc: "worker pool より軽量な代替。buffered channel を semaphore として使う。",
      },
    ],
    badCode: `// goroutine を無制限に起動 (OOM の危険)
func processAll(items []Item) {
    for _, item := range items {
        go process(item)  // 100万件 = 100万 goroutine!
    }
}`,
    goodCode: `// Worker Pool: 固定数の worker で処理
func workerPool(ctx context.Context, items []Item, n int) error {
    jobs    := make(chan Item, len(items))
    results := make(chan error, len(items))

    var wg sync.WaitGroup
    for range n {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for item := range jobs {
                results <- processItem(ctx, item)
            }
        }()
    }

    for _, item := range items { jobs <- item }
    close(jobs)

    go func() { wg.Wait(); close(results) }()

    var errs []error
    for err := range results {
        if err != nil { errs = append(errs, err) }
    }
    return errors.Join(errs...)
}

// Semaphore パターン (シンプルな代替)
sem := make(chan struct{}, 10)  // 同時実行数 10
for _, item := range items {
    item := item
    sem <- struct{}{}
    go func() {
        defer func() { <-sem }()
        process(item)
    }()
}

// errgroup (golang.org/x/sync) ならさらに簡潔
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10)
for _, item := range items {
    item := item
    g.Go(func() error { return processItem(ctx, item) })
}
return g.Wait()`,
    interviewPoints: [
      "goroutine 数を制限しないと I/O bound タスクでも OOM が起きる",
      "worker pool の channel バッファはジョブ数 or worker 数に設定",
      "semaphore パターン: buffered channel に空の struct を入れて並列度を制限",
      "errgroup パッケージ (golang.org/x/sync) を使うとエラー収集が簡単",
    ],
  },

  "concurrency-goroutine-leak": {
    id: "concurrency-goroutine-leak",
    section: "concurrency",
    title: "goroutine リーク検出・防止",
    tag: "実務頻出",
    summary:
      "goroutine はブロックされると永遠に終わらない。channel・select・context で必ず脱出経路を確保。",
    why: "goroutine リークはメモリを消費し続ける。長時間稼働サービスでは致命的。",
    tradeoffs: [],
    badCode: `// リーク 1: 誰も読まない channel への送信
func leak1() {
    ch := make(chan int)
    go func() {
        ch <- compute()  // 受信者なし → 永遠にブロック!
    }()
}

// リーク 2: context キャンセルを無視
func leak2(ctx context.Context) {
    go func() {
        for {
            doWork()  // ctx.Done() を見ない → 永遠に動く!
        }
    }()
}`,
    goodCode: `// 防止: 必ず脱出経路を作る
func noLeak(ctx context.Context) <-chan int {
    ch := make(chan int, 1)
    go func() {
        defer close(ch)
        select {
        case ch <- compute():
        case <-ctx.Done():
        }
    }()
    return ch
}

// 検出: goleak でテスト
func TestNoLeak(t *testing.T) {
    defer goleak.VerifyNone(t)
    doSomethingConcurrent()
}

// runtime で確認
fmt.Println(runtime.NumGoroutine())

// pprof エンドポイント
import _ "net/http/pprof"
go http.ListenAndServe(":6060", nil)
// curl "localhost:6060/debug/pprof/goroutine?debug=1"`,
    interviewPoints: [
      "goroutine リークは CPU プロファイルに出ないがメモリを消費し続ける",
      "goleak ライブラリでテストごとに goroutine リークを検出できる",
      "channel への送受信は必ず context キャンセルで脱出できる設計にする",
      "pprof の /debug/pprof/goroutine で本番の goroutine 数を確認できる",
    ],
  },

  // ── パフォーマンス ────────────────────────────────────

  "perf-benchmark": {
    id: "perf-benchmark",
    section: "performance",
    title: "go test -bench によるベンチマーク",
    tag: "計測",
    summary:
      "Benchmark 関数は b.N 回ループ。b.ResetTimer() で初期化コストを除外。-benchmem でアロケーション確認。",
    why: "「速い気がする」ではなく数値で意思決定する。ベンチマーク駆動の最適化がエンジニアリングの基本。",
    tradeoffs: [
      {
        title: "マイクロベンチマークの限界",
        desc: "現実のワークロードとは異なる場合がある。プロファイルと組み合わせて判断する。",
      },
    ],
    badCode: `// セットアップがループ内 (不正確)
func BenchmarkBad(b *testing.B) {
    for i := 0; i < b.N; i++ {
        data := generateLargeData()  // 毎回生成 → コスト混入
        _ = process(data)
    }
}`,
    goodCode: `// 正しいベンチマーク
func BenchmarkProcess(b *testing.B) {
    data := generateLargeData()
    b.ResetTimer()
    b.ReportAllocs()

    for i := 0; i < b.N; i++ {
        result := process(data)
        _ = result  // dead code elimination を防ぐ
    }
}

// サブベンチマークで比較
func BenchmarkCompare(b *testing.B) {
    for _, size := range []int{100, 1000, 10000} {
        b.Run(fmt.Sprintf("n=%d", size), func(b *testing.B) {
            data := make([]int, size)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                _ = sort.IntsAreSorted(data)
            }
        })
    }
}

// 実行: go test -bench=. -benchmem -count=5 ./...
// 比較: benchstat old.txt new.txt`,
    interviewPoints: [
      "b.N はフレームワークが自動調整する（直接指定しない）",
      "-benchmem で allocs/op と B/op を確認",
      "-count=5 + benchstat で統計的に有意な比較ができる",
      "結果は ns/op（ナノ秒/オペレーション）で出る",
    ],
  },

  "perf-pprof": {
    id: "perf-pprof",
    section: "performance",
    title: "pprof によるプロファイリング",
    tag: "計測",
    summary:
      "CPU / メモリ / goroutine のプロファイルを取得して可視化。ボトルネックを数値で特定してから最適化。",
    why: "感覚的な最適化は時間の無駄。pprof で実際のホットスポットを特定してから最適化する。",
    tradeoffs: [
      {
        title: "本番プロファイリング",
        desc: "net/http/pprof で本番でも取得可能。ただしレートリミットや認証を設ける。",
      },
    ],
    badCode: `// 根拠なく最適化
// "この処理が遅い気がする" → リファクタリング → 効果なし

// 実は I/O がボトルネックだったのに CPU 最適化していた`,
    goodCode: `// CPU / メモリプロファイルを取得
// go test -bench=. -cpuprofile=cpu.prof -memprofile=mem.prof

// 対話的に分析
// go tool pprof cpu.prof
// (pprof) top10      ← 上位 10 関数
// (pprof) list Func  ← ソースコード上の時間分布
// (pprof) web        ← SVG グラフ (要 graphviz)

// ブラウザで FlameGraph
// go tool pprof -http=:8080 cpu.prof

// HTTP エンドポイントで本番プロファイル取得
import _ "net/http/pprof"
go http.ListenAndServe(":6060", nil)

// 30秒間の CPU プロファイル
// go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

// GC トレース
// GODEBUG=gctrace=1 go run . 2>&1 | grep ^gc`,
    interviewPoints: [
      "最適化の前に必ずプロファイルを取る（測定なき最適化は hazard）",
      "CPU profile: サンプリングベース（100Hz）でホットスポットを特定",
      "heap profile: inuse_space（現在）vs alloc_space（累積）を区別する",
      "-http=:8080 でブラウザ上でフレームグラフを見られる",
    ],
  },

  "perf-memory": {
    id: "perf-memory",
    section: "performance",
    title: "メモリアロケーション削減と sync.Pool",
    tag: "最適化",
    summary:
      "アロケーション削減 = GC 負荷削減。escape analysis で stack/heap を把握。sync.Pool で再利用。",
    why: "高頻度アロケーションはレイテンシに影響する。アロケーション削減がパフォーマンスの核心。",
    tradeoffs: [
      {
        title: "sync.Pool の制限",
        desc: "GC で回収される可能性がある。キャッシュとして使う。",
      },
    ],
    badCode: `// 毎回アロケーション (string 連結)
func join(strs []string) string {
    result := ""
    for _, s := range strs {
        result += s  // O(n^2) アロケーション!
    }
    return result
}

// fmt.Sprintf で大量アロケーション
for i := 0; i < 1000000; i++ {
    key := fmt.Sprintf("key:%d", i)
}`,
    goodCode: `// strings.Builder でアロケーション削減
func join(strs []string) string {
    var b strings.Builder
    for _, s := range strs { b.WriteString(s) }
    return b.String()
}

// strconv で fmt.Sprintf を回避
key := "key:" + strconv.Itoa(i)

// sync.Pool で一時バッファを再利用
var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) },
}
func encode(v any) ([]byte, error) {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() { buf.Reset(); bufPool.Put(buf) }()
    if err := json.NewEncoder(buf).Encode(v); err != nil {
        return nil, err
    }
    result := make([]byte, buf.Len())
    copy(result, buf.Bytes())
    return result, nil
}

// escape analysis で確認
// go build -gcflags="-m" ./...
// "moved to heap" → アロケーション発生`,
    interviewPoints: [
      "go build -gcflags=-m で escape analysis の結果を確認できる",
      "strings.Builder で文字列連結のアロケーションを削減",
      "sync.Pool は GC サイクルを跨いで存続する保証はない",
      "-benchmem で allocs/op を確認 → 減らすことがゴール",
    ],
  },

  // ── テスト ────────────────────────────────────────────

  "test-table-driven": {
    id: "test-table-driven",
    section: "testing",
    title: "Table-Driven Tests",
    tag: "標準",
    summary:
      "テストケースをデータとして定義。新しいケース追加が1行で済む。t.Run でサブテスト実行。",
    why: "テストコードの DRY 原則。テストを「ドキュメント」として読める状態を維持する。",
    tradeoffs: [
      {
        title: "複雑なセットアップが必要なケース",
        desc: "setup/teardown が各テストで異なる場合は無理に table-driven にしなくてよい。",
      },
    ],
    badCode: `// 重複したテスト
func TestAdd(t *testing.T) {
    if got := Add(1, 2); got != 3 {
        t.Errorf("Add(1,2) = %d, want 3", got)
    }
    if got := Add(0, 0); got != 0 {
        t.Errorf("Add(0,0) = %d, want 0", got)
    }
    // ← ケースを追加するたびに 3 行増える
}`,
    goodCode: `func TestAdd(t *testing.T) {
    t.Parallel()

    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"positive", 1, 2, 3},
        {"zero", 0, 0, 0},
        {"negative", -1, 1, 0},
    }

    for _, tt := range tests {
        tt := tt
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            if got := Add(tt.a, tt.b); got != tt.want {
                t.Errorf("Add(%d, %d) = %d, want %d",
                    tt.a, tt.b, got, tt.want)
            }
        })
    }
}

// エラーケースを含むテーブル
tests := []struct {
    name    string
    input   string
    want    int
    wantErr bool
}{
    {"valid", "42", 42, false},
    {"invalid", "abc", 0, true},
    {"empty", "", 0, true},
}`,
    interviewPoints: [
      "table-driven test はテストケースをデータとして扱い、追加が容易",
      "t.Run でサブテストを作ると -run フラグで特定テストを実行できる",
      "t.Parallel() でテストを並列実行して速度を上げられる",
      "Go 1.22+ ではループ変数キャプチャ問題が修正された",
    ],
  },

  "test-mock": {
    id: "test-mock",
    section: "testing",
    title: "Interface を使ったモック設計",
    tag: "設計",
    summary:
      "外部 I/O は interface で抽象化。テストでは手書きのシンプルなモックを使う。",
    why: "DB・外部 API・時刻を interface で抽象化してユニットテストを高速・安定・再現可能に。",
    tradeoffs: [
      {
        title: "手書き vs 自動生成",
        desc: "手書きは小さな interface 向き。mockgen/moq は大きな interface に有効。",
      },
    ],
    badCode: `// DB を直接使うと単体テストが書けない
type UserService struct {
    db *sql.DB  // ← テスト時に本物の DB が必要
}`,
    goodCode: `// Interface で抽象化
type UserStore interface {
    GetUser(ctx context.Context, id string) (*User, error)
}

type UserService struct {
    store UserStore
}

// 手書きモック
type mockStore struct {
    users map[string]*User
    err   error
}
func (m *mockStore) GetUser(_ context.Context, id string) (*User, error) {
    if m.err != nil { return nil, m.err }
    u, ok := m.users[id]
    if !ok { return nil, ErrNotFound }
    return u, nil
}

func TestGetUser(t *testing.T) {
    store := &mockStore{
        users: map[string]*User{"1": {Name: "Alice"}},
    }
    svc := &UserService{store: store}
    u, err := svc.GetUser(context.Background(), "1")
    if err != nil { t.Fatal(err) }
    if u.Name != "Alice" { t.Errorf("got %s", u.Name) }
}

// 時刻のモック化
type Clock interface{ Now() time.Time }
type realClock struct{}
func (realClock) Now() time.Time { return time.Now() }`,
    interviewPoints: [
      "外部 I/O を interface で包んでテストから本番実装を切り離す",
      "手書きモックで十分な場合が多い",
      "time.Now() も interface で抽象化してテストを決定論的に",
      "httptest.NewServer で HTTP ハンドラをテスト",
    ],
  },

  // ── 実務アンチパターン ────────────────────────────────

  "anti-error-ignore": {
    id: "anti-error-ignore",
    section: "antipatterns",
    title: "エラーを握りつぶす",
    tag: "NG",
    summary:
      "_, _ = はほぼ常に NG。エラーは必ず処理するか、意図的無視はコメントで理由を明記。",
    why: "エラーを無視すると問題が表面化せずデバッグが困難になる。Go の設計思想への反逆。",
    tradeoffs: [],
    badCode: `// 最悪: エラーを無視
data, _ := os.ReadFile("config.json")
json.Unmarshal(data, &config)

// log して return を忘れる
if err != nil {
    log.Printf("error: %v", err)
    // ← return を忘れて処理が続く!
}`,
    goodCode: `// エラーは必ず処理する
data, err := os.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("read config: %w", err)
}

// 意図的に無視する場合はコメントで理由を明記
_ = cache.Delete(key)  // ベストエフォート削除

// file Close のエラーをハンドリング
func writeFile(path string, data []byte) (err error) {
    f, err := os.Create(path)
    if err != nil { return err }
    defer func() {
        if cerr := f.Close(); cerr != nil && err == nil {
            err = cerr
        }
    }()
    _, err = f.Write(data)
    return err
}`,
    interviewPoints: [
      "Go のエラー処理はエラーの追跡可能性を保証する",
      "io.Closer の Close エラーは書き込み操作後は無視しない",
      "意図的に無視する場合は _ = f() + コメント",
      "errcheck linter でエラーの無視を検出できる",
    ],
  },

  "anti-global-state": {
    id: "anti-global-state",
    section: "antipatterns",
    title: "グローバル状態の濫用",
    tag: "NG",
    summary:
      "グローバル変数はテスト困難・race condition の原因。DI で置き換える。",
    why: "グローバル状態はテストの独立性を壊し並行テストで race condition を生む。",
    tradeoffs: [],
    badCode: `// グローバル DB 接続
var db *sql.DB

func init() {
    var err error
    db, err = sql.Open("postgres", os.Getenv("DB_URL"))
    if err != nil { log.Fatal(err) }
}

func GetUser(id string) (*User, error) {
    return queryUser(db, id)  // テストで差し替え不可
}`,
    goodCode: `// DI で依存を明示
type UserRepo struct {
    db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
    return &UserRepo{db: db}
}

// main.go で組み立て (Composition Root)
func main() {
    db, err := sql.Open("postgres", cfg.DBURL)
    if err != nil { log.Fatal(err) }
    defer db.Close()

    repo    := NewUserRepo(db)
    svc     := NewUserService(repo)
    handler := NewHandler(svc)
    log.Fatal(http.ListenAndServe(":8080", handler))
}

// テストでは独立した DB を注入
func TestGetUser(t *testing.T) {
    db := openTestDB(t)
    repo := NewUserRepo(db)
    ...
}`,
    interviewPoints: [
      "グローバル変数はテストの並列実行を妨げる",
      "init() は import 時に実行される。副作用のある init() は避ける",
      "DI でグローバル状態をなくしテスタビリティを上げる",
      "wire / dig などの DI フレームワークは大規模プロジェクトで有効",
    ],
  },

  "anti-panic": {
    id: "anti-panic",
    section: "antipatterns",
    title: "panic / recover の誤用",
    tag: "NG",
    summary:
      "panic はプログラマーエラー。通常フロー制御には使わない。recover は HTTP handler などの境界で使う。",
    why: "panic で通常エラーを処理すると、recover を忘れた goroutine がプログラム全体をクラッシュさせる。",
    tradeoffs: [],
    badCode: `// panic をエラー代わりに使う (NG)
func parseConfig(data []byte) Config {
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        panic(err)  // ← error を返すべき!
    }
    return cfg
}

// goroutine 内の panic = プロセスクラッシュ
go func() {
    panic("oops")  // recover なし → 全体が落ちる
}()`,
    goodCode: `// 通常エラーは error で返す
func parseConfig(data []byte) (Config, error) {
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return Config{}, fmt.Errorf("parse config: %w", err)
    }
    return cfg, nil
}

// panic が適切: 初期化の失敗 (続行不可能)
var validPattern = regexp.MustCompile("^[a-z]+$")

// HTTP ハンドラで recover (境界での使用)
func safeHandler(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if rec := recover(); rec != nil {
                log.Printf("panic: %v\\n%s", rec, debug.Stack())
                http.Error(w, "internal error", 500)
            }
        }()
        next.ServeHTTP(w, r)
    })
}`,
    interviewPoints: [
      "panic はプログラマーミスを表す（index out of range 等）",
      "ライブラリコードでは panic を使わない",
      "Must* パターンは初期化時のみ使う",
      "recover は defer 内でのみ有効。goroutine を跨げない",
    ],
  },

  // ── 面接対策 ──────────────────────────────────────────

  "interview-goroutine": {
    id: "interview-goroutine",
    section: "interview",
    title: "goroutine と OS スレッドの違い",
    tag: "頻出",
    summary:
      "goroutine は Go ランタイムが管理する軽量スレッド。2KB から始まり数十万を並行実行可能。M:N スケジューラ。",
    why: "Go の並行処理の基礎を問う最頻出問題。M:N モデルを理解しているかが評価のポイント。",
    tradeoffs: [],
    badCode: `// NG: 「goroutine は軽量スレッドです」だけでは不十分
// 面接官が聞きたいのは "なぜ軽量か" "どう管理されるか"`,
    goodCode: `// ─ スタックサイズ ─
// OS thread:  固定 1-8MB（カーネル管理）
// goroutine:  2KB から始まり必要に応じて伸長

// ─ スケジューリング ─
// OS thread:  カーネルがプリエンプティブ（コンテキストスイッチ高コスト）
// goroutine:  Go ランタイムの M:N スケジューラ
//             G(goroutine) : M(OS thread) : P(processor) の3層構造

// ─ 数の違い ─
// OS thread:  数千〜数万
// goroutine:  数十万〜数百万

// ─ 面接での答え方 ─
// "goroutine は Go ランタイムが管理する軽量な並行実行ユニットです。
//  OS スレッドより起動コストが低く（2KB vs 1-8MB）、
//  G-M-P の M:N スケジューラで効率的にスケジューリングされます。"`,
    interviewPoints: [
      "初期スタック 2KB（OS thread は 1-8MB）→ 起動コストが安い",
      "M:N スケジューラ: 多数の G を少数の M にマップ",
      "GOMAXPROCS: 同時実行できる P の数（デフォルト CPU コア数）",
      '"共有して通信するな、通信して共有せよ" が Go の並行処理の哲学',
    ],
  },

  "interview-gc": {
    id: "interview-gc",
    section: "interview",
    title: "Go の GC の特徴とチューニング",
    tag: "頻出",
    summary:
      "concurrent mark-and-sweep GC。STW は最小化。GOGC と GOMEMLIMIT でチューニング。",
    why: "GC 特性を知ることでパフォーマンスチューニングの判断ができる。",
    tradeoffs: [],
    badCode: `// GC を意識しない設計
for range requests {
    buf := make([]byte, 4096)  // 毎回アロケーション → GC 負荷
    process(buf)
}`,
    goodCode: `// ─ GC の特徴 ─
// アルゴリズム: tri-color concurrent mark-and-sweep
// STW: GC サイクル開始・終了時のみ (目標 < 1ms)

// ─ GC 発生タイミング ─
// ヒープが前回 GC 後の (1 + GOGC/100) 倍になったとき

// ─ チューニング ─
// GOGC=100 (default): 前回 GC 後の 2 倍でトリガー
// GOGC=200:           GC 頻度を下げる (メモリ使用量増)
// GOMEMLIMIT=512MiB:  メモリ上限を設定 (Go 1.19+)
// GOGC=off + GOMEMLIMIT が現代的なチューニング手法

// ─ GC ログ確認 ─
// GODEBUG=gctrace=1 go run main.go
// gc 1 @0.023s 4%: 0.009+1.1+0.028 ms clock

// ─ 実務アドバイス ─
// 1. sync.Pool で一時オブジェクトを再利用
// 2. -benchmem で allocs/op を確認
// 3. pprof heap でアロケーション箇所を特定`,
    interviewPoints: [
      "Go の GC は concurrent で STW は < 1ms が目標",
      "GOGC: 前回 GC 後のヒープサイズの何%増でGCするか（デフォルト100=2倍）",
      "GOMEMLIMIT（Go 1.19+）でメモリ上限設定するとチューニングが簡単に",
      "GC への最大の貢献はアロケーション削減",
    ],
  },

  "interview-interface": {
    id: "interview-interface",
    section: "interview",
    title: "Go の Interface 設計思想",
    tag: "頻出",
    summary:
      "暗黙的な実装（duck typing）。小さな interface が compose しやすい。Accept interfaces, return structs。",
    why: "Go の interface は他言語と異なる哲学を持つ。説明できることが Go エンジニアの証。",
    tradeoffs: [],
    badCode: `// Java 的設計 (Go ではアンチパターン)
type IUserService interface {
    CreateUser(...) error
    UpdateUser(...) error
    DeleteUser(...) error
    GetUser(...) (*User, error)
    ListUsers(...) ([]*User, error)
}`,
    goodCode: `// Go の interface 設計思想

// 1. Implicit implementation
//    "implements" キーワードなし。メソッドが合えば実装

// 2. 小さな interface
type Reader interface{ Read(p []byte) (n int, err error) }
type Writer interface{ Write(p []byte) (n int, err error) }
type ReadWriter interface{ Reader; Writer }  // 合成

// 3. Accept interfaces, return structs
func NewWriter(w io.Writer) *JSONWriter { ... }

// 4. Consumer-side definition
type UserFinder interface{
    FindByID(ctx context.Context, id string) (*User, error)
}

// ─ 面接での答え方 ─
// "Go の interface は暗黙的です。implements を書かず、
//  メソッドが一致すれば自動的に実装されます。
//  小さな interface を組み合わせる設計が推奨されており、
//  io.Reader や io.Writer がその代表例です。"`,
    interviewPoints: [
      "implicit: struct が interface を明示的に宣言する必要がない",
      "Accept interfaces, return structs が Go のイディオム",
      "小さな interface（1-2メソッド）が標準",
      "Go 1.18 のジェネリクスで any 型の多用を減らせるようになった",
    ],
  },

  // ── 要点まとめ ────────────────────────────────────────

  "summary-idiomatic": {
    id: "summary-idiomatic",
    section: "summary",
    title: "Goらしいコードとは何か",
    tag: "まとめ",
    summary:
      "シンプルさ・明示性・合成可能性。マジックを避け、エラーを明示し、小さな部品を組み合わせる。",
    why: "Go の設計哲学を体現したコードはチーム開発での可読性と保守性を高める。",
    tradeoffs: [],
    badCode: `// Goらしくないコード
func MagicProcess(v interface{}) interface{} {
    if err := validate(v); err != nil {
        panic(err)  // panic 乱用
    }
    result, _ := transform(v)  // エラー無視
    return result
}`,
    goodCode: `// Goらしいコード: シンプルで明示的

// 1. エラーは戻り値で明示
func Process(input string) (Output, error) { ... }

// 2. 小さな interface で compose
type Validator   interface{ Validate() error }
type Transformer interface{ Transform() (Result, error) }

// 3. 明示的な依存注入
func NewService(repo UserRepo, clock Clock) *Service {
    return &Service{repo: repo, clock: clock}
}

// ─ Effective Go の原則 ─
// Clear is better than clever
// Error handling is first class
// Interfaces are implicit
// Composition over inheritance

// ─ 実務チェックリスト ─
// □ エラーを握りつぶしていないか
// □ goroutine に終了条件があるか
// □ context を第一引数で渡しているか
// □ interface は使う側で定義しているか
// □ グローバル状態を使っていないか`,
    interviewPoints: [
      "「Goらしい」= 明示的・シンプル・合成可能",
      "マジック（暗黙的な動作）を避け、明示的に書く",
      "エラーは戻り値で返し、無視しない",
      "小さな interface と struct の合成でシステムを組み立てる",
    ],
  },

  "summary-design-decisions": {
    id: "summary-design-decisions",
    section: "summary",
    title: "実務で使う設計判断フローチャート",
    tag: "まとめ",
    summary:
      "interface / channel vs mutex / error の種類など、実務で判断に迷うポイントのクイックリファレンス。",
    why: "設計判断は都度考えるより判断基準を持っていることが重要。",
    tradeoffs: [],
    badCode: `// よくある判断ミス
// - テストのためだけに interface を乱発
// - 全てを channel で解決しようとする
// - sentinel と wrapping の使い分けができない`,
    goodCode: `// ─ interface を切るべきか? ─
// YES: 外部 I/O (DB, HTTP, FS) → モック化
// YES: 複数実装を差し替えたい → DI
// YES: 循環依存を解消したい → DIP
// NO:  実装が1つしかない (YAGNI)

// ─ channel か mutex か? ─
// channel: 所有権の移転 / パイプライン / シグナリング
// mutex:   共有状態の保護 / カウンタ / キャッシュ

// ─ error の種類は? ─
// sentinel:    既知の終端 (io.EOF, ErrNotFound)
// wrapping:    コンテキスト付加 (fmt.Errorf %w)
// custom type: 追加情報 (errors.As で取得)
// panic:       プログラマーミス・初期化失敗のみ

// ─ value か pointer receiver か? ─
// pointer: mutate / 大きな struct / Mutex / nil
// value:   immutable / 小さな struct / map・slice・chan

// ─ buffered か unbuffered か? ─
// unbuffered: 送受信を同期させたい (ランデブー)
// buffered:   非同期 / backpressure 制御`,
    interviewPoints: [
      "設計判断は「なぜそうしたか」を説明できることが重要",
      "interface は使う側で定義し、実装が1つなら不要 (YAGNI)",
      "channel は所有権の移転、mutex は状態の保護",
      "error の種類（sentinel / wrapping / custom）を使い分ける",
    ],
  },
};

// ═══════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════

export const SECTIONS: Section[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: "⌂",
    description: "進捗と今日のおすすめ",
    topicIds: [],
  },
  {
    id: "syntax",
    title: "基本文法",
    icon: "{}",
    description: "落とし穴とイディオム",
    topicIds: [
      "syntax-slice",
      "syntax-interface-nil",
      "syntax-defer",
      "syntax-receiver",
    ],
  },
  {
    id: "design",
    title: "設計",
    icon: "◈",
    description: "error / context / interface / package",
    topicIds: [
      "design-error",
      "design-context",
      "design-interface",
      "design-package",
    ],
  },
  {
    id: "concurrency",
    title: "並行処理",
    icon: "⇌",
    description: "goroutine / channel / worker pool",
    topicIds: [
      "concurrency-goroutine-channel",
      "concurrency-worker-pool",
      "concurrency-goroutine-leak",
    ],
  },
  {
    id: "performance",
    title: "パフォーマンス",
    icon: "⚡",
    description: "benchmark / pprof / memory",
    topicIds: ["perf-benchmark", "perf-pprof", "perf-memory"],
  },
  {
    id: "testing",
    title: "テスト",
    icon: "✓",
    description: "table-driven / mock / parallel",
    topicIds: ["test-table-driven", "test-mock"],
  },
  {
    id: "antipatterns",
    title: "アンチパターン",
    icon: "✗",
    description: "避けるべき書き方と正しい代替",
    topicIds: ["anti-error-ignore", "anti-global-state", "anti-panic"],
  },
  {
    id: "interview",
    title: "面接対策",
    icon: "◎",
    description: "技術面接で話せるようにする",
    topicIds: ["interview-goroutine", "interview-gc", "interview-interface"],
  },
  {
    id: "summary",
    title: "要点まとめ",
    icon: "≡",
    description: "実務で説明するための要約",
    topicIds: ["summary-idiomatic", "summary-design-decisions"],
  },
];

export const TOTAL_TOPICS = Object.keys(TOPICS).length;

export const RECOMMENDED: Recommendation[] = [
  { id: "design-error", reason: "実務で最頻出。エラー設計を見直そう" },
  { id: "concurrency-worker-pool", reason: "並行処理の基本パターン" },
  { id: "design-interface", reason: "Goらしい設計の核心" },
  { id: "perf-pprof", reason: "性能改善の第一歩はプロファイリング" },
  { id: "test-table-driven", reason: "テストの品質を上げる基本技術" },
  {
    id: "design-context",
    reason: "context の誤用は goroutine リークを生む",
  },
  {
    id: "concurrency-goroutine-leak",
    reason: "長時間稼働サービスで必須の知識",
  },
  {
    id: "summary-design-decisions",
    reason: "設計判断を即答できるようにする",
  },
];

// ═══════════════════════════════════════════════════════════
// TAG → DaisyUI badge variant
// ═══════════════════════════════════════════════════════════

export const TAG_BADGE: Record<string, string> = {
  最重要: "badge-error",
  実務頻出: "badge-warning",
  必須: "badge-warning",
  ハマりポイント: "badge-warning",
  設計: "badge-info",
  イディオム: "badge-accent",
  頻出: "badge-secondary",
  計測: "badge-success",
  最適化: "badge-success",
  標準: "badge-ghost",
  NG: "badge-error",
  まとめ: "badge-primary",
};
