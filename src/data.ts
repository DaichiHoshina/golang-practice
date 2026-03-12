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
      {
        point:
          "slice は値型だが内部でポインタを持つ（参照セマンティクス的に動く）",
        detail:
          "slice のヘッダは (pointer, length, capacity) の3フィールド構造体。関数に渡すとヘッダはコピーされるが、pointer が指す backing array は共有される。つまり要素の変更は呼び出し元にも反映されるが、append で容量を超えると新しい配列が確保され、共有が切れる。",
      },
      {
        point:
          "append は cap を超えると新しい配列を確保し、元の配列とは別物になる",
        detail:
          "Go 1.18 以降、成長戦略は cap < 256 なら 2倍、それ以上なら約 1.25倍 + 192 で緩やかに増える。この再割り当ての瞬間に古い slice との共有が切れるため、他の goroutine が古い参照を持っていると不整合が起きうる。",
      },
      {
        point:
          "goroutine 間で slice を共有する場合は copy するか channel 経由で渡す",
        detail:
          "Go の race detector（go test -race）で検出可能。channel で所有権を移転するか、sync.Mutex で保護するか、copy() で独立させる。実務では channel による所有権移転が最もバグが少ない。",
      },
      {
        point:
          "nil slice と empty slice は len==0 で同じだが json.Marshal の結果が違う（null vs []）",
        detail:
          "var s []int（nil slice）を json.Marshal すると null になる。s := []int{}（empty slice）は [] になる。API レスポンスで空配列を返したいなら empty slice を使う。また、nil slice に対する append は問題なく動くので、初期化せず使い始めても安全。",
      },
    ],
    quizzes: [
      {
        code: "// slice の安全なコピー\ns1 := []int{1, 2, 3}\ns2 := ____([]int, ____(s1))\n____(s2, s1)",
        blanks: ["make", "len", "copy"],
        explanation:
          "make で同じ長さの新しい slice を作り、copy で要素をコピーする。これにより s1 と s2 は独立した backing array を持ち、一方の変更が他方に影響しない。",
      },
      {
        code: "// capacity を事前確保して realloc を防ぐ\nresult := ____([]Item, ____, len(input))\nfor _, v := range input {\n    result = ____(result, process(v))\n}",
        blanks: ["make", "0", "append"],
        explanation:
          "make([]T, 0, n) で長さ0・容量nの slice を作る。append しても容量内なら再割り当てが発生しないためパフォーマンスが良い。",
      },
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
      {
        point: "interface は (動的型, 動的値) のペアとして実装されている",
        detail:
          "内部的に interface は (itab, data) の2ワード構造。itab には型情報とメソッドテーブルが入る。空の interface{} (any) は (type, data) のペア。この構造を理解すると nil トラップの原因が明確になる。",
      },
      {
        point:
          "nil interface は型も値も nil だが、nil ポインタを持つ interface は型情報がある",
        detail:
          "var err error = (*MyError)(nil) とすると、err の型情報は *MyError、値は nil。err != nil は true になる。回避策: 関数内で具体型の nil を error interface に代入せず、直接 return nil とする。",
      },
      {
        point: "error を返す関数では具体型変数を経由して return しない",
        detail:
          "var err *MyError; if condition { err = &MyError{...} }; return err ← これが罠。代わりに if condition { return &MyError{...} }; return nil と書く。具体型変数を経由すると型情報が interface に残り、nil 判定が狂う。",
      },
      {
        point:
          "errors.Is / errors.As を使うとラップされたエラーの型チェックができる",
        detail:
          'errors.Is は値の一致（sentinel error 用）、errors.As は型の一致（カスタムエラー型用）。どちらもラップチェーンを再帰的に辿る。Go 1.13 以降の標準。fmt.Errorf("%w", err) でラップしたエラーも正しく判定される。',
      },
    ],
    quizzes: [
      {
        code: '// interface の nil トラップを避ける\nfunc getError(flag bool) error {\n    if flag {\n        return &MyError{"oops"}\n    }\n    return ____  // untyped nil を返す\n}',
        blanks: ["nil"],
        explanation:
          "具体型の変数を経由して return すると、interface に型情報が残り non-nil になる。直接 return nil とすれば untyped nil が返り、err != nil は false になる。",
      },
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
      {
        point: "defer の引数は登録時に評価される（クロージャ経由なら回避可能）",
        detail:
          "defer fmt.Println(x) の x は defer 文を通過した時点の値が使われる。関数終了時の値を使いたい場合は defer func() { fmt.Println(x) }() とクロージャにする。ベンチマーク計測の defer で time.Since(start) を使うのが典型例。",
      },
      {
        point: "複数 defer は LIFO（後入れ先出し）順で実行される",
        detail:
          "ファイル A を開く → ファイル B を開く の場合、defer B.Close() → defer A.Close() の順で実行される。リソース確保と解放の対称性が自然に保たれる設計。",
      },
      {
        point:
          "名前付き返り値と defer の組み合わせでトランザクション制御が書ける",
        detail:
          "func doTx(db *sql.DB) (err error) { tx, _ := db.Begin(); defer func() { if err != nil { tx.Rollback() } else { tx.Commit() } }() ... } のパターン。defer 内で名前付き返り値 err を参照・変更できる。",
      },
      {
        point: "panic が起きても defer は実行される（recover はここで使う）",
        detail:
          "recover() は defer 内でのみ有効。HTTP サーバーのミドルウェアで panic を catch してログに残す用途が典型。ただし recover で panic を握りつぶすのは危険。本当に回復可能な場合のみ使い、それ以外は再 panic するか error として伝播する。",
      },
    ],
    quizzes: [
      {
        code: "// defer で最終値を使うにはクロージャを使う\nfunc measure() {\n    start := time.Now()\n    ____ ____() {\n        fmt.Println(time.Since(start))\n    }____\n    doWork()\n}",
        blanks: ["defer", "func", "()"],
        explanation:
          "defer func() { ... }() のクロージャ形式にすると、関数終了時の変数値を参照できる。defer fmt.Println(time.Since(start)) だと start は登録時の値になってしまう。",
      },
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
      {
        point: "pointer receiver は mutation の意図を明示する",
        detail:
          "func (s *Server) SetPort(p int) は「Server を変更する」という意図が明確。func (s Server) Port() int は「読み取りのみ」。この規約に従うとコードレビューで変更意図が一目で分かる。",
      },
      {
        point:
          "同一型で value/pointer を混在させない（interface 実装が複雑になる）",
        detail:
          "T に value receiver メソッドがあると、*T でも呼べる。しかし *T に pointer receiver メソッドがあると、T では呼べない。混在させると interface の実装が T なのか *T なのか混乱する。",
      },
      {
        point:
          "sync.Mutex を含む構造体は必ず pointer receiver（コピーするとロックが無効）",
        detail:
          "go vet が Mutex のコピーを検出してくれる。sync.Mutex はコピーすると独立したロックになるため、元の構造体のロック制御が効かなくなる。同様に sync.WaitGroup もコピー禁止。",
      },
      {
        point:
          "map, slice, chan はそれ自体がポインタ的なので value receiver でも OK",
        detail:
          "map は内部的にハッシュテーブルへのポインタ、slice は backing array へのポインタを持つ。そのため value receiver でも元のデータを変更できる。ただしフィールドに map/slice を持つ struct 全体をコピーしたい場合は deep copy が必要。",
      },
    ],
    quizzes: [
      {
        code: "// コンパイル時に interface 実装を検証\ntype Writer interface {\n    Write(data []byte) error\n}\n\ntype FileWriter struct{ path string }\nfunc (fw ____) Write(data []byte) error { ... }\n\n// コンパイル時チェック\nvar ____ Writer = (____)(nil)",
        blanks: ["*FileWriter", "_", "*FileWriter"],
        explanation:
          "var _ Writer = (*FileWriter)(nil) で FileWriter が Writer を満たすことをコンパイル時に検証。pointer receiver を使う場合は *FileWriter が interface を実装する。",
      },
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
      {
        point: "fmt.Errorf の %w でエラーをラップ → errors.Is/As でアンラップ",
        detail:
          "%w は Go 1.13 で導入。%v だとラップされず errors.Is/As で辿れない。Go 1.20 以降は errors.Join で複数エラーを結合でき、どれか1つでも errors.Is で判定できる。",
      },
      {
        point:
          'エラーには必ず操作コンテキストを付加する ("load user: decode: ..." の形式)',
        detail:
          'return fmt.Errorf("loadUser %s: %w", id, err) のように「何をしていたか」を付加する。エラーチェーンを辿れば根本原因まで到達でき、ログだけで障害原因を特定できる。',
      },
      {
        point: "sentinel error は pkg の公開 API として定義するのが適切",
        detail:
          'var ErrNotFound = errors.New("not found") をパッケージレベルで公開し、利用者は errors.Is(err, pkg.ErrNotFound) で判定する。io.EOF、sql.ErrNoRows が標準ライブラリの例。',
      },
      {
        point:
          "panic は回復不能なプログラマーミスに限定。通常フローでは使わない",
        detail:
          "panic の適切な使用例: nil ポインタアクセス、配列の範囲外アクセス、不可能な状態（switch の default に到達した場合）。HTTP ハンドラやビジネスロジックでは error を返す。ライブラリが panic するのは API の信頼性を損なう。",
      },
    ],
    quizzes: [
      {
        code: '// エラーをラップしてコンテキストを付加\nfunc loadUser(id string) (*User, error) {\n    data, err := db.Get(id)\n    if err != nil {\n        return nil, fmt.____(\n            "loadUser %s: ____", id, err)\n    }\n    return parseUser(data)\n}',
        blanks: ["Errorf", "%w"],
        explanation:
          "fmt.Errorf + %w でエラーをラップすると、元のエラーチェーンが保持される。errors.Is / errors.As でラップされたエラーを辿れる。%v だとチェーンが切れる。",
      },
      {
        code: '// sentinel error の定義と判定\nvar ErrNotFound = ____("not found")\n\n// 呼び出し側\n_, err := findItem("123")\nif ____.____(err, ____) {\n    // 404 を返す\n}',
        blanks: ["errors.New", "errors", "Is", "ErrNotFound"],
        explanation:
          "sentinel error は errors.New でパッケージレベルに定義。判定は errors.Is(err, ErrNotFound) で行う。ラップされていても正しく判定される。",
      },
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
      {
        point: "context は第一引数で渡す（context.Context が最初）",
        detail:
          "Go の慣習として func DoSomething(ctx context.Context, ...) の形式。標準ライブラリも database/sql、net/http がこの規約に従っている。IDE の補完やコードレビューでの視認性が高まる。",
      },
      {
        point:
          "context.Value はリクエストスコープのメタデータのみ（DB は引数で渡す）",
        detail:
          "request-id、trace-id、認証情報（JWT claims）など、リクエストに紐づくメタデータに限定。DB 接続やロガーは DI で渡す。context.Value は型安全でなく、存在チェックも必要なため、乱用するとデバッグ困難になる。",
      },
      {
        point:
          "WithTimeout/WithCancel の cancel は defer で必ず呼ぶ（リーク防止）",
        detail:
          "cancel() を呼ばないと、context の内部 goroutine がリークする。たとえ timeout で自動キャンセルされる場合でも、defer cancel() を書くのが正しい。go vet が未使用の cancel を警告する。",
      },
      {
        point: "context はフィールドに格納しない（関数の引数として渡す）",
        detail:
          "context.Context をフィールドに持つと、struct のライフサイクルとリクエストのライフサイクルが不一致になる。struct は長寿命、context は短寿命（1リクエスト）。メソッド呼び出し時に引数で渡すことでスコープが明確になる。Go の公式ブログでも明記されている。",
      },
    ],
    quizzes: [
      {
        code: '// context でタイムアウトを設定\nfunc callAPI(ctx context.Context) error {\n    ctx, cancel := context.____(ctx, 5*time.Second)\n    ____ ____()\n\n    req, _ := http.NewRequestWithContext(\n        ____, "GET", url, nil)\n    ...  \n}',
        blanks: ["WithTimeout", "defer", "cancel", "ctx"],
        explanation:
          "WithTimeout で期限付き context を作り、defer cancel() で必ずリソースを解放する。NewRequestWithContext に ctx を渡すことでタイムアウト時にリクエストが自動キャンセルされる。",
      },
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
      {
        point: "interface は使う側（consumer）で定義する（Go 標準の思想）",
        detail:
          "Java と逆の思想。実装側が「自分は何者か」を宣言するのではなく、利用側が「自分が必要なもの」を宣言する。これにより、パッケージ間の依存が最小化される。io.Reader が好例で、os.File も bytes.Buffer も暗黙的に満たす。",
      },
      {
        point: "1-2 メソッドの小さな interface が compose しやすく理想的",
        detail:
          "io.Reader（Read のみ）、io.Writer（Write のみ）、io.ReadWriter（Reader + Writer の合成）。Go 標準ライブラリの interface はほぼ 1-2 メソッド。大きな interface はテスト時のモック作成が大変で、ISP（Interface Segregation Principle）に反する。",
      },
      {
        point:
          "テスタビリティのために interface を切る（外部 I/O、時間、乱数など）",
        detail:
          "DB アクセス、HTTP クライアント、time.Now()、rand.Intn() など、テストで制御したい依存は interface にする。type Clock interface { Now() time.Time } のように定義し、テストでは固定値を返す mock を注入する。",
      },
      {
        point: "var _ Interface = (*Impl)(nil) で実装をコンパイル時に検証",
        detail:
          "この1行をパッケージに書くと、Impl が Interface を満たさない場合にコンパイルエラーになる。runtime ではなく compile-time に検証でき、CI で確実に検出できる。Go ではダックタイピングのため、この明示的なチェックが推奨される。",
      },
    ],
    quizzes: [
      {
        code: "// consumer 側で interface を定義\ntype UserFinder ____ {\n    FindByID(ctx context.Context, id string) (*User, error)\n}\n\n// 具体型を返す（interface ではなく）\nfunc NewUserRepo(db *sql.DB) ____ {\n    return ____\n}",
        blanks: ["interface", "*UserRepo", "&UserRepo{db: db}"],
        explanation:
          '"Accept interfaces, return structs"。interface は使う側が定義し、関数は具体型を返す。こうすることで依存が最小化され、テスト時にモックを差し替えやすくなる。',
      },
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
      {
        point:
          "utils/common/helper パッケージは凝集度が低く成長すると管理不能になる",
        detail:
          "最初は便利だが、無関係な関数が集まり、依存が全方向に広がる。代わりにドメインで分ける: validation は各ドメインパッケージ内に、日時操作は timeutil（具体的な責務名）に。",
      },
      {
        point: "循環依存は interface で依存を逆転させて解消する",
        detail:
          "package A → package B → package A は Go ではコンパイルエラー。解決法: A が interface を定義し、B がそれを実装する。A は B を import せず、interface 経由で呼び出す（DIP: 依存性逆転の原則）。",
      },
      {
        point: "internal/ は外部からのアクセスをコンパイラが強制的に制限する",
        detail:
          "myapp/internal/auth は myapp 配下からのみ import 可能。外部モジュールが import するとコンパイルエラー。公開 API の範囲を制御するのに使う。Go modules のアクセス制御で唯一のコンパイラ強制手段。",
      },
      {
        point:
          "package 名は単数形・短い・役割を表す名詞（userservice より user）",
        detail:
          "Go の標準ライブラリの命名規約に従う: fmt, net, http, os, io, sync, context。user パッケージ内の型は user.User, user.Service のように package名.型名 で使われるため、userservice.Service は冗長。util, common, base, shared は避ける。",
      },
    ],
    quizzes: [
      {
        code: "// 循環依存を interface で解消する（DIP）\n// package user （domain層）\ntype UserStore ____ {\n    Save(ctx context.Context, u *User) error\n}\n\n// package mysql （infrastructure層）\nfunc (r *Repo) ____(ctx context.Context,\n    u *user.User) error {\n    ...\n}",
        blanks: ["interface", "Save"],
        explanation:
          "domain 層が interface を定義し、infrastructure 層がそれを実装する。domain → infrastructure の依存がなくなり、循環依存が解消される。",
      },
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
      {
        point:
          "channel は所有権の移転とシグナリングに使う（状態共有には mutex）",
        detail:
          "「データの所有権を渡す」場合は channel、「データを複数 goroutine が読み書きする」場合は mutex。例: ワーカーにジョブを渡す → channel。共有カウンターを更新 → mutex。判断基準は「送った後に送り手はもう触らないか？」。",
      },
      {
        point:
          "goroutine は必ず「いつ終わるか」を設計する（WaitGroup, done channel）",
        detail:
          "起動した goroutine が終了する条件を明確にする: (1) 処理完了、(2) context キャンセル、(3) done channel の close。「fire-and-forget」パターンは goroutine リークの主原因。errgroup.Group が起動・完了・エラー収集をまとめて管理できる。",
      },
      {
        point: "buffered channel は backpressure の制御に使える",
        detail:
          "ch := make(chan Job, 100) とすると、100個のジョブまでバッファリング。それ以上は送信側がブロックされる（backpressure）。unbuffered channel（make(chan Job)）は送受信が同期するため、プロデューサーとコンシューマーが1対1で動く。",
      },
      {
        point: "select + ctx.Done() で goroutine のキャンセルをハンドリング",
        detail:
          "select { case v := <-ch: ... case <-ctx.Done(): return ctx.Err() } のパターンで、context のキャンセルを即座に検知して goroutine を終了させる。タイムアウト・ユーザーキャンセル・親 goroutine の終了を統一的に扱える。",
      },
    ],
    quizzes: [
      {
        code: "// channel + select でキャンセル対応\nfunc worker(ctx context.Context,\n    jobs <-chan Job) error {\n    for {\n        ____ {\n        case job := ____:\n            if err := process(job); err != nil {\n                return err\n            }\n        case ____:\n            return ctx.Err()\n        }\n    }\n}",
        blanks: ["select", "<-jobs", "<-ctx.Done()"],
        explanation:
          "select で jobs channel からの受信と ctx.Done() を同時に待つ。context がキャンセルされると goroutine が安全に終了する。",
      },
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
      {
        point: "goroutine 数を制限しないと I/O bound タスクでも OOM が起きる",
        detail:
          "10万リクエストを並列処理するために10万 goroutine を起動すると、各 goroutine のスタック（最低 2KB）だけで 200MB。さらに接続プール・バッファのメモリも加算される。worker pool で並列度を CPU コア数や接続プール上限に合わせるのが正解。",
      },
      {
        point: "worker pool の channel バッファはジョブ数 or worker 数に設定",
        detail:
          "バッファ 0（unbuffered）: ジョブ投入が worker の処理速度に同期。バッファ = worker 数: 各 worker に1つずつプリフェッチ。バッファ = ジョブ数: 全ジョブを即投入できるがメモリ消費大。通常は worker 数と同じか少し大きめが適切。",
      },
      {
        point:
          "semaphore パターン: buffered channel に空の struct を入れて並列度を制限",
        detail:
          "sem := make(chan struct{}, maxConcurrency); sem <- struct{}{}; defer func() { <-sem }() で簡易セマフォ。golang.org/x/sync/semaphore パッケージはより高機能で、Weighted semaphore や context 対応を提供する。",
      },
      {
        point:
          "errgroup パッケージ (golang.org/x/sync) を使うとエラー収集が簡単",
        detail:
          "g, ctx := errgroup.WithContext(ctx) で context 連動のグループを作成。g.Go(func() error { ... }) でタスクを起動し、g.Wait() で全完了を待つ。いずれかがエラーを返すと ctx がキャンセルされ、残りのタスクも終了を促される。SetLimit(n) で並列度も制限可能（Go 1.20+）。",
      },
    ],
    quizzes: [
      {
        code: "// errgroup で並列度を制限した worker pool\nfunc processAll(ctx context.Context,\n    items []Item) error {\n    g, ctx := ____.____(ctx)\n    g.____(10)  // 最大10並列\n\n    for _, item := range items {\n        item := item\n        g.____(func() error {\n            return processItem(ctx, item)\n        })\n    }\n    return g.____()\n}",
        blanks: ["errgroup", "WithContext", "SetLimit", "Go", "Wait"],
        explanation:
          "errgroup.WithContext で context 連動のグループを作成。SetLimit で並列度を制限し、Go でタスクを追加、Wait で全完了を待つ。",
      },
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
      {
        point:
          "goroutine リークは CPU プロファイルに出ないがメモリを消費し続ける",
        detail:
          "CPU プロファイルはアクティブに CPU を使っている処理を捕捉する。ブロックされて待っているだけの goroutine は CPU を使わないが、スタックメモリやチャネルバッファを保持し続ける。heap profile と goroutine profile の両方を確認する必要がある。",
      },
      {
        point: "goleak ライブラリでテストごとに goroutine リークを検出できる",
        detail:
          "uber-go/goleak パッケージ。TestMain(m *testing.M) に goleak.VerifyTestMain(m) を追加すると、テスト終了時に新しい goroutine が残っていないか自動検証する。CI に組み込むことで goroutine リークを早期発見できる。",
      },
      {
        point:
          "channel への送受信は必ず context キャンセルで脱出できる設計にする",
        detail:
          "ch <- value の送信が永遠にブロックされると goroutine リーク。必ず select { case ch <- value: case <-ctx.Done(): return } の形にして、キャンセル時に脱出できるようにする。受信側も同様。",
      },
      {
        point:
          "pprof の /debug/pprof/goroutine で本番の goroutine 数を確認できる",
        detail:
          "curl localhost:6060/debug/pprof/goroutine?debug=1 でスタックトレース付きの goroutine 一覧を取得。debug=2 で全 goroutine の詳細を出力。Grafana + Prometheus で runtime.NumGoroutine() をモニタリングし、異常増加をアラートにするのが実務のベストプラクティス。",
      },
    ],
    quizzes: [
      {
        code: "// goroutine リーク防止パターン\nfunc produce(ctx context.Context) <-chan int {\n    ch := make(chan int)\n    go func() {\n        ____ ____(ch)\n        for i := 0; ; i++ {\n            ____ {\n            case ch <- i:\n            case ____:\n                return\n            }\n        }\n    }()\n    return ch\n}",
        blanks: ["defer", "close", "select", "<-ctx.Done()"],
        explanation:
          "defer close(ch) で goroutine 終了時に channel を閉じる。select + ctx.Done() で、受信側がいなくなっても goroutine がブロックされるのを防ぐ。",
      },
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
      { point: "b.N はフレームワークが自動調整する（直接指定しない）" },
      { point: "-benchmem で allocs/op と B/op を確認" },
      { point: "-count=5 + benchstat で統計的に有意な比較ができる" },
      { point: "結果は ns/op（ナノ秒/オペレーション）で出る" },
    ],
    quizzes: [
      {
        code: '// ベンチマーク関数の書き方\nfunc ____Concat(b *____) {\n    for i := 0; i < ____; i++ {\n        s := ""\n        for j := 0; j < 100; j++ {\n            s += "a"\n        }\n    }\n}',
        blanks: ["Benchmark", "testing.B", "b.N"],
        explanation:
          "ベンチマーク関数は Benchmark で始まり、*testing.B を受け取る。b.N はテストランナーが自動調整する繰り返し回数。",
      },
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
      {
        point: "最適化の前に必ずプロファイルを取る（測定なき最適化は hazard）",
        detail:
          "推測ではなく計測に基づいて最適化する。CPU プロファイルで関数ごとの処理時間、heap プロファイルでメモリ割り当て箇所を特定。最も時間を消費している箇所から改善する（パレートの法則: 20% のコードが 80% のリソースを消費）。",
      },
      {
        point: "CPU profile: サンプリングベース（100Hz）でホットスポットを特定",
        detail:
          "10ms ごとにスタックトレースをサンプリングし、各関数の出現頻度から CPU 使用率を推定。サンプリングレートが低いため、1秒未満の処理は統計的に不正確。最低 30 秒程度のプロファイルを取る。runtime/pprof または net/http/pprof で取得。",
      },
      {
        point:
          "heap profile: inuse_space（現在）vs alloc_space（累積）を区別する",
        detail:
          "inuse_space: 現時点でヒープに存在するオブジェクト（メモリリーク調査向け）。alloc_space: プログラム開始からの累積割り当て（GC 負荷調査向け）。pprof のデフォルトは inuse_space。-sample_index=alloc_space で累積に切り替え。",
      },
      {
        point: "-http=:8080 でブラウザ上でフレームグラフを見られる",
        detail:
          "go tool pprof -http=:8080 profile.pb.gz でブラウザが開き、フレームグラフ・コールグラフ・ソースビューを対話的に探索できる。Top → Flame Graph → Source の順で見ると効率的。コマンドラインでは top, list, web コマンドが使える。",
      },
    ],
    quizzes: [
      {
        code: '// pprof エンドポイントを公開\nimport ____ "net/http/pprof"\n\nfunc main() {\n    go http.ListenAndServe("____", nil)\n    // CPU プロファイル:\n    // go tool pprof http://localhost:6060/\n    //   debug/pprof/____?seconds=30\n}',
        blanks: ["_", ":6060", "profile"],
        explanation:
          "net/http/pprof を blank import すると /debug/pprof/* エンドポイントが自動登録される。profile は CPU、heap はメモリプロファイルを取得。",
      },
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
      { point: "go build -gcflags=-m で escape analysis の結果を確認できる" },
      { point: "strings.Builder で文字列連結のアロケーションを削減" },
      { point: "sync.Pool は GC サイクルを跨いで存続する保証はない" },
      { point: "-benchmem で allocs/op を確認 → 減らすことがゴール" },
    ],
    quizzes: [
      {
        code: "// sync.Pool でオブジェクトを再利用\nvar bufPool = ____.Pool{\n    ____: func() any {\n        return new(bytes.Buffer)\n    },\n}\n\nfunc process(data []byte) {\n    buf := bufPool.____().(*bytes.Buffer)\n    buf.Reset()\n    ____ bufPool.____(buf)\n    // buf を使って処理...\n}",
        blanks: ["sync", "New", "Get", "defer", "Put"],
        explanation:
          "sync.Pool は GC 間でオブジェクトを再利用する。Get() でプールから取得、Put() で返却。defer で確実に返却する。",
      },
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
      {
        point: "table-driven test はテストケースをデータとして扱い、追加が容易",
        detail:
          "新しいテストケースを追加するときは struct リテラルを1行追加するだけ。テストロジックの重複がなく、全ケースが同じ検証ロジックを通るため、テストコードのメンテナンスコストが低い。",
      },
      {
        point: "t.Run でサブテストを作ると -run フラグで特定テストを実行できる",
        detail:
          "go test -run TestParseInt/invalid のように特定ケースだけ実行できる。CI のログでどのケースが失敗したか一目瞭然。t.Run 内で t.Parallel() を呼ぶと並列実行も可能。",
      },
      {
        point: "t.Parallel() でテストを並列実行して速度を上げられる",
        detail:
          "t.Parallel() を呼ぶとそのサブテストは他の Parallel テストと同時に実行される。ただし共有リソース（DB、ファイル）を使うテストでは競合に注意。-count=1 -race と組み合わせてデータ競合も検出する。",
      },
      {
        point: "Go 1.22+ ではループ変数キャプチャ問題が修正された",
        detail:
          "Go 1.21 以前は for _, tt := range tests の tt がループ外で共有され、t.Parallel() 使用時にバグの原因だった。Go 1.22 で各イテレーションごとに新しい変数が作成されるよう変更。ただし古いバージョンとの互換性のため、tt := tt の記述がまだ残っているコードベースも多い。",
      },
    ],
    quizzes: [
      {
        code: '// table-driven test の基本形\nfunc TestParseInt(t *testing.T) {\n    tests := []struct {\n        name    string\n        input   string\n        want    int\n        wantErr bool\n    }{\n        {"valid", "42", 42, false},\n        {"invalid", "abc", 0, true},\n    }\n    for _, tt := range tests {\n        t.____(tt.name, func(t *testing.T) {\n            got, err := ParseInt(tt.input)\n            if (err != nil) != tt.____ {\n                t.Errorf("err = %v", err)\n            }\n            if got != tt.____ {\n                t.Errorf("got %d, want %d",\n                    got, tt.want)\n            }\n        })\n    }\n}',
        blanks: ["Run", "wantErr", "want"],
        explanation:
          "t.Run でサブテストを作り名前をつける。-run フラグで特定ケースだけ実行可能。wantErr パターンでエラー有無を検証する。",
      },
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
      { point: "外部 I/O を interface で包んでテストから本番実装を切り離す" },
      { point: "手書きモックで十分な場合が多い" },
      { point: "time.Now() も interface で抽象化してテストを決定論的に" },
      {
        point: "httptest.NewServer で HTTP ハンドラをテスト",
        detail:
          "httptest.NewServer(handler) でテスト用 HTTP サーバーを起動し、実際の HTTP リクエストを送れる。URL は ts.URL で取得。テスト終了時に ts.Close() を呼ぶ。外部 API のモックサーバーとしても使え、E2E テストに近いレベルの検証が可能。",
      },
    ],
    quizzes: [
      {
        code: "// interface でモックを注入\ntype Clock ____ {\n    ____() time.Time\n}\n\ntype realClock struct{}\nfunc (realClock) Now() time.Time {\n    return time.Now()\n}\n\ntype mockClock struct{ fixed time.Time }\nfunc (m mockClock) Now() time.Time {\n    return m.____\n}\n\nsvc := NewService(____{\n    fixed: time.Date(\n        2024, 1, 1, 0, 0, 0, 0, time.UTC),\n})",
        blanks: ["interface", "Now", "fixed", "mockClock"],
        explanation:
          "time.Now() を interface で抽象化すると、テストで固定時刻を注入できる。本番は realClock、テストは mockClock を使う。DI の典型例。",
      },
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
      { point: "Go のエラー処理はエラーの追跡可能性を保証する" },
      { point: "io.Closer の Close エラーは書き込み操作後は無視しない" },
      { point: "意図的に無視する場合は _ = f() + コメント" },
      {
        point: "errcheck linter でエラーの無視を検出できる",
        detail:
          "errcheck は Go のエラーチェック漏れを検出する静的解析ツール。golangci-lint にも組み込まれている。CI に組み込むことで、エラーを無視したコードがマージされるのを防ぐ。正当な無視は _ = f() // エラーは無害 のようにコメントで意図を明記する。",
      },
    ],
    quizzes: [
      {
        code: '// エラーを正しく処理する\ndata, ____ := json.Marshal(user)\nif ____ != nil {\n    return fmt.Errorf("marshal: ____", err)\n}\n\n// 意図的に無視する場合はコメントで明示\n____ = logger.Sync() // best-effort flush',
        blanks: ["err", "err", "%w", "_"],
        explanation:
          "エラーを _ で捨てると障害時の原因特定が困難になる。必ず err を受け取って処理する。意図的に無視する場合は _ = にコメントで理由を明示する。",
      },
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
      { point: "グローバル変数はテストの並列実行を妨げる" },
      {
        point: "init() は import 時に実行される。副作用のある init() は避ける",
      },
      { point: "DI でグローバル状態をなくしテスタビリティを上げる" },
      {
        point: "wire / dig などの DI フレームワークは大規模プロジェクトで有効",
        detail:
          "google/wire はコード生成ベースで型安全。uber-go/dig はリフレクションベースで柔軟。小〜中規模なら手動 DI（コンストラクタで渡す）で十分。DI フレームワークは依存グラフが複雑になった時点で導入を検討する。",
      },
    ],
    quizzes: [
      {
        code: "// グローバル変数を DI に置き換える\ntype UserRepo struct {\n    ____ *sql.DB\n}\n\nfunc ____UserRepo(db *sql.DB) *UserRepo {\n    return &UserRepo{____: db}\n}",
        blanks: ["db", "New", "db"],
        explanation:
          "グローバル変数をコンストラクタ引数に変えることで、テスト時に独立した DB を注入できる。並列テストでもグローバル状態の競合が起きない。",
      },
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
      { point: "panic はプログラマーミスを表す（index out of range 等）" },
      { point: "ライブラリコードでは panic を使わない" },
      { point: "Must* パターンは初期化時のみ使う" },
      {
        point: "recover は defer 内でのみ有効。goroutine を跨げない",
        detail:
          "goroutine A で起きた panic を goroutine B で recover することはできない。各 goroutine は独自の defer/recover チェーンを持つ。HTTP サーバーのハンドラは net/http が recover するが、ハンドラ内で起動した goroutine の panic はプロセスをクラッシュさせる。",
      },
    ],
    quizzes: [
      {
        code: '// recover ミドルウェア\nfunc recoveryMiddleware(\n    next http.Handler) http.Handler {\n    return http.HandlerFunc(\n    func(w http.ResponseWriter,\n        r *http.Request) {\n        ____ func() {\n            if rec := ____(); rec != nil {\n                log.Printf("panic: %v", rec)\n                http.Error(w, "error", 500)\n            }\n        }()\n        next.ServeHTTP(w, r)\n    })\n}',
        blanks: ["defer", "recover"],
        explanation:
          "recover は defer 内でのみ有効。HTTP ミドルウェアでリクエスト単位の panic を catch し、プロセス全体のクラッシュを防ぐ。",
      },
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
      { point: "初期スタック 2KB（OS thread は 1-8MB）→ 起動コストが安い" },
      { point: "M:N スケジューラ: 多数の G を少数の M にマップ" },
      { point: "GOMAXPROCS: 同時実行できる P の数（デフォルト CPU コア数）" },
      {
        point: "共有して通信するな、通信して共有せよ",
        detail:
          "Go の並行処理の格言「Don't communicate by sharing memory; share memory by communicating」。mutex でメモリを共有する代わりに、channel でデータの所有権を移転する。ただし全てを channel にするのではなく、単純な共有状態には mutex が適切。判断基準は「所有権が移るか？」。",
      },
    ],
    quizzes: [
      {
        code: "// GMP モデルの要素\n// ____: 軽量スレッド（初期スタック 2KB）\n// ____: OS スレッド\n// ____: スケジューリングコンテキスト\n\nruntime.____(4)",
        blanks: ["G", "M", "P", "GOMAXPROCS"],
        explanation:
          "G = goroutine, M = machine (OS thread), P = processor (スケジューリングコンテキスト)。GOMAXPROCS で同時実行可能な P の数を設定する。",
      },
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
      {
        point: "Go の GC は concurrent で STW は < 1ms が目標",
        detail:
          "Tri-color mark-and-sweep を並行で実行。STW（Stop The World）はマーキング開始と終了の2回だけで、それぞれ数百マイクロ秒。Go 1.5 で並行 GC を導入し、レイテンシは劇的に改善。GODEBUG=gctrace=1 で GC のタイミングと所要時間を確認可能。",
      },
      {
        point:
          "GOGC: 前回 GC 後のヒープサイズの何%増でGCするか（デフォルト100=2倍）",
        detail:
          "GOGC=100 は「前回 GC 後の live heap の2倍に達したら GC する」意味。GOGC=200 なら3倍まで許容（GC 頻度が下がるがメモリ消費は増える）。GOGC=off で GC を無効化（テスト・ベンチマーク用）。",
      },
      {
        point:
          "GOMEMLIMIT（Go 1.19+）でメモリ上限設定するとチューニングが簡単に",
        detail:
          "コンテナ環境で GOMEMLIMIT=512MiB と設定すると、メモリ使用量が上限に近づいたときに積極的に GC する。GOGC との併用が推奨。OOM Killer に殺される前に GC で回収するため、コンテナの安定性が向上する。",
      },
      {
        point: "GC への最大の貢献はアロケーション削減",
        detail:
          "GC はヒープ上のオブジェクトを回収するコスト。オブジェクトを作らなければ GC は走らない。具体策: (1) sync.Pool で再利用、(2) make の cap 指定で append の再割り当て削減、(3) 値型（struct）をポインタにせずスタックに置く、(4) string の結合は strings.Builder を使う。",
      },
    ],
    quizzes: [
      {
        code: "// GC チューニング環境変数\n// ____=100     ヒープの何%増でGCするか\n// ____=512MiB  メモリ上限（Go 1.19+）\n// GODEBUG=____=1  GCトレース出力",
        blanks: ["GOGC", "GOMEMLIMIT", "gctrace"],
        explanation:
          "GOGC=100 は live heap が2倍になったら GC。GOMEMLIMIT でコンテナのメモリ上限に合わせて OOM 防止。gctrace で GC の実行状況を確認。",
      },
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
      { point: "implicit: struct が interface を明示的に宣言する必要がない" },
      { point: "Accept interfaces, return structs が Go のイディオム" },
      { point: "小さな interface（1-2メソッド）が標準" },
      {
        point: "Go 1.18 のジェネリクスで any 型の多用を減らせるようになった",
        detail:
          "ジェネリクス導入前は interface{} (any) と型アサーションで汎用関数を書いていた。ジェネリクスにより型パラメータで安全に書ける。ただし過度なジェネリクスは Go らしくない。具体型で書けるならジェネリクスは不要。slices, maps パッケージが標準ライブラリでの活用例。",
      },
    ],
    quizzes: [
      {
        code: "// Go の interface は暗黙的\ntype Stringer ____ {\n    String() string\n}\n\ntype User struct{ Name string }\n\n// implements 宣言は____\nfunc (u User) String() string {\n    return u.Name\n}\n\nvar ____ Stringer = User{}",
        blanks: ["interface", "不要", "_"],
        explanation:
          "Go の interface は暗黙的に満たされる（duck typing）。メソッドのシグネチャが一致すれば自動的に実装とみなされる。",
      },
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
      {
        point: "「Goらしい」= 明示的・シンプル・合成可能",
        detail:
          "Go の設計哲学は「Less is more」。暗黙的な型変換、例外、ジェネリクスの過度な使用を避ける。コードを読む人が「何が起きているか」を即座に理解できることを最優先する。Rob Pike の「明快さは賢さに勝る（Clarity is better than cleverness）」が指針。",
      },
      {
        point: "マジック（暗黙的な動作）を避け、明示的に書く",
        detail:
          "reflect パッケージの多用、init() での暗黙的な初期化、interface{} (any) の乱用を避ける。エラーは明示的に返す（例外ではなく）。依存は明示的に注入する（グローバル変数ではなく）。テストが書きやすいコード = 明示的なコード。",
      },
      {
        point: "エラーは戻り値で返し、無視しない",
        detail:
          "Go は try-catch ではなく、if err != nil { return err } パターン。冗長に感じるが、エラーハンドリングの場所が明確で、どの関数が失敗しうるか一目瞭然。errcheck リンターで無視されたエラーを検出し、CI で強制する。",
      },
      {
        point: "小さな interface と struct の合成でシステムを組み立てる",
        detail:
          "Go には継承がないが、struct の埋め込み（embedding）と interface の合成で柔軟な設計が可能。io.ReadWriter = io.Reader + io.Writer のように小さな interface を組み合わせる。struct も同様に小さな struct を埋め込んで機能を合成する。これにより各パーツが独立してテスト可能になる。",
      },
    ],
    quizzes: [
      {
        code: '// Goらしいエラーハンドリング\nfunc readConfig(path string) (*Config, error) {\n    data, ____ := os.ReadFile(path)\n    if ____ != nil {\n        return nil, ____(\n            "readConfig: ____", err)\n    }\n    var cfg Config\n    if err := json.Unmarshal(\n        data, &cfg); err != nil {\n        return nil, fmt.Errorf(\n            "readConfig parse: %w", err)\n    }\n    return &cfg, ____\n}',
        blanks: ["err", "err", "fmt.Errorf", "%w", "nil"],
        explanation:
          "Go のエラーは戻り値で返す。各ステップでエラーチェックし、コンテキストを付加してラップする。正常時は nil を返す。",
      },
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
      { point: "設計判断は「なぜそうしたか」を説明できることが重要" },
      { point: "interface は使う側で定義し、実装が1つなら不要 (YAGNI)" },
      { point: "channel は所有権の移転、mutex は状態の保護" },
      {
        point: "error の種類（sentinel / wrapping / custom）を使い分ける",
        detail:
          "sentinel error（ErrNotFound 等）: 既知の条件を errors.Is で判定。wrapping（fmt.Errorf %w）: コンテキストを付加して伝播。custom type: 追加情報を持つエラー型を errors.As で取得。panic は通常フローでは使わず、プログラマーミスのみ。この3+1の使い分けを即答できると設計力が伝わる。",
      },
    ],
    quizzes: [
      {
        code: "// 設計判断クイズ\n// 1. 共有カウンター更新 → ____\n// 2. ジョブを worker に渡す → ____\n// 3. 外部APIのモック → ____ を定義\n// 4. 追加情報付きエラー → ____ type",
        blanks: ["mutex", "channel", "interface", "custom error"],
        explanation:
          "共有状態の保護は mutex、所有権の移転は channel、テスト差し替えは interface、追加情報付きエラーは custom error type。",
      },
    ],
  },

  // ── 基本文法（追加） ─────────────────────────────────

  "syntax-map": {
    id: "syntax-map",
    section: "syntax",
    title: "Map の落とし穴と安全な操作",
    tag: "ハマりポイント",
    summary:
      "map はリファレンス型で goroutine unsafe。nil map への書き込みは panic。iteration 順序は不定。",
    why: "map の内部構造を理解しないと concurrent map write で本番障害が起きる。nil map / iteration 中の delete / 順序不定は中級者が見落とすポイント。",
    tradeoffs: [
      {
        title: "sync.Map vs Mutex+map",
        desc: "sync.Map は読み取りが支配的なケースで高速。書き込みが多い場合は Mutex+map の方がシンプルで速い。",
      },
    ],
    badCode: `// nil map への書き込み → panic
var m map[string]int
m["key"] = 1  // panic: assignment to entry in nil map

// goroutine 間で共有 → fatal: concurrent map writes
go func() { m["a"] = 1 }()
go func() { m["b"] = 2 }()  // crash!

// iteration 順序に依存
for k, v := range m {
    fmt.Println(k, v)  // 実行ごとに順序が変わる
}`,
    goodCode: `// 初期化してから使う
m := make(map[string]int)
m["key"] = 1

// goroutine 安全: sync.RWMutex で保護
type SafeMap struct {
    mu sync.RWMutex
    m  map[string]int
}

func (s *SafeMap) Get(key string) (int, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    v, ok := s.m[key]
    return v, ok
}

func (s *SafeMap) Set(key string, val int) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.m[key] = val
}

// ソートした順序で iteration
keys := make([]string, 0, len(m))
for k := range m { keys = append(keys, k) }
sort.Strings(keys)
for _, k := range keys {
    fmt.Println(k, m[k])
}

// 存在チェック（zero value との区別）
if v, ok := m["key"]; ok {
    fmt.Println("found:", v)
}`,
    interviewPoints: [
      {
        point: "map は make で初期化必須。nil map への write は panic",
        detail:
          "var m map[string]int は nil map を宣言するだけ。read は安全（zero value を返す）だが write は panic。make(map[string]int) または map リテラル map[string]int{} で初期化する。",
      },
      {
        point: "map は goroutine 安全ではない。sync.RWMutex か sync.Map で保護",
        detail:
          "Go 1.6 以降、concurrent map write は即座に fatal error でクラッシュする（race detector 不要で検出）。read が多い場合は sync.Map、write が多い場合は RWMutex+map が適切。",
      },
      {
        point:
          "iteration 順序は Go の仕様で不定。ソートが必要なら keys を取り出す",
        detail:
          "Go ランタイムは意図的にランダム化している（順序依存バグの防止）。JSON 出力の安定性が必要なら encoding/json の MarshalJSON で keys をソートする。",
      },
      {
        point:
          "v, ok := m[key] の 2値パターンで存在チェック。zero value との区別に必須",
        detail:
          'm[key] は key が存在しない場合 zero value を返す。int なら 0、string なら ""。ok で存在を確認しないと、0 が値として入っているのか未設定なのか区別できない。',
      },
    ],
    quizzes: [
      {
        code: '// map の安全な初期化と存在チェック\nm := ____(map[string]int)\nm["age"] = 30\n\nif v, ____ := m["age"]; ____ {\n    fmt.Println("found:", v)\n}',
        blanks: ["make", "ok", "ok"],
        explanation:
          "make で初期化し、2値パターン v, ok := m[key] で存在チェック。ok が false なら key は存在しない。",
      },
    ],
  },

  "syntax-generics": {
    id: "syntax-generics",
    section: "syntax",
    title: "Generics（型パラメータ）の実践",
    tag: "必須",
    summary:
      "Go 1.18+ の型パラメータ。constraints で型を制約。slices/maps パッケージで標準活用。過度な抽象化は避ける。",
    why: "Generics の正しい使い所を知ることで、型安全と可読性を両立できる。過度な Generics は Go らしさを損なう。",
    tradeoffs: [
      {
        title: "Generics vs interface",
        desc: "Generics はコンパイル時に型解決。interface はランタイムのディスパッチ。パフォーマンスが必要なら Generics。",
      },
      {
        title: "具体型 vs Generics",
        desc: "具体型で書けるなら Generics は不要。3つ以上の型で同じロジックが必要になったら導入を検討。",
      },
    ],
    badCode: `// 過度な Generics: 読みにくい
type Repository[T Entity, ID comparable, F Filter[T]] interface {
    FindByID(ctx context.Context, id ID) (T, error)
    FindAll(ctx context.Context, f F) ([]T, error)
    Save(ctx context.Context, entity T) error
}
// ← 型パラメータが多すぎて理解困難

// any を乱用（Generics の意味がない）
func Process[T any](v T) T { return v }`,
    goodCode: `// 適切な Generics: シンプルで型安全
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}

// constraints で型を制約
type Number interface {
    ~int | ~int64 | ~float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

// 標準ライブラリの活用（Go 1.21+）
import "slices"

sorted := slices.SortedFunc(users, func(a, b User) int {
    return strings.Compare(a.Name, b.Name)
})
idx, found := slices.BinarySearchFunc(sorted, target, ...)

// コンパイル時に型制約を検証
names := Map(users, func(u User) string { return u.Name })`,
    interviewPoints: [
      {
        point:
          "Generics は「3つ以上の型で同じロジック」が目安。1-2型なら具体型で書く",
        detail:
          "YAGNI 原則。最初から Generics にせず、重複が3箇所以上になったらリファクタリングで導入する。Go は explicit を重視するため、必要になるまで抽象化しない。",
      },
      {
        point: "constraints パッケージと ~ 記号で underlying type を制約できる",
        detail:
          "~int は int を underlying type に持つ全ての型（type MyInt int 等）を含む。comparable は == で比較可能な型。cmp.Ordered は比較演算子が使える型。",
      },
      {
        point:
          "slices, maps パッケージ（Go 1.21+）が Generics の標準的な活用例",
        detail:
          "slices.Sort, slices.Contains, maps.Keys, maps.Values など。自分で Generics ユーティリティを書く前に標準ライブラリを確認する。",
      },
      {
        point: "interface{} (any) の乱用を Generics で型安全に置き換えられる",
        detail:
          "以前は func Contains(s []interface{}, v interface{}) bool と書いていたものを func Contains[T comparable](s []T, v T) bool に。型アサーション不要でコンパイル時に型チェックされる。",
      },
    ],
    quizzes: [
      {
        code: "// Generics で型安全な関数を定義\nfunc Filter[____ any](s []T, f func(T) ____) []T {\n    var result []T\n    for _, v := ____ s {\n        if f(v) {\n            result = ____(result, v)\n        }\n    }\n    return result\n}",
        blanks: ["T", "bool", "range", "append"],
        explanation:
          "型パラメータ T を any で制約し、フィルタ関数 f(T) bool でスライスを絞り込む。Go の Generics は [] で型パラメータを宣言する。",
      },
    ],
  },

  // ── 設計（追加） ───────────────────────────────────────

  "design-graceful-shutdown": {
    id: "design-graceful-shutdown",
    section: "design",
    title: "Graceful Shutdown の実装",
    tag: "実務頻出",
    summary:
      "シグナルを受けて処理中のリクエストを完了させてから停止。context + signal.NotifyContext で実現。",
    why: "ungraceful な停止はリクエスト中断・データ不整合・接続リークを引き起こす。K8s 環境では必須の知識。",
    tradeoffs: [
      {
        title: "停止待機時間",
        desc: "長すぎるとデプロイが遅延。短すぎると処理が中断される。K8s の terminationGracePeriodSeconds と合わせる。",
      },
    ],
    badCode: `// 即座に停止（処理中のリクエストが中断）
func main() {
    srv := &http.Server{Addr: ":8080", Handler: mux}
    log.Fatal(srv.ListenAndServe())
    // ← SIGTERM で即死。in-flight リクエストは中断
}`,
    goodCode: `// Graceful Shutdown: シグナルで停止
func main() {
    srv := &http.Server{Addr: ":8080", Handler: mux}

    // サーバー起動（別 goroutine）
    go func() {
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("server error: %v", err)
        }
    }()

    // シグナル待ち
    ctx, stop := signal.NotifyContext(
        context.Background(), syscall.SIGTERM, syscall.SIGINT)
    defer stop()
    <-ctx.Done()

    // Graceful shutdown（最大30秒待機）
    shutdownCtx, cancel := context.WithTimeout(
        context.Background(), 30*time.Second)
    defer cancel()

    log.Println("shutting down...")
    if err := srv.Shutdown(shutdownCtx); err != nil {
        log.Printf("shutdown error: %v", err)
    }
    log.Println("server stopped")
}`,
    interviewPoints: [
      {
        point: "signal.NotifyContext（Go 1.16+）でシグナルを context に変換",
        detail:
          "SIGTERM/SIGINT を受けると context がキャンセルされる。<-ctx.Done() で待ち受け、srv.Shutdown() で graceful に停止。K8s は Pod 停止時に SIGTERM を送る。",
      },
      {
        point: "srv.Shutdown は新規接続を拒否し、処理中のリクエスト完了を待つ",
        detail:
          "ListenAndServe は http.ErrServerClosed を返す。Shutdown に渡す context のタイムアウトで最大待機時間を制御。タイムアウト超過で強制終了。",
      },
      {
        point:
          "K8s では terminationGracePeriodSeconds とタイムアウトを合わせる",
        detail:
          "K8s のデフォルトは30秒。アプリのシャットダウンタイムアウトはそれより短くする（例: 25秒）。preStop hook で readiness probe を fail にし、新規トラフィックを止めてから停止するのがベストプラクティス。",
      },
    ],
    quizzes: [
      {
        code: "// Graceful Shutdown パターン\nctx, stop := signal.____(\n    context.Background(),\n    syscall.SIGTERM, syscall.SIGINT)\ndefer stop()\n____  // シグナル待ち\n\nshutdownCtx, cancel := context.____(\n    context.Background(), 30*time.Second)\ndefer cancel()\nsrv.____(shutdownCtx)",
        blanks: ["NotifyContext", "<-ctx.Done()", "WithTimeout", "Shutdown"],
        explanation:
          "signal.NotifyContext でシグナルを context 化。<-ctx.Done() で待ち、WithTimeout で最大待機時間を設定、srv.Shutdown で graceful に停止。",
      },
    ],
  },

  "design-middleware": {
    id: "design-middleware",
    section: "design",
    title: "Middleware パターン",
    tag: "イディオム",
    summary:
      "func(http.Handler) http.Handler のチェーン。ロギング・認証・recover・CORS を横断的に適用。",
    why: "Middleware はクロスカッティングな関心事を分離する Go 標準のパターン。フレームワークに依存しない設計が可能。",
    tradeoffs: [
      {
        title: "Middleware の順序",
        desc: "外側から順に実行される。recover → logging → auth の順が一般的。順序を間違えると認証前にログが出たり recover が効かない。",
      },
    ],
    badCode: `// ハンドラに横断的処理を直書き
func handleUser(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    log.Printf("%s %s", r.Method, r.URL)  // logging

    token := r.Header.Get("Authorization")  // auth
    if token == "" {
        http.Error(w, "unauthorized", 401)
        return
    }

    // ← 全ハンドラにコピペ...
    w.Write([]byte("ok"))
    log.Printf("took %v", time.Since(start))
}`,
    goodCode: `// Middleware パターン: func(http.Handler) http.Handler
func logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %v", r.Method, r.URL, time.Since(start))
    })
}

func auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token == "" {
            http.Error(w, "unauthorized", 401)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// チェーンで適用（外側から実行）
func chain(h http.Handler, mw ...func(http.Handler) http.Handler) http.Handler {
    for i := len(mw) - 1; i >= 0; i-- {
        h = mw[i](h)
    }
    return h
}

mux := http.NewServeMux()
mux.HandleFunc("/api/users", handleUser)
handler := chain(mux, recovery, logging, auth)`,
    interviewPoints: [
      {
        point:
          "func(http.Handler) http.Handler が Go の標準 Middleware シグネチャ",
        detail:
          "net/http に依存するだけでフレームワーク不要。chi, echo, gin も内部的に同じパターン。標準ライブラリの http.StripPrefix, http.TimeoutHandler も Middleware。",
      },
      {
        point: "チェーンの順序: recover → logging → auth → handler が一般的",
        detail:
          "recover が最外側なら全 panic を catch。logging がその次なら認証失敗もログに残る。auth はビジネスロジック直前。順序を間違えると auth 前のリクエストがログに出ない等の問題が起きる。",
      },
      {
        point: "context.WithValue で Middleware 間のデータ受け渡しが可能",
        detail:
          "auth Middleware で検証したユーザー情報を context に入れ、後続のハンドラで取り出す。ただし context.Value は型安全でないため、型付きキーを使い、取得関数を提供するのが Go の慣習。",
      },
    ],
    quizzes: [
      {
        code: '// Middleware の型シグネチャ\nfunc logging(next ____) ____ {\n    return http.HandlerFunc(\n    func(w http.ResponseWriter,\n        r *http.Request) {\n        start := time.Now()\n        next.____(w, r)\n        log.Printf("%v", time.Since(start))\n    })\n}',
        blanks: ["http.Handler", "http.Handler", "ServeHTTP"],
        explanation:
          "Middleware は http.Handler を受け取り http.Handler を返す関数。next.ServeHTTP(w, r) で次のハンドラに処理を委譲する。",
      },
    ],
  },

  // ── 並行処理（追加） ───────────────────────────────────

  "concurrency-sync": {
    id: "concurrency-sync",
    section: "concurrency",
    title: "sync パッケージの活用",
    tag: "実務頻出",
    summary:
      "sync.Once で初期化を1回だけ実行。sync.Map は読み取り優位な並行 map。sync.Cond は条件変数。",
    why: "channel だけでは効率が悪い場面がある。sync パッケージの道具を知ることで適切な選択ができる。",
    tradeoffs: [
      {
        title: "sync.Map vs RWMutex+map",
        desc: "sync.Map は型安全でない（any を返す）。型安全が重要なら RWMutex+map の方が良い。",
      },
    ],
    badCode: `// 初期化を毎回チェック（race condition あり）
var instance *Config

func GetConfig() *Config {
    if instance == nil {  // race!
        instance = loadConfig()
    }
    return instance
}

// map を Mutex なしで goroutine 共有
var cache = map[string]string{}
go func() { cache["k"] = "v" }()  // fatal!`,
    goodCode: `// sync.Once: goroutine 安全な1回限りの初期化
var (
    instance *Config
    once     sync.Once
)

func GetConfig() *Config {
    once.Do(func() {
        instance = loadConfig()
    })
    return instance
}

// sync.Pool: 一時オブジェクトの再利用
var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) },
}

func process() {
    buf := bufPool.Get().(*bytes.Buffer)
    defer bufPool.Put(buf)
    buf.Reset()
    // buf を使って処理
}

// sync.WaitGroup: 複数 goroutine の完了待ち
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)
    go func(it Item) {
        defer wg.Done()
        process(it)
    }(item)
}
wg.Wait()`,
    interviewPoints: [
      {
        point: "sync.Once は goroutine 安全なシングルトン初期化に使う",
        detail:
          "Do() は最初の1回だけ実行。2回目以降は即 return。内部で Mutex を使うが、初回以降はロック不要で高速。DB 接続プールや設定のロードに最適。",
      },
      {
        point: "sync.Pool は GC 間でオブジェクトを再利用しアロケーションを削減",
        detail:
          "Get() でプールから取得（なければ New で生成）、Put() で返却。GC のたびにプールがクリアされるため、永続キャッシュには不向き。bytes.Buffer や JSON エンコーダの再利用が典型。",
      },
      {
        point: "sync.WaitGroup は Add/Done/Wait で goroutine の完了を待つ",
        detail:
          "Add(n) でカウント増加、Done() で減少（= Add(-1)）、Wait() でゼロになるまでブロック。Add は goroutine 起動前に呼ぶ（起動後だと race condition）。",
      },
      {
        point: "sync.Map は読み取りが支配的な並行 map に最適化されている",
        detail:
          "内部的に read-only マップと dirty マップの2層構造。読み取りはロックフリーで高速。Store/Delete が多い場合は RWMutex+map の方が速い。",
      },
    ],
    quizzes: [
      {
        code: "// goroutine 安全な1回限りの初期化\nvar (\n    cfg  *Config\n    ____ sync.Once\n)\n\nfunc GetConfig() *Config {\n    once.____(func() {\n        cfg = loadConfig()\n    })\n    return cfg\n}",
        blanks: ["once", "Do"],
        explanation:
          "sync.Once の Do() は最初の呼び出しでのみ関数を実行する。複数 goroutine から同時に呼ばれても安全で、1回だけ初期化が実行される。",
      },
    ],
  },

  "concurrency-rate-limit": {
    id: "concurrency-rate-limit",
    section: "concurrency",
    title: "Rate Limiting の実装",
    tag: "設計",
    summary:
      "time.Ticker / golang.org/x/time/rate / semaphore で流量制御。API 呼び出しや DB 接続数の制限に必須。",
    why: "外部 API のレート制限を超えるとブロックされる。自サービスも過負荷保護が必要。",
    tradeoffs: [
      {
        title: "Token Bucket vs Fixed Window",
        desc: "Token Bucket はバースト許容。Fixed Window は厳密だがウィンドウ境界で2倍になりうる。",
      },
    ],
    badCode: `// レート制限なしで外部 API を叩く
for _, id := range userIDs {
    go func(id string) {
        resp, _ := http.Get(apiURL + id)  // 同時に数千リクエスト!
        // ← API から 429 Too Many Requests
    }(id)
}`,
    goodCode: `// time.Ticker で固定レート制限
func rateLimited(ctx context.Context, items []string) {
    ticker := time.NewTicker(100 * time.Millisecond) // 10 req/s
    defer ticker.Stop()

    for _, item := range items {
        select {
        case <-ticker.C:
            process(item)
        case <-ctx.Done():
            return
        }
    }
}

// golang.org/x/time/rate: Token Bucket
limiter := rate.NewLimiter(rate.Limit(10), 20)  // 10/s, burst 20

for _, item := range items {
    if err := limiter.Wait(ctx); err != nil {
        return err  // context cancelled
    }
    process(item)
}

// semaphore で並列度を制限
sem := make(chan struct{}, 10)  // 最大10並列
for _, item := range items {
    sem <- struct{}{}  // 空きを待つ
    go func(it string) {
        defer func() { <-sem }()
        process(it)
    }(item)
}`,
    interviewPoints: [
      {
        point: "rate.NewLimiter は Token Bucket アルゴリズムを実装",
        detail:
          "rate.Limit(10) で秒間10トークン生成、第2引数でバーストサイズを指定。Wait(ctx) でトークンを消費し、なければブロック。Allow() はノンブロッキング版。",
      },
      {
        point: "time.Ticker で固定間隔のレート制限。シンプルだがバースト不可",
        detail:
          "100ms ごとに1リクエスト = 秒間10リクエスト。バースト対応が不要なら最もシンプルな方法。defer ticker.Stop() を忘れるとリークする。",
      },
      {
        point: "buffered channel で semaphore パターンを実装できる",
        detail:
          "ch := make(chan struct{}, N) で N 並列に制限。ch <- struct{}{} で空きを待ち、<-ch で解放。golang.org/x/sync/semaphore パッケージはより高機能（Weighted、context 対応）。",
      },
    ],
    quizzes: [
      {
        code: "// Token Bucket でレート制限\nlimiter := rate.____(rate.Limit(10), 20)\n\nfor _, item := range items {\n    if err := limiter.____(ctx); err != nil {\n        return err\n    }\n    process(item)\n}",
        blanks: ["NewLimiter", "Wait"],
        explanation:
          "rate.NewLimiter(10, 20) で秒間10リクエスト、バースト20のリミッターを作成。Wait(ctx) でトークンを取得し、なければブロック。",
      },
    ],
  },

  // ── パフォーマンス（追加） ──────────────────────────────

  "perf-string": {
    id: "perf-string",
    section: "performance",
    title: "string 操作の最適化",
    tag: "最適化",
    summary:
      "string は immutable。+ 結合はループ内で O(n^2)。strings.Builder / []byte で高速化。",
    why: "ログ生成、JSON 構築、テンプレート処理で文字列結合が頻出。知らないと GC 負荷が激増する。",
    tradeoffs: [
      {
        title: "string vs []byte",
        desc: "string は immutable で安全。[]byte は可変で高速。変換はコピーが発生するため、最初から適切な型で扱う。",
      },
    ],
    badCode: `// ループ内の + 結合: O(n^2) のメモリ確保
func buildCSV(rows [][]string) string {
    var result string
    for _, row := range rows {
        for i, col := range row {
            if i > 0 { result += "," }
            result += col  // 毎回新しい string を確保
        }
        result += "\n"
    }
    return result  // 10,000行で数秒かかる
}

// fmt.Sprintf の多用（リフレクション + アロケーション）
for _, user := range users {
    log.Println(fmt.Sprintf("user: %s", user.Name))
}`,
    goodCode: `// strings.Builder: 内部バッファに追記（O(n)）
func buildCSV(rows [][]string) string {
    var b strings.Builder
    b.Grow(len(rows) * 64)  // 容量を事前確保

    for _, row := range rows {
        for i, col := range row {
            if i > 0 { b.WriteByte(',') }
            b.WriteString(col)
        }
        b.WriteByte('\n')
    }
    return b.String()
}

// []byte で直接構築（さらに高速）
func buildJSON(items []Item) []byte {
    buf := make([]byte, 0, len(items)*128)
    buf = append(buf, '[')
    for i, item := range items {
        if i > 0 { buf = append(buf, ',') }
        buf = append(buf, item.JSON()...)
    }
    buf = append(buf, ']')
    return buf
}

// strconv は fmt.Sprintf より高速
s := strconv.Itoa(42)           // vs fmt.Sprintf("%d", 42)
s := strconv.FormatFloat(3.14, 'f', 2, 64)`,
    interviewPoints: [
      {
        point: "string は immutable。+ 結合はループ内で O(n^2) のメモリ確保",
        detail:
          "各 + で新しい string が確保され、既存の内容がコピーされる。10,000回の結合で約50MB の一時メモリが必要。GC 負荷も比例して増大する。",
      },
      {
        point:
          "strings.Builder は内部バッファに追記。Grow() で事前確保すると realloc を防げる",
        detail:
          "Builder.String() は Go 1.10 以降、内部バッファをコピーせず返す（unsafe.String 使用）。Grow(n) でバッファを事前確保すると append の reallocation が減る。",
      },
      {
        point:
          "strconv は fmt.Sprintf より 3-10 倍高速（リフレクション不使用）",
        detail:
          "fmt.Sprintf はフォーマット文字列をパースし、リフレクションで型を判定する。strconv.Itoa, strconv.FormatFloat は型固定で直接変換するため高速。ホットパスでは strconv を使う。",
      },
    ],
    quizzes: [
      {
        code: "// 高速な文字列結合\nvar b strings.____\nb.____(len(items) * 64)\nfor _, item := range items {\n    b.____(item.Name)\n    b.WriteByte(',')\n}\nresult := b.____()",
        blanks: ["Builder", "Grow", "WriteString", "String"],
        explanation:
          "strings.Builder で内部バッファに追記。Grow で事前確保、WriteString で追記、String() で結果を取得。",
      },
    ],
  },

  // ── テスト（追加） ─────────────────────────────────────

  "test-helper": {
    id: "test-helper",
    section: "testing",
    title: "テストヘルパーと testify",
    tag: "イディオム",
    summary:
      "t.Helper() でスタックトレースを改善。t.Cleanup() でリソース解放。testify でアサーションを簡潔に。",
    why: "テストコードも保守するコード。ヘルパーを使えばテストの可読性と DRY が向上する。",
    tradeoffs: [
      {
        title: "testify vs 標準ライブラリ",
        desc: "testify は便利だが依存が増える。標準の t.Errorf で十分な場合も多い。プロジェクトの方針に従う。",
      },
    ],
    badCode: `// ヘルパーなし: エラー箇所が分かりにくい
func TestUserAPI(t *testing.T) {
    db, err := sql.Open("postgres", testDSN)
    if err != nil {
        t.Fatal(err)  // ← この行が表示される（実際の問題箇所ではない）
    }
    defer db.Close()

    // 同じセットアップを毎テストにコピペ
}`,
    goodCode: `// t.Helper() でスタックトレースを改善
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper()  // この関数をスタックから除外
    db, err := sql.Open("postgres", testDSN)
    if err != nil {
        t.Fatal(err)  // テスト側の呼び出し行が表示される
    }
    t.Cleanup(func() { db.Close() })  // テスト終了時に自動実行
    return db
}

func TestUserAPI(t *testing.T) {
    db := setupTestDB(t)  // ← 失敗時はこの行が報告される
    repo := NewUserRepo(db)
    // ...
}

// t.TempDir() でテスト用の一時ディレクトリ
func TestFileWriter(t *testing.T) {
    dir := t.TempDir()  // テスト終了時に自動削除
    path := filepath.Join(dir, "test.txt")
    // ...
}

// testify でアサーションを簡潔に
import "github.com/stretchr/testify/assert"

func TestCalc(t *testing.T) {
    assert.Equal(t, 42, Add(40, 2))
    assert.NoError(t, err)
    assert.Contains(t, result, "expected")
}`,
    interviewPoints: [
      {
        point:
          "t.Helper() を呼ぶとスタックトレースからヘルパー関数が除外される",
        detail:
          "テスト失敗時に表示される行番号がヘルパー内部ではなく、呼び出し元のテスト関数になる。複数のテストで共有するセットアップ関数には必ずつける。",
      },
      {
        point: "t.Cleanup() はテスト終了時に自動実行される（defer より安全）",
        detail:
          "サブテスト（t.Run）内で登録しても、そのサブテスト終了時に実行される。DB 接続、一時ファイル、テストサーバーの後始末に使う。LIFO 順で実行。",
      },
      {
        point: "t.TempDir() はテスト用の一時ディレクトリを作り自動削除する",
        detail:
          "Go 1.15 で追加。os.MkdirTemp + defer os.RemoveAll のパターンを1行で書ける。パスは t.Name() ベースなので衝突しない。",
      },
    ],
    quizzes: [
      {
        code: '// テストヘルパーの定番パターン\nfunc setupDB(t *testing.T) *sql.DB {\n    t.____()  // スタックトレースから除外\n    db, err := sql.Open("postgres", dsn)\n    if err != nil { t.Fatal(err) }\n    t.____(func() { db.Close() })\n    return db\n}',
        blanks: ["Helper", "Cleanup"],
        explanation:
          "t.Helper() でヘルパー関数をスタックトレースから除外。t.Cleanup() でテスト終了時のリソース解放を登録する。",
      },
    ],
  },

  // ── アンチパターン（追加） ─────────────────────────────

  "anti-over-engineering": {
    id: "anti-over-engineering",
    section: "antipatterns",
    title: "過剰設計（Over-Engineering）",
    tag: "NG",
    summary:
      "使わない interface、不要な抽象層、過度な Generics。Go のシンプルさを活かす。YAGNI を徹底。",
    why: "Go の強みはシンプルさ。Java/C# の設計パターンを持ち込むと可読性が急降下し、チームの生産性を損なう。",
    tradeoffs: [],
    badCode: `// Java 的な過剰設計
type UserServiceInterface interface { ... }
type UserServiceImpl struct { ... }
type UserServiceFactory struct { ... }
type UserServiceFactoryImpl struct { ... }

// 実装が1つしかないのに interface
type Logger interface {
    Info(msg string)
    Error(msg string)
}
type loggerImpl struct{}  // ← 実装がこれだけ

// 不要な抽象層
func NewUserHandler(svc UserServiceInterface) *UserHandler {
    return &UserHandler{
        svc: NewUserServiceDecorator(
            NewUserServiceValidator(svc)),
    }
}`,
    goodCode: `// Go らしいシンプルな設計

// 実装が1つなら具体型で十分
type Logger struct{ w io.Writer }
func (l *Logger) Info(msg string) { ... }

// interface は必要になってから（テスト or 複数実装）
type UserRepo struct{ db *sql.DB }
func NewUserRepo(db *sql.DB) *UserRepo { ... }

// ハンドラは直接書く（不要なレイヤーを作らない）
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    user, err := h.repo.FindByID(r.Context(), id)
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }
    json.NewEncoder(w).Encode(user)
}

// 3行で済むなら関数を切り出さない
// 「コピペは2回まで。3回目でリファクタリング」`,
    interviewPoints: [
      {
        point: "Go では「実装が1つなら interface 不要」（YAGNI）",
        detail:
          "テストで差し替える必要が出てから interface を定義する。Go は暗黙的に満たされるので、後から追加しても既存コードに影響しない。最初から interface を定義する Java 的アプローチは避ける。",
      },
      {
        point: "Factory, Decorator, Abstract Factory は Go では通常不要",
        detail:
          "Go にはコンストラクタがない代わりに New 関数がある。デコレーターは Middleware パターンで代替。Abstract Factory はジェネリクスか関数で十分。Design Patterns の Gang of Four を Go に直訳しない。",
      },
      {
        point: "3行で済むなら関数を切り出さない。DRY より明快さを優先",
        detail:
          "Go は「Clear is better than clever」。短い処理を無理に関数化すると呼び出しを辿る手間が増える。同じ3行が3箇所に出たら関数化を検討する。",
      },
    ],
    quizzes: [
      {
        code: "// Go らしい設計判断\n// 実装が1つしかない → ____ で十分\n// テストで差し替えたい → ____ を定義\n// 3行の重複が2箇所 → そのまま（____原則）\n// 3箇所以上の重複 → 関数に切り出す",
        blanks: ["具体型", "interface", "YAGNI"],
        explanation:
          "Go では必要になるまで抽象化しない。interface は後から追加できるため、最初は具体型で書く。YAGNI = You Ain't Gonna Need It。",
      },
    ],
  },

  // ── ツールチェイン ─────────────────────────────────────

  "tools-linter": {
    id: "tools-linter",
    section: "toolchain",
    title: "golangci-lint と静的解析",
    tag: "計測",
    summary:
      "golangci-lint は 100+ の linter を統合実行。CI に組み込んでコード品質を自動チェック。",
    why: "人間のレビューだけでは見落とす問題を機械的に検出。errcheck, govet, staticcheck が特に重要。",
    tradeoffs: [
      {
        title: "厳格 vs 寛容",
        desc: "全 linter を有効にすると false positive が増える。プロジェクトに合わせて .golangci.yml で調整。",
      },
    ],
    badCode: `// linter が検出する典型的な問題

// errcheck: エラー無視
json.Marshal(data)  // returned error is not checked

// govet: Printf フォーマット不一致
fmt.Printf("%d", "string")  // wrong type

// staticcheck: deprecated API
ioutil.ReadFile("config.json")  // SA1019

// ineffassign: 代入した値を使っていない
x := compute()
x = 0  // ineffectual assignment`,
    goodCode: `// .golangci.yml の推奨設定
// linters:
//   enable:
//     - errcheck      # エラー無視を検出
//     - govet         # 構造体タグ、Printf 等
//     - staticcheck   # SA: 非推奨 API、バグパターン
//     - gosimple      # S: 簡略化可能なコード
//     - unused        # U: 未使用の変数・関数
//     - ineffassign   # 無効な代入
//     - gocritic      # スタイル改善提案
//     - revive        # golint の後継
//
// run:
//   timeout: 5m  # CI でタイムアウトしない設定

// 実行
// golangci-lint run ./...
// golangci-lint run --fix ./...  // 自動修正

// CI (GitHub Actions)
// - uses: golangci/golangci-lint-action@v4
//   with:
//     version: latest

// go vet: 標準ツール（必ず実行）
// go vet ./...
// go vet -copylocks ./...  // Mutex のコピーを検出`,
    interviewPoints: [
      {
        point: "golangci-lint は 100+ の linter を統合。CI に必須",
        detail:
          "errcheck（エラー無視）、govet（構造体タグ・Printf）、staticcheck（非推奨 API・バグ）が最重要。golangci-lint run --fix で一部は自動修正可能。",
      },
      {
        point: "go vet は標準の静的解析ツール。go test 時にも自動実行される",
        detail:
          "copylocks（Mutex コピー）、printf（フォーマット不一致）、structtag（タグ形式）、unusedresult（結果未使用）等を検出。go test は内部的に go vet を実行する。",
      },
      {
        point: ".golangci.yml でプロジェクト固有の設定をチューニング",
        detail:
          "enable で有効にする linter を選択。issues.exclude-rules で false positive を除外。severity で重要度を設定。新規プロジェクトは厳格に、既存プロジェクトは段階的に導入。",
      },
    ],
    quizzes: [
      {
        code: "// golangci-lint の主要 linter\n// ____: エラーの無視を検出\n// ____: 標準の静的解析（Printf 等）\n// ____: 非推奨 API やバグパターンを検出",
        blanks: ["errcheck", "govet", "staticcheck"],
        explanation:
          "errcheck はエラー無視、govet は Printf やタグの問題、staticcheck は非推奨 API やバグパターンを検出する。3つとも必ず有効にする。",
      },
    ],
  },

  "tools-go-generate": {
    id: "tools-go-generate",
    section: "toolchain",
    title: "go generate とコード生成",
    tag: "標準",
    summary:
      "//go:generate ディレクティブでコード生成を自動化。stringer, mockgen, sqlc が代表例。",
    why: "ボイラープレートを自動生成することでヒューマンエラーを防ぎ、保守コストを下げる。",
    tradeoffs: [
      {
        title: "生成コード vs 手書き",
        desc: "生成コードは正確だが、ツール依存が増える。小規模なら手書きの方がシンプルな場合もある。",
      },
    ],
    badCode: `// 手書きの String() メソッド（enum が増えるたびに修正漏れ）
type Status int

const (
    StatusPending Status = iota
    StatusActive
    StatusClosed
)

func (s Status) String() string {
    switch s {
    case StatusPending: return "Pending"
    case StatusActive: return "Active"
    // StatusClosed を書き忘れ!
    default: return "unknown"
    }
}`,
    goodCode: `// go generate + stringer で自動生成
//go:generate stringer -type=Status

type Status int

const (
    StatusPending Status = iota
    StatusActive
    StatusClosed
)
// → status_string.go が自動生成される

// go generate + mockgen でモック自動生成
//go:generate mockgen -source=repository.go -destination=mock_repository.go -package=user

type UserRepository interface {
    FindByID(ctx context.Context, id string) (*User, error)
}

// go generate + sqlc で SQL → Go コード
// sqlc.yaml に SQL クエリを書くと型安全な Go コードが生成される

// 実行方法
// go generate ./...       // 全パッケージ
// go generate ./user/...  // 特定パッケージ`,
    interviewPoints: [
      {
        point: "//go:generate はコメントベースのコード生成ディレクティブ",
        detail:
          "go generate ./... で全ファイルの //go:generate コメントを実行。ビルド時には実行されないため、生成されたコードはリポジトリにコミットする。CI で go generate → diff チェックで生成漏れを検出。",
      },
      {
        point: "stringer はEnum の String() メソッドを自動生成する公式ツール",
        detail:
          "golang.org/x/tools/cmd/stringer。iota で定義した const に対して String() を生成。新しい値を追加しても自動で対応。fmt.Println(status) で人間可読な文字列が出力される。",
      },
      {
        point: "mockgen, sqlc, wire が実務で使われる主要な go generate ツール",
        detail:
          "mockgen: interface からモック生成。sqlc: SQL から型安全な Go コード。wire: DI のコード生成。いずれも //go:generate で統一的に管理できる。",
      },
    ],
    quizzes: [
      {
        code: "// コード生成ディレクティブ\n//____:____ stringer -type=Color\n\ntype Color int\n\nconst (\n    Red Color = ____\n    Green\n    Blue\n)",
        blanks: ["go", "generate", "iota"],
        explanation:
          "//go:generate でコード生成コマンドを指定。iota で連番の const を定義し、stringer で String() メソッドを自動生成する。",
      },
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
      "syntax-map",
      "syntax-generics",
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
      "design-graceful-shutdown",
      "design-middleware",
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
      "concurrency-sync",
      "concurrency-rate-limit",
    ],
  },
  {
    id: "performance",
    title: "パフォーマンス",
    icon: "⚡",
    description: "benchmark / pprof / memory",
    topicIds: ["perf-benchmark", "perf-pprof", "perf-memory", "perf-string"],
  },
  {
    id: "testing",
    title: "テスト",
    icon: "✓",
    description: "table-driven / mock / parallel",
    topicIds: ["test-table-driven", "test-mock", "test-helper"],
  },
  {
    id: "antipatterns",
    title: "アンチパターン",
    icon: "✗",
    description: "避けるべき書き方と正しい代替",
    topicIds: [
      "anti-error-ignore",
      "anti-global-state",
      "anti-panic",
      "anti-over-engineering",
    ],
  },
  {
    id: "interview",
    title: "面接対策",
    icon: "◎",
    description: "技術面接で話せるようにする",
    topicIds: ["interview-goroutine", "interview-gc", "interview-interface"],
  },
  {
    id: "toolchain",
    title: "ツールチェイン",
    icon: "⚙",
    description: "linter / go generate / 開発ツール",
    topicIds: ["tools-linter", "tools-go-generate"],
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
  { id: "syntax-generics", reason: "Go 1.18+ の型パラメータを使いこなす" },
  { id: "design-graceful-shutdown", reason: "本番運用に必須の安全な停止処理" },
  { id: "concurrency-sync", reason: "sync パッケージで競合を正しく防ぐ" },
  { id: "concurrency-rate-limit", reason: "流量制御で外部API障害を防ぐ" },
  { id: "tools-linter", reason: "golangci-lint でコード品質を自動担保" },
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
