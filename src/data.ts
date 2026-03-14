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

      {
        type: "concept" as const,
        code: "nil slice と empty slice の違いは何か？JSON marshal するとどう差が出るか？",
        blanks: ["nil slice → json: null", "empty slice → json: []"],
        explanation:
          "var s []int は nil slice（json.Marshal で null）。s := []int{} や make([]int, 0) は empty slice（json.Marshal で []）。len(s) はどちらも 0 で同じだが、json 出力の違いに注意。API レスポンスでは意図的に区別する。",
      },
      {
        type: "concept" as const,
        code: "append(s, v) が新しい配列を確保するのはどんな条件か？その瞬間に何が起きるか？",
        blanks: [
          "len == cap のとき",
          "新しいメモリを確保",
          "古い参照との共有が切れる",
        ],
        explanation:
          "slice の len が cap に達したとき、append は新しい backing array を確保してデータをコピーし、新しい slice header を返す。この瞬間、古い slice と新しい slice は別の配列を参照する。goroutine 間で slice を共有していると、append 後に古い参照が残るため data race が発生しうる。",
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
      {
        type: "concept" as const,
        code: "interface 変数どうしの == 比較で panic が起きるのはどんな場合か？",
        blanks: [
          "interface の動的型が比較不能（slice, map, func）な場合",
          "コンパイル時ではなく実行時に panic",
        ],
        explanation:
          "interface{} に slice や map を入れて == 比較すると runtime panic になる。比較するなら reflect.DeepEqual か、型アサーション後に比較する。",
      },
      {
        code: "type Stringer interface { String() string }\ntype MyStr string\nfunc (m ____) String() string { return string(m) }\n// T か *T どちらが Stringer を実装？",
        blanks: ["MyStr"],
        explanation:
          "value receiver で定義すると T（MyStr）と *T（*MyStr）の両方が interface を実装する。pointer receiver で定義した場合は *T のみ実装。",
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
      {
        code: "defer は ____ 順に実行される。ファイルを2つ開く場合 defer f1.Close() → defer f2.Close() の順に登録すると、実行は ____ → ____ の順",
        blanks: ["LIFO（後入れ先出し）", "f2.Close()", "f1.Close()"],
        explanation:
          "defer はスタック方式で積まれ、関数リターン時に逆順に実行される。リソースを取得した順に close するための自然な仕組み。",
      },
      {
        type: "concept" as const,
        code: "panic が発生した場合、その goroutine の defer は実行されるか？",
        blanks: [
          "実行される（goroutine のスタックを遡りながら全 defer が実行）",
          "recover() を defer 内で呼ぶと panic を捕捉できる",
        ],
        explanation:
          "panic 時も defer は確実に実行される。recover() は defer 内でのみ有効で、HTTP サーバーでの panic 回復に使われる。ただし panic を隠蔽するのは危険で、必要な場合のみ使う。",
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
      {
        type: "concept" as const,
        code: "同一型のメソッドで value receiver と pointer receiver を混在させてはいけない主な理由は？",
        blanks: [
          "interface 実装の一貫性が失われる（T は全 value receiver メソッドのみ持つ）",
          "vet や linter が警告する",
        ],
        explanation:
          "混在させると *T は全メソッドを持つが T は value receiver メソッドのみを実装する。interface 変数に T 値を代入したとき一部メソッドが使えなくなる。ルール：状態変更が1つでもあれば全部 pointer receiver で統一。",
      },
      {
        code: "// 大きな struct で value receiver を使うと何が問題か？\ntype BigStruct struct { data [1024]byte }\nfunc (b ____) Process() {} // NG\nfunc (b ____) Process() {} // OK",
        blanks: ["BigStruct", "*BigStruct"],
        explanation:
          "value receiver は struct 全体のコピーが発生する。[1024]byte なら毎回 1KB のコピー。pointer receiver なら 8 バイトのポインタのみ渡す。大きな struct は常に pointer receiver を選ぶ。",
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
        type: "text" as const,
        code: "Go ではエラーを ____ で返すのが基本。エラーに文脈を付加するには fmt.Errorf の ____ 動詞を使う。定数エラーの判定には ____ を、型の取り出しには ____ を使う",
        blanks: ["戻り値", "%w", "errors.Is", "errors.As"],
        explanation:
          "Go は例外ではなく戻り値でエラーを返す。%w でラップすると errors.Unwrap が機能し、errors.Is/As でチェーンを辿れる。%v だとラップされないため errors.Is/As が効かない。",
      },
      {
        type: "concept" as const,
        code: "errors.Is と errors.As の違いは何か？それぞれどんな場面で使うか？",
        blanks: [
          "errors.Is = sentinel の値比較",
          "errors.As = カスタム型の取得",
        ],
        explanation:
          "errors.Is(err, target) はラップされたエラーチェーンを辿って target と同値か判定。errors.As(err, &target) は型アサーションのラップ版で、チェーンから特定の型を取り出す。sentinel error（var ErrNotFound = errors.New(...)）なら Is、フィールドを持つカスタムエラー型なら As を使う。",
      },
      {
        type: "concept" as const,
        code: "fmt.Errorf の %v と %w でラップした場合の決定的な違いは何か？",
        blanks: [
          "%v = Unwrap できない",
          "%w = Unwrap 可能（errors.Is/As が効く）",
        ],
        explanation:
          "%w でラップすると errors.Unwrap が機能し、errors.Is/As でチェーンを辿れる。%v は単なる文字列フォーマットで、ラップされたエラーは取り出せない。コンテキストを付加しつつ元のエラー判定も残したいなら %w を使う。",
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
        type: "text" as const,
        code: "context は関数の ____ として渡す慣習がある。context を ____ のフィールドに保存してはいけない。キャンセル伝播には ____ を、タイムアウトには ____ を使う",
        blanks: [
          "第一引数",
          "struct",
          "context.WithCancel",
          "context.WithTimeout",
        ],
        explanation:
          "context はリクエストスコープの短命オブジェクト。struct に保存するとライフタイムが乖離しキャンセルが正しく伝播しない。WithCancel は手動キャンセル用、WithTimeout は時間制限用。",
      },
      {
        type: "concept" as const,
        code: "context を struct のフィールドに保存してはいけない理由は何か？",
        blanks: [
          "リクエストスコープの短命オブジェクト",
          "関数の第一引数として渡す",
        ],
        explanation:
          "context はリクエスト単位の短命オブジェクト。struct に保存するとオブジェクトのライフタイムと乖離し、キャンセルシグナルが正しく伝播しなくなる。Go の慣習は『context は関数の第一引数として渡す』。context.Background() を struct に保存するのはパターンとしてNG。",
      },
      {
        type: "concept" as const,
        code: "context.WithValue を使う際の注意点は何か？どんな情報を入れるべきか？",
        blanks: ["key は非公開型を使う", "リクエストスコープの横断的情報のみ"],
        explanation:
          "key に string などの公開型を使うと別パッケージと衝突する。非公開の独自型（type ctxKey struct{}）を key に使う。値はリクエスト ID、トレース ID、認証情報など横断的な情報のみ。ビジネスロジックのデータを context に入れると関数シグネチャが不透明になる。",
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
        type: "text" as const,
        code: "Go の interface は ____ に満たされる（implements 宣言不要）。interface は ____ 側で定義し、____ メソッド程度の小さいものが推奨される",
        blanks: ["暗黙的", "消費者（利用）", "1〜2"],
        explanation:
          "Go では型が interface のメソッドセットを持っていれば自動的に満たされる。Accept interfaces, return structs の原則で、利用側が必要なメソッドだけの interface を定義する。io.Reader, io.Writer が典型例。",
      },
      {
        type: "concept" as const,
        code: "Go で interface を実装側ではなく利用側（消費者側）で定義すべき理由は何か？",
        blanks: ["最小依存", "必要なメソッドのみ", "後付けで定義可能"],
        explanation:
          "実装側が大きな interface を定義すると、利用側は使わないメソッドへも依存する。消費者側定義では必要なメソッドのみを含む最小の interface を定義できる。Go の暗黙的実装により、後から interface を定義しても既存コードを変更しなくて済む（Accept interfaces, return structs）。",
      },
      {
        type: "concept" as const,
        code: "interface 変数が nil かどうかを判定するときのトラップは何か？",
        blanks: [
          "interface は (型, 値) のペア",
          "型情報があると nil でも != nil になる",
        ],
        explanation:
          "interface の内部は (type, value) の2フィールド。var p *MyError = nil を interface error に代入すると、型情報が入っているため err != nil が true になる。この現象を避けるには具体型変数を経由せず、interface 型で直接 nil を返す。",
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
        type: "text" as const,
        code: "Go のパッケージで ____ で始まる名前はエクスポートされ、____ で始まる名前は非公開になる。公開範囲をさらに制限するには ____ ディレクトリを使う",
        blanks: ["大文字", "小文字", "internal/"],
        explanation:
          "Go の可視性は名前の先頭文字で決まる。internal/ ディレクトリ配下のパッケージは親ディレクトリのツリー内からしかインポートできない。",
      },
      {
        code: "循環 import を解消する典型的な方法は、____ でありパッケージ間の依存を ____ させる",
        blanks: ["interface を定義したパッケージを切り出す", "逆転（DIP）"],
        explanation:
          "A→B→A の循環は、A が interface を定義し B がそれを実装することで A→interface、B→interface（または B implements interface）に変換できる。pkg/types や domain パッケージを中間レイヤーに置くのが実務パターン。",
      },
      {
        type: "concept" as const,
        code: "Go でパッケージ名のベストプラクティスを3つ挙げよ",
        blanks: [
          "短い単数名詞を使う（user, order, payment）",
          "util/common/base/shared などの汎用名を避ける",
          "パッケージ内の型がパッケージ名を繰り返さないようにする（user.User ○、user.UserService ×）",
        ],
        explanation:
          "Go では user.User のように package名.型名 でアクセスするため、UserService より Service の方が user.Service として自然に読める。util パッケージは何でも入るブラックボックスになりやすいので機能別に分割する。",
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
        type: "text" as const,
        code: "goroutine は初期スタック ____ で起動でき、OS スレッドより圧倒的に軽量。channel はデフォルトで ____ で送受信が同期する。channel を閉じるのは ____ 側の責務である",
        blanks: ["2KB", "unbuffered（バッファなし）", "送信"],
        explanation:
          "goroutine は 2KB の初期スタックで起動し動的に成長する。unbuffered channel は送受信が同時に成立しなければブロックする。close は送信側が行い、受信側は range で自然に終了を検知する。",
      },
      {
        type: "concept" as const,
        code: "goroutine リークとはどんな状態か？代表的な発生原因を2つ挙げよ",
        blanks: [
          "終了しない goroutine がリソースを消費し続ける",
          "channel 未 close",
          "context キャンセル未伝播",
        ],
        explanation:
          "goroutine が終了せずにスタックやヒープを消費し続ける状態。原因1: channel の送受信でブロックしたまま close されない。原因2: context のキャンセルシグナルを監視していない（select で ctx.Done() を受け取っていない）。runtime.NumGoroutine() や pprof の goroutine プロファイルで検出。",
      },
      {
        type: "concept" as const,
        code: "buffered channel と unbuffered channel の使い分けは？それぞれの意味的な違いは？",
        blanks: [
          "unbuffered = 同期通信（ランデブー）",
          "buffered = 非同期、キューとして機能",
        ],
        explanation:
          "unbuffered channel (make(chan T)) は送信と受信が同時に成立しなければブロックする（ランデブー）。goroutine 間の同期に使う。buffered channel (make(chan T, n)) はバッファが満杯になるまで非同期に送信できる。キュー、セマフォ、スループット向上に使う。",
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
        type: "text" as const,
        code: "Worker Pool は ____ 数の goroutine が ____ からタスクを取り出して処理するパターン。goroutine の完了待ちには ____ を使う",
        blanks: ["固定", "channel", "sync.WaitGroup"],
        explanation:
          "Worker Pool は goroutine の無制限生成を防ぎリソース消費を制御する。job channel からタスクを取り出し、sync.WaitGroup の Add/Done/Wait で完了を同期する。",
      },
      {
        type: "concept" as const,
        code: "goroutine を無制限に起動した場合に起こる問題点を挙げよ",
        blanks: [
          "メモリ枯渇",
          "スケジューリング overhead",
          "外部 API への過負荷",
        ],
        explanation:
          "goroutine は初期スタック 2KB だが成長する。10万 goroutine でギガバイト単位になりうる。スケジューラの context switch コストも増加。外部 API に向けた goroutine なら rate limit 超過やコネクション枯渇が起きる。Worker Pool パターンで上限を固定し制御する。",
      },
      {
        code: "Worker Pool の job channel を ____ channel にすると、pool が満杯でも送り側がブロックせず即座に返る。pool のサイズは一般的に ____ の数に合わせる",
        blanks: ["バッファ付き（buffered）", "CPU コア"],
        explanation:
          "バッファ付きチャネルはプロデューサーとコンシューマーの速度差を吸収するバッファリング層。CPU バウンドな処理は GOMAXPROCS（コア数）と同数のワーカーが最適。IO バウンドな処理はコア数の数倍のワーカーを設定できる（IO 待ちの間に他の goroutine が動くため）。",
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
        type: "text" as const,
        code: "goroutine リークの主な原因は channel の ____ と context の ____。検出には ____ や pprof の goroutine プロファイルを使う",
        blanks: [
          "未 close（ブロック）",
          "キャンセル未伝播",
          "runtime.NumGoroutine()",
        ],
        explanation:
          "channel の送受信でブロックしたまま close されない、context の Done() を select で監視していないのが主な原因。runtime.NumGoroutine() で goroutine 数を監視し、増加し続けていればリークの可能性がある。",
      },
      {
        code: "goroutine からの送信を select で安全にする:\nselect {\ncase ch <- result:\ncase ____:\n    return\n}",
        blanks: ["<-ctx.Done()"],
        explanation:
          "context がキャンセルされたら送信を諦めて goroutine を終了する。これにより ch が受信されない場合に goroutine が永遠にブロックするリークを防ぐ。",
      },
      {
        type: "concept" as const,
        code: "goroutine リークをテストで自動検出するためのベストプラクティスは？",
        blanks: [
          "uber-go/goleak を使い TestMain で goleak.VerifyTestMain(m) を呼ぶ",
          "各テストで defer goleak.VerifyNone(t) を追加する",
        ],
        explanation:
          "goleak はテスト開始時の goroutine 数を記録し、終了時に増加した goroutine がないか検証する。CI に組み込むことでリークを早期発見できる。",
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
        type: "text" as const,
        code: "Go のベンチマーク関数は ____ を引数に取り、関数名は ____ で始める。ループは ____ 回実行され、アロケーション計測には ____ を使う",
        blanks: ["*testing.B", "Benchmark", "b.N", "b.ReportAllocs()"],
        explanation:
          "testing.B で定義し go test -bench で実行。ランタイムが b.N を自動調整して安定した計測を行う。b.ReportAllocs() でヒープアロケーション数を表示し、ゼロアロケーション最適化を確認できる。",
      },
      {
        type: "concept" as const,
        code: "Go のベンチマークで b.ResetTimer() と b.ReportAllocs() はそれぞれ何のために使うか？",
        blanks: [
          "b.ResetTimer = セットアップ時間を除外",
          "b.ReportAllocs = アロケーション数を表示",
        ],
        explanation:
          "b.ResetTimer() はベンチマーク関数内のセットアップコード（DB接続、データ準備等）の時間をタイマーから除外する。b.ReportAllocs() はヒープアロケーション数とバイト数を -benchmem 相当で出力。ゼロアロケーション最適化の確認に使う。",
      },
      {
        code: "go test -bench=. -benchtime=____ で5秒間ベンチマークを実行。複数の実装を比較するには ____ ツールを使う",
        blanks: ["5s", "benchstat"],
        explanation:
          "benchstat は複数のベンチマーク結果を統計的に比較し、改善率と信頼区間を表示するツール。使い方: go test -bench=. -count=10 > old.txt && (変更後) go test -bench=. -count=10 > new.txt && benchstat old.txt new.txt。-count=10 で測定を繰り返し統計的信頼性を高める。",
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
        type: "text" as const,
        code: "pprof は Go 標準のプロファイリングツールで、____ プロファイルと ____ プロファイルが最も重要。HTTP サーバーに ____ をインポートするだけでエンドポイントが追加される",
        blanks: ["CPU", "ヒープ（メモリ）", "net/http/pprof"],
        explanation:
          "CPU プロファイルはどの関数が CPU 時間を消費しているか、ヒーププロファイルはどこでメモリを確保しているかを特定する。net/http/pprof を _ import するだけで /debug/pprof/ エンドポイントが追加される。",
      },
      {
        type: "concept" as const,
        code: "pprof の CPU プロファイルとヒーププロファイルはそれぞれ何を調べるためのものか？",
        blanks: [
          "CPU = 処理時間のホットパス",
          "ヒープ = メモリ割り当てと GC 負荷",
        ],
        explanation:
          "CPU プロファイルはどの関数がCPU時間を消費しているかを特定（ホットパスの最適化）。ヒーププロファイルはどこでメモリを確保しているか（GC 負荷の原因）を特定。goroutine プロファイルはデッドロックやリークの調査に使う。go tool pprof でフレームグラフを確認。",
      },
      {
        code: "go tool pprof を Web UI で起動するには: go tool pprof -http=____ profile.out。フレームグラフで ____ が広いほど CPU 消費が多く、最適化対象となる",
        blanks: [":8080（任意のポート）", "幅（横幅）"],
        explanation:
          "go tool pprof -http=:8080 でブラウザ上でフレームグラフ・ソースビュー・グラフビューを切り替えながら分析できる。top コマンドは CPU 消費上位の関数を表示。weblist コマンドはアノテーション付きのソースコードを表示し、どの行がCPUを消費しているか一目瞭然。",
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
        type: "text" as const,
        code: "Go のコンパイラは ____ 解析でローカル変数をスタックかヒープに配置する。ヒープ割り当てを減らすには ____ でオブジェクトを再利用し、確認には ____ フラグを使う",
        blanks: ["エスケープ", "sync.Pool", "-gcflags='-m'"],
        explanation:
          "エスケープ解析で関数外に参照が渡る変数はヒープに配置される。sync.Pool で GC 間でオブジェクトを再利用してヒープ割り当てを削減。go build -gcflags='-m' でどの変数がヒープに逃げたか確認できる。",
      },
      {
        code: "string 連結を大量に行う場合、____ を使うと O(n^2) のアロケーションを O(n) に改善できる。事前に書き込み量がわかる場合は ____ で容量を確保する",
        blanks: ["strings.Builder", "b.Grow(size)"],
        explanation:
          "s += other は毎回新しい文字列を確保するため O(n^2)。strings.Builder は内部 []byte に追記しループ後に一度 String() する。Grow() で事前に容量確保するとリアロケーションを最小化できる。",
      },
      {
        type: "concept" as const,
        code: "sync.Pool のオブジェクトはいつ回収されるか？どのような用途に適しているか？",
        blanks: [
          "GC のたびに回収される可能性がある（保持の保証なし）",
          "一時バッファ・JSON エンコーダ・bytes.Buffer など短命な使い捨てオブジェクトに適している",
        ],
        explanation:
          "sync.Pool は GC 間でのオブジェクト再利用によりアロケーション頻度を減らす。ただし GC のたびにクリアされる可能性があり、長期保存には使えない。Get() は nil を返す可能性があるので nil チェックが必要。",
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
        type: "text" as const,
        code: "table-driven test ではテストケースを ____ で定義し、____ でサブテスト化する。サブテストにすることで ____ の特定が容易になり、特定ケースだけの再実行も可能になる",
        blanks: ["スライス（構造体のスライス）", "t.Run", "失敗したケース"],
        explanation:
          "テストケースを []struct{name, input, want} のスライスで定義し、for range でループ。t.Run(name, func) でサブテスト化すると TestXxx/case_name と表示され、go test -run で特定ケースのみ実行できる。",
      },
      {
        type: "concept" as const,
        code: "table-driven test で t.Run を使ってサブテストにする利点は何か？",
        blanks: [
          "失敗したケースの特定が容易",
          "並行実行 (t.Parallel())",
          "特定ケースだけ再実行可能",
        ],
        explanation:
          "t.Run('case_name', func) でサブテストにすると、失敗時に 'TestXxx/case_name' と表示され問題のケースが即座に特定できる。go test -run TestXxx/specific_case で特定ケースのみ実行も可能。t.Parallel() でサブテストを並行実行しテスト時間を短縮できる。",
      },
      {
        code: "テストのカバレッジを確認するには go test -coverprofile=____ を使い、HTMLレポートは go tool cover -html=____ で生成する",
        blanks: ["cover.out", "cover.out"],
        explanation:
          "go test -coverprofile=cover.out ./... でプロジェクト全体のカバレッジを計測し、go tool cover -html=cover.out でブラウザで確認できる。緑: カバーされた行、赤: カバーされていない行。100%を目指す必要はないが、重要なビジネスロジックは80%以上が目安。",
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
        type: "text" as const,
        code: "Go のモックは ____ を使って依存を差し替える。interface は ____ 側で定義するのが原則で、テスト時にモック実装を ____ で渡す",
        blanks: ["interface", "消費者（利用）", "コンストラクタ引数"],
        explanation:
          "Go では interface を消費者側で定義し、テスト時にモック実装をコンストラクタ（New関数）に注入する。手書きモックはメソッドが少ない場合、mockgen は多数のメソッドや複雑な振る舞いの場合に使う。",
      },
      {
        type: "concept" as const,
        code: "Go でモックを作る2つのアプローチとそれぞれの使い分けは？",
        blanks: [
          "手書きモック = シンプルな interface",
          "mockgen = 多数のメソッド/複雑な振る舞い",
        ],
        explanation:
          "手書きモックは interface を実装した struct を手動で書く。メソッドが少ない interface には最もシンプル。mockgen（gomock）は interface から mock を自動生成し、メソッドの呼び出し回数・引数の検証（アサーション）ができる。10以上のメソッドや複数のモックが必要なら mockgen が効率的。",
      },
      {
        code: "httptest.NewRecorder() は ____ を実装した構造体で、HTTPハンドラのテストに使う。レスポンスのステータスコードは ____ で確認する",
        blanks: ["http.ResponseWriter", "recorder.Code"],
        explanation:
          "httptest.NewRecorder() を ResponseWriter として渡し、ハンドラを直接呼び出す。recorder.Code でステータスコード、recorder.Body.String() でレスポンスボディを確認できる。実際にサーバーを起動する httptest.NewServer より軽量で、単体テストに最適。",
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
        type: "text" as const,
        code: "Go でエラーを ____ で無視するのは危険。無視する場合はコメントで ____ を記述する。____ の errcheck linter で検出できる",
        blanks: ["_ (ブランク識別子)", "理由", "golangci-lint"],
        explanation:
          "_, err := f() の err を _ で無視するとサイレントな障害につながる。やむを得ず無視する場合は // intentionally ignored: reason とコメントする。golangci-lint の errcheck で未チェックのエラーを自動検出できる。",
      },
      {
        type: "concept" as const,
        code: "エラーを無視する _ の代わりにすべきことは何か？どんな場合でもエラーチェックは必要か？",
        blanks: [
          "基本は常にチェック",
          "無視する場合は // intentionally ignored",
          "defer の Close は特殊",
        ],
        explanation:
          "エラーを無視したい場合は必ず理由をコメントで記述する（// intentionally ignored: read-only, no state change）。defer f.Close() のエラーは書き込み後でないなら無視が許容されることもあるが、書き込んでいるなら Close のエラーを確認すべき。golangci-lint の errcheck で検出できる。",
      },
      {
        code: 'fmt.Fprintf(w, "...") のエラーを無視するのは ____ の場合は許容される。しかし os.File への Write エラーは必ず ____ すべき',
        blanks: [
          "http.ResponseWriter（TCP接続断でエラーが起きても対処不能）",
          "チェック（ディスク容量不足等の回復可能な原因があるため）",
        ],
        explanation:
          "すべてのエラーをチェックすべきだが、対処できないエラーは無視するより panic やログに留めるのが現実的。HTTPレスポンスへの書き込みエラーは接続が既に切れているためハンドリング不能。ファイル書き込みは失敗すると データ損失になるため必ずチェックが必要。",
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
        type: "text" as const,
        code: "グローバル変数は ____ を困難にし、____ の原因になる。代わりに ____ パターンで依存を渡すのが Go の標準",
        blanks: ["テスト", "data race", "依存性注入（DI）"],
        explanation:
          "グローバル変数はテスト時に差し替えができず、goroutine から同時アクセスされると data race になる。コンストラクタ引数で依存を注入し、struct に保持するのが Go の標準的な DI パターン。",
      },
      {
        type: "concept" as const,
        code: "Go テストで t.Parallel() を呼ぶとどうなるか？グローバル変数が存在する場合のリスクは？",
        blanks: [
          "サブテストを並列実行させる（他の Parallel テストと同時実行）",
          "グローバル変数に複数 goroutine が同時アクセスして data race が発生する",
        ],
        explanation:
          "t.Parallel() はテストの並列化を有効にする。グローバル DB や設定が存在するとレースコンディションになる。DI で各テストに独立した依存を渡すことで並列テストが安全になる。",
      },
      {
        code: "グローバル変数の代わりに ____ パターンで依存を注入する。テスト時は ____ に差し替え、本番では ____ 実装を使う",
        blanks: [
          "DI（Dependency Injection）",
          "モック実装（struct）",
          "real（本番）",
        ],
        explanation:
          "グローバル DB 接続を直接使う関数はテストから差し替えができない。代わりに interface を定義し、コンストラクタ（New関数）で依存を注入することでテスト可能性が上がる。また並行テストでグローバル状態の競合も防げる。",
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
        type: "text" as const,
        code: "Go で panic を使っていいのは ____ など本当に続行不能な場合のみ。通常のエラーは ____ で返す。ライブラリでは ____ panic してはいけない",
        blanks: ["初期化の失敗", "error 型の戻り値", "絶対に"],
        explanation:
          "panic は回復不能なランタイムエラー用。通常のエラー（入力エラー、DB エラー等）は error を返す。ライブラリで panic すると呼び出し元がリカバリできないため、必ず error を返す。",
      },
      {
        type: "concept" as const,
        code: "Go で panic を使っていい場面と使ってはいけない場面を説明せよ",
        blanks: [
          "良い = 初期化失敗・プログラム継続不可能",
          "NG = 通常のエラー処理",
        ],
        explanation:
          "panic が許容されるのは: ①プログラムの初期化で回復不能な状態（設定ファイルのパースエラー等）、②テストコードの must 関数。通常のエラー（入力値エラー、DB エラー、ネットワークエラー）は error として返す。library では絶対に panic しない（呼び出し元がリカバリできないため）。",
      },
      {
        code: "HTTP ハンドラ内で起動した goroutine が panic しても ____ がリカバリできない。goroutine の panic は ____ でリカバリする必要がある",
        blanks: [
          "net/http フレームワーク（ハンドラの外の recover は届かない）",
          "その goroutine 内の defer recover()",
        ],
        explanation:
          "net/http はハンドラの panic を recover して 500 を返すが、ハンドラ内で go func() { panic(...) }() を起動するとその goroutine の panic はプロセスをクラッシュさせる。バックグラウンド goroutine には必ず defer func() { if r := recover(); r != nil { ... } }() を先頭に書く。",
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
        type: "text" as const,
        code: "面接で goroutine の特徴を聞かれたら: 初期スタック ____, ____ スケジューリング、____ での通信、と答える",
        blanks: ["2KB", "M:N", "channel"],
        explanation:
          "goroutine は初期 2KB で動的成長、Go ランタイムによる M:N スケジューリング（goroutine を OS スレッドに多重化）、channel で goroutine 間を安全にデータ受け渡し。",
      },
      {
        type: "concept" as const,
        code: "面接で『goroutine と OS スレッドの違い』を問われたら何を答えるか？",
        blanks: [
          "スタックサイズ（2KB vs MB）",
          "M:N スケジューリング",
          "起動コスト極低",
        ],
        explanation:
          "①スタックサイズ: goroutine は初期 2KB で動的成長（OS スレッドは 1〜8MB 固定）。②スケジューリング: Go ランタイムが M:N スケジューリングで goroutine を OS スレッドに多重化（OS のプリエンプションに依存しない）。③起動コスト: goroutine の起動は数マイクロ秒、OS スレッドはミリ秒単位。④通信: channel で安全にデータ受け渡し。",
      },
      {
        code: "Go の GMP スケジューラで M は ____、G は ____、P は ____ を表す。GOMAXPROCS はデフォルトで ____ に設定される",
        blanks: [
          "OS スレッド（Machine）",
          "goroutine",
          "論理プロセッサ（Processor）",
          "CPU コア数",
        ],
        explanation:
          "GMP モデル: G（goroutine）はP（論理プロセッサ）に割り当てられ、PはM（OSスレッド）上で実行される。IO wait 時はPがMから外れ、別のGを実行できる。これにより少ないOSスレッドで大量のgoroutineを効率的にスケジュールできる。GOMAXPROCS=runtime.GOMAXPROCS(0) で現在の値を取得できる。",
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
        type: "text" as const,
        code: "Go の GC は ____ アルゴリズムを採用し、大部分は ____ と並行実行される。STW は ____ 以下に抑えられている",
        blanks: ["三色マーク＆スイープ", "アプリケーション", "数百マイクロ秒"],
        explanation:
          "白（未訪問）・灰色（訪問中）・黒（訪問済み）で到達可能性を判定。GC の大部分はアプリケーションと並行実行し STW（Stop The World）は極めて短い。",
      },
      {
        type: "concept" as const,
        code: "面接で『Go の GC はどのように動作するか』を問われたら何を答えるか？",
        blanks: ["三色マーク＆スイープ", "並行実行", "STW は最小化"],
        explanation:
          "Go は並行三色マーク＆スイープ GC を採用。白（未訪問）・灰色（訪問中）・黒（訪問済み）で到達可能性を判定。GC の大部分はアプリケーションと並行実行し STW（Stop The World）は数百マイクロ秒以下に抑える。Go 1.14 以降、プリエンプティブスケジューラで GC ループが詰まるバグも解消。",
      },
      {
        code: "GC 圧力を減らす主な手法を3つ挙げよ: 1.____ 2.____ 3.____",
        blanks: [
          "sync.Pool でオブジェクトを再利用",
          "スタック割り当てを増やす（小さな struct を値渡し）",
          "GOGC 環境変数で GC 頻度を調整（デフォルト100）",
        ],
        explanation:
          "GOGC=100 はヒープが前回 GC 後の2倍になったら GC を実行する。GOGC=200 にすると GC 頻度が下がり CPU コストは減るがメモリ使用量が増える。sync.Pool はリクエストごとに確保するバッファを再利用し GC 対象のオブジェクト数を減らす。pprof のヒーププロファイルでアロケーションのホットスポットを確認する。",
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
        type: "text" as const,
        code: "Go の interface の特徴は ____ 実装（implements 不要）、____ で定義するのが慣習、____ の原則に従う",
        blanks: ["暗黙的", "消費者側", "Accept interfaces, return structs"],
        explanation:
          "Go では型が interface のメソッドセットを実装していれば自動的に満たされる。利用側が必要なメソッドのみを interface に含め、実装側は具体型を返す。",
      },
      {
        type: "concept" as const,
        code: "「Accept interfaces, return structs」の原則を具体例で説明してください",
        blanks: [
          "引数に io.Writer を受け取ることで、os.File・bytes.Buffer・httptest.ResponseRecorder など任意の実装を受け入れられる",
          "戻り値は *JSONWriter（具体型）にすることで、呼び出し側が具体的なメソッドにアクセスでき、インターフェースに縛られない柔軟性を得る",
        ],
        explanation:
          "引数を interface にすると関数の汎用性が上がる（テスト時にモックを渡せる）。戻り値を interface にするとメソッド追加時に変更が波及するため、具体型で返して呼び出し側に判断を委ねる。",
      },
      {
        code: "Go の interface は ____ 実装（Structural subtyping）。Java のように ____ キーワードで実装を宣言する必要がない。これにより ____ の依存性を排除できる",
        blanks: [
          "暗黙的（implicit）",
          "implements",
          "パッケージ間（循環依存リスクを低減）",
        ],
        explanation:
          "暗黙的な interface 実装は Go の最もパワフルな機能の一つ。ライブラリの concrete 型を、ライブラリを変更せずに interface に適合させられる（レトロフィット）。例: sql.DB は io.Closer を暗黙的に実装しており、Close() を持つすべての型を同様に扱えるコードが書ける。",
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
        type: "text" as const,
        code: "Go らしいコードの3原則: ____ に書く（マジックを避ける）、エラーは ____ で返す、小さな ____ と struct の合成でシステムを組む",
        blanks: ["明示的", "戻り値", "interface"],
        explanation:
          "暗黙的な動作（フレームワークマジック）を避け、if err != nil で明示的にエラーを処理し、1〜2メソッドの小さな interface と struct の埋め込みでシステムを合成する。",
      },
      {
        type: "concept" as const,
        code: "「Clear is better than clever」を Go コードで体現する具体的な書き方を3つ挙げよ",
        blanks: [
          "エラーを _ で無視しない（if err != nil で毎回ハンドル）",
          "短い変数名より説明的な名前（x より userID）",
          "マジックナンバーより定数（3600 より time.Hour）",
        ],
        explanation:
          "Go はコードの読みやすさを最優先する言語。他の人が6ヶ月後に読んで理解できるコードを書くことを意識する。レビュアーへの思いやりが Goらしいコードの基本。",
      },
      {
        code: "Go の命名規則: エクスポートされる名前は ____、パッケージ名は ____、略語（URL, HTTP等）は ____",
        blanks: [
          "PascalCase（例: UserID）",
          "全て小文字・短く（例: http, sync）",
          "全て大文字（例: ServeHTTP, userID ではなく userURL）",
        ],
        explanation:
          "Go の命名は簡潔さを優先。ループ変数は i, j、エラーは err、コンテキストは ctx が慣用。パッケージ名はインポートパスの末尾と一致させる。略語の大文字化（URL→URL, HTTP→HTTP, ID→ID）は Go の公式スタイルガイドに従う。",
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
        type: "text" as const,
        code: "設計判断の基準: 実装が1つしかないなら ____ で十分。テストで差し替えたいなら ____ を定義。重複が3箇所未満なら ____ 原則でそのまま",
        blanks: ["具体型", "interface", "YAGNI"],
        explanation:
          "Go では必要になるまで抽象化しない。interface は後から追加できるため最初は具体型で書く。YAGNI = You Ain't Gonna Need It。3箇所以上の重複で関数に切り出す。",
      },
      {
        code: "channel と mutex の使い分け: データの ____ を移転するなら channel、____ を保護するなら mutex",
        blanks: ["所有権", "共有状態"],
        explanation:
          "Go のモットー「Don't communicate by sharing memory; share memory by communicating.」channel はデータの所有権を1つの goroutine から別の goroutine に移す。mutex は複数の goroutine が同じデータを安全に読み書きするための保護。カウンタや共有マップは mutex、ワークキューや完了通知は channel が自然。",
      },
      {
        type: "concept" as const,
        code: "interface を使うべき時と、使わなくて良い時の判断基準を教えてください",
        blanks: [
          "使うべき: テスト時に差し替える必要がある外部依存（DB、HTTP クライアント、時刻）",
          "使うべき: 複数の実装が存在する、または将来存在する可能性が高い場合",
          "不要: 実装が1つしかなく、テストでも差し替えない場合（YAGNI原則）",
        ],
        explanation:
          "「今必要かどうか」で判断する。最初から全てを interface にすると抽象化コストが増す。Go の公式ガイド: 「Don't design with interfaces, discover them.」具体的な実装を書いてから、共通化が必要になった時に interface を抽出するのが Go らしいアプローチ。",
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
        type: "text" as const,
        code: "Go の map は ____ で初期化が必須で、nil map への書き込みは ____ になる。map の iteration 順序は仕様で ____ であり、存在チェックには ____ パターンを使う",
        blanks: ["make", "panic", "不定（ランダム）", "v, ok := m[key]"],
        explanation:
          "var m map[string]int は nil map。read は zero value を返すが write は panic。Go ランタイムは iteration 順序を意図的にランダム化している。v, ok := m[key] の ok で存在を確認しないと zero value との区別ができない。",
      },
      {
        code: "goroutine 間で map を安全に共有するには ____ で保護するか ____ を使う。読み取りが圧倒的に多い場合は ____ の方が高スループット",
        blanks: ["sync.RWMutex", "sync.Map", "sync.RWMutex (RLock/RUnlock)"],
        explanation:
          "sync.Map は書き込みが少なく読み取りが多い場合に最適化されている。write が多い場合は RWMutex+map の方がシンプルかつ高速。Go 1.6 以降は concurrent write を自動検出してクラッシュする。",
      },
      {
        code: "map から安全に値を取得する: v, ____ := m[key]。ok が false の場合、v は ____ 。存在しないキーへのアクセスは ____ しない",
        blanks: ["ok", "ゼロ値", "panic"],
        explanation:
          'Go の map はカンマOKイディオムで存在確認できる。ok が false の場合 v はゼロ値（int なら 0、string なら ""、ポインタなら nil）。ただし nil map への書き込みはパニックするため、var m map[string]int ではなく m := map[string]int{} または make(map[string]int) で初期化する。',
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
        type: "text" as const,
        code: "Go の Generics は ____ 以上の型で同じロジックが現れたら導入を検討する。型パラメータの制約には ____ で underlying type を含む指定ができる。Go 1.21+ の ____ パッケージが Generics の標準的な活用例",
        blanks: ["3つ", "~（チルダ）", "slices / maps"],
        explanation:
          "YAGNI 原則で、最初は具体型で書き、重複が3箇所以上になったら Generics を導入。~int は int を underlying type に持つ全ての型を含む。slices.Sort, maps.Keys など標準ライブラリが Generics を活用している。",
      },
      {
        code: "func Map[T, U ____](s []T, f func(T) U) []U — この関数の型パラメータ制約は何か？なぜ comparable ではなく any か？",
        blanks: ["any"],
        explanation:
          "Map 関数は要素を変換するだけで比較しないため any 制約で十分。comparable が必要なのは == 演算子を使う場合（Filter で条件比較する場合でも predicate は func(T) bool で比較は外部に委譲するため any で OK）。",
        playgroundUrl: "https://go.dev/play/p/Oq9FY12AKCS",
      },
      {
        code: "Go 1.21 で追加された slices.Contains[S ~[]E, E comparable](s S, v E) は ____ を使って要素の存在確認をする。同様に maps.____ はマップのキーを slice で返す",
        blanks: ["線形探索（O(n)）", "Keys"],
        explanation:
          "Go 1.21 以降、標準ライブラリの slices/maps パッケージで Filter, Map, Contains, Keys, Values などの汎用関数が提供された。以前は golang.org/x/exp/slices や自前実装が必要だったが、標準化された。これらは generics で実装されており型安全。",
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
        type: "text" as const,
        code: "Graceful Shutdown では ____ でシグナルを受け取り、____ で猶予時間を設定し、サーバーの ____ メソッドで停止する",
        blanks: ["signal.NotifyContext", "context.WithTimeout", "Shutdown"],
        explanation:
          "signal.NotifyContext で SIGTERM/SIGINT を受け取ると context がキャンセルされる。context.WithTimeout で猶予時間（例: 30秒）を設定し、http.Server.Shutdown(ctx) で処理中のリクエスト完了を待って停止する。",
      },
      {
        type: "concept" as const,
        code: "K8s で Pod 削除時の流れと Graceful Shutdown の関係を説明してください",
        blanks: [
          "SIGTERM 送信 → terminationGracePeriodSeconds 待機 → SIGKILL",
          "アプリは SIGTERM で Shutdown() を呼び、処理中リクエスト完了を待つ",
          "readiness probe を先に fail にして LB からトラフィックを切ることで新規リクエストが来ない状態で停止",
        ],
        explanation:
          "K8s は SIGTERM→terminationGracePeriodSeconds（デフォルト30秒）→SIGKILL の順。アプリのシャットダウンタイムアウトを terminationGracePeriodSeconds より短くする（例: 25秒 vs 30秒）。preStop hook で readiness を fail にする preStop hook も有効。",
      },
      {
        code: "signal.NotifyContext(ctx, syscall.SIGTERM) でシグナルを受けると、返却された ctx の ____ が閉じる。この ctx を server.Shutdown(____)に渡すとグレースフルに停止する",
        blanks: ["Done() チャネル", "ctx（タイムアウト付きの ctx）"],
        explanation:
          "signal.NotifyContext は Go 1.16 で追加された便利な API。ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM); defer stop() でシグナル受信時に ctx をキャンセル。server.Shutdown に渡す ctx には別途タイムアウトを設定し（例: 25秒）、それを超えたら強制終了させる。",
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
        type: "text" as const,
        code: "Go の HTTP Middleware の標準的なシグネチャは ____。複数の middleware は ____ のように連鎖させる。典型的な用途は ____、ログ、リカバリ",
        blanks: [
          "func(http.Handler) http.Handler",
          "Chain(logging, auth, handler)",
          "認証",
        ],
        explanation:
          "func(next http.Handler) http.Handler で wrap して横断的関心事を追加する。外側から内側に向かって実行され、各 middleware が next.ServeHTTP を呼んで次に委譲する。",
      },
      {
        code: "Middleware で context にユーザー情報を渡すには:\n// 型安全なキー\ntype ____ struct{}\nctx = context.WithValue(r.Context(), ctxKey{}, user)\n// ハンドラで取得\nuser, _ := r.Context().Value(____{}).(*User)",
        blanks: ["ctxKey（非公開構造体型）", "ctxKey"],
        explanation:
          "非公開の構造体型をキーにすることで他パッケージとの衝突が防げる。string や int をキーにすると同じ文字列/数値を使う別パッケージと衝突する可能性がある。",
      },
      {
        code: "ミドルウェアチェーンの実行順序: chain(A, B, C)(handler) で実際のリクエスト処理順序は ____",
        blanks: ["A → B → C → handler → C終了 → B終了 → A終了（スタック順）"],
        explanation:
          "ミドルウェアはスタック構造で積まれる。chain(auth, logger, cors)(handler) の場合、auth が最初に実行され認証失敗なら後続をスキップ、認証成功なら logger, cors の順で実行されてハンドラに到達する。defer を使うと後処理が逆順になる（レスポンス処理に便利）。",
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
        type: "text" as const,
        code: "読み取りが多い場合は ____ でスループット向上。書き込みが多い場合は通常の ____ がシンプル。____ は一度だけ実行する初期化に使う",
        blanks: ["sync.RWMutex", "sync.Mutex", "sync.Once"],
        explanation:
          "RWMutex は RLock で複数の読み取りを並行許可。Mutex は排他的ロック。sync.Once は Do(func()) で1回だけ実行を保証し、シングルトン初期化やコネクションプール初期化に使う。",
      },
      {
        type: "concept" as const,
        code: "sync.Mutex と sync.RWMutex をどう使い分けるか？sync.Map が有効な場面は？",
        blanks: [
          "read 多い → RWMutex",
          "write 多い → Mutex",
          "sync.Map = key 安定 + read heavy",
        ],
        explanation:
          "RWMutex は読み取り並行を許可し read-heavy（80%以上）で高スループット。write-heavy なら通常 Mutex がシンプルで overhead 小。sync.Map は key セットが安定していて read が圧倒的多数のキャッシュに適する。通常の map + RWMutex の方がパフォーマンスが良いケースも多いので benchmark で比較。",
      },
      {
        code: "sync.Once の Do(f) は ____ 回だけ f を実行する。複数の goroutine が同時に Do を呼んでも f は ____ 実行される。シングルトン初期化に使う",
        blanks: ["1", "1回のみ"],
        explanation:
          "sync.Once は遅延初期化に使う定番パターン。var once sync.Once; once.Do(func() { db = connect() }) のように書くと、最初の呼び出しだけ接続処理が走り、以降はキャッシュされた値を使う。コンストラクタでの初期化が高コスト（DB接続等）な場合に特に有用。",
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
        type: "text" as const,
        code: "Go でレート制限を実装するには ____ パッケージの ____ アルゴリズムを使う。バースト量はバケットの ____ で決まる",
        blanks: ["golang.org/x/time/rate", "トークンバケット", "上限サイズ"],
        explanation:
          "rate.NewLimiter(rate, burst) でリミッターを作成。一定レートでトークンを補充し、リクエストはトークンを消費する。バーストサイズが瞬間的なアクセス集中の許容量を決める。",
      },
      {
        type: "concept" as const,
        code: "トークンバケットアルゴリズムとは何か？バースト制御が重要な理由は？",
        blanks: [
          "一定レートでトークンを補充",
          "バケット上限 = バースト量",
          "瞬間的な集中を許容",
        ],
        explanation:
          "トークンバケットは一定レートでトークンを生成し、リクエストはトークンを消費する。バケットに蓄積できる上限がバーストサイズ。瞬間的なアクセス集中を許容しつつ長期的なレートを制御できる。golang.org/x/time/rate.NewLimiter(rate, burst) で実装。",
      },
      {
        code: "rate.Limiter の Wait(ctx) は ____ が来るまでブロックし、Allow() は ____ せずにブロックする。API クライアントには ____ が適切",
        blanks: [
          "トークン",
          "ブロック（false を返す）",
          "Wait（次のトークンまで待機）",
        ],
        explanation:
          "Wait はトークンが利用可能になるまで待機するためリクエストを落とさない。Allow はすぐに bool を返すため、超過した場合は即座に 429 Too Many Requests を返すケースに使う。外部 API の呼び出し制御には Wait、受信リクエストのレート制限には Allow が適切。",
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
        type: "text" as const,
        code: "Go の string は ____ であり、ループ内での + 連結は毎回 ____ が発生する。効率的な連結には ____ を使う",
        blanks: ["不変（immutable）", "メモリコピー", "strings.Builder"],
        explanation:
          "string は不変なので + で連結するたびに新しいメモリが確保されコピーが発生する。strings.Builder は内部で []byte バッファを使い、最後に String() で1回だけ string に変換する。",
      },
      {
        code: 'ベンチマークで string 連結の性能を比較する方法:\nfunc BenchmarkPlus(b *testing.B) {\n    s := ""\n    for i := 0; i < ____; i++ { s += "x" }\n}\nfunc BenchmarkBuilder(b *testing.B) {\n    var sb strings.Builder\n    for i := 0; i < ____; i++ { sb.WriteString("x") }\n}',
        blanks: ["b.N", "b.N"],
        explanation:
          "ベンチマーク関数は b.N 回ループするだけでよい。go test -bench=. -benchmem で ns/op と B/op（メモリ）を比較。strings.Builder は string + に比べて数倍〜数十倍高速で、メモリ確保回数も O(1) まで削減できる。",
        playgroundUrl: "https://go.dev/play/p/qjGPm9E2mEK",
      },
      {
        code: "byte スライスを string に変換する []byte → string は ____ を伴う。ゼロコピー変換には unsafe.Pointer を使う方法があるが、変換後に元スライスを変更すると ____",
        blanks: [
          "メモリコピー（ヒープアロケーション）",
          "文字列の不変性が壊れる（undefined behavior）",
        ],
        explanation:
          "string は Go で不変（immutable）なため、[]byte からの通常変換はコピーが必要。ホットパスでの変換コストを避けたい場合は strings.Builder や []byte のまま処理するよう設計し直すか、unsafe を慎重に使う。Go 1.20 で unsafe.SliceData/StringData が追加され、より安全な変換が可能になった。",
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
        type: "text" as const,
        code: "テストヘルパー関数では ____ を呼ぶことで、失敗時のスタックトレースからヘルパーを除外できる。testify の ____ は失敗で即停止、____ は続行する",
        blanks: ["t.Helper()", "require", "assert"],
        explanation:
          "t.Helper() を呼ぶとテスト失敗時に実際のテストコードの行番号が報告される。testify の require は失敗で即 t.FailNow()、assert は t.Fail() で後続も実行。前提条件は require、個別検証は assert が使い分けの目安。",
      },
      {
        code: "t.____(func() { db.Close() }) はテスト終了時に自動実行。t.Run でサブテストを作成すると ____ のクリーンアップは親テスト終了まで遅延する",
        blanks: ["Cleanup", "子テスト（subtest）"],
        explanation:
          "t.Cleanup は LIFO 順で実行。サブテストが終わっても親の Cleanup はサブテスト全て完了後に実行される。テスト DBの接続やファイルのクローズに defer より Cleanup を使う方が確実。",
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
        type: "text" as const,
        code: "YAGNI 原則は「____」。Go では interface を実装が ____ しかない段階で切るのは過剰。重複が ____ 箇所未満ならコピーの方がシンプル",
        blanks: ["今必要ないものは作るな", "1つ", "3"],
        explanation:
          "You Ain't Gonna Need It. Go は explicit を重視し、必要になるまで抽象化しない。interface は後から追加できるため、最初は具体型で書く。3箇所以上の重複で初めて関数やinterface の抽出を検討する。",
      },
      {
        type: "concept" as const,
        code: "設計がシンプルかどうか判断する実践的な問いかけを3つ挙げよ",
        blanks: [
          "この抽象化は今すぐ必要か、それとも将来必要になりそうなだけか？",
          "このコードを6ヶ月後の自分（または他人）が即座に理解できるか？",
          "テストが書きにくいなら、設計が複雑すぎるサインではないか？",
        ],
        explanation:
          "過剰設計は意図は良いが結果として保守性を下げる。「今の問題を解く」にフォーカスし、拡張は必要になったタイミングで。Go のシンプルさの哲学を実践することが最高の設計判断。",
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
        type: "text" as const,
        code: "golangci-lint の最重要 linter は3つ: ____ (エラー無視)、____ (構造体タグ・Printf)、____ (非推奨 API・バグ)",
        blanks: ["errcheck", "govet", "staticcheck"],
        explanation:
          "errcheck はエラー無視、govet は Printf やタグの問題、staticcheck は非推奨 API やバグパターンを検出する。3つとも必ず有効にする。",
      },
      {
        code: "go vet が検出できる問題を3つ挙げよ:\n// 1. sync.Mutex をコピー → ____\n// 2. Printf の引数不一致 → ____\n// 3. unreachable code → ____",
        blanks: [
          "copylocks: Mutex はアドレスで使うべき（コピー禁止）",
          "printf: フォーマット文字列と引数の型が不一致",
          "unreachable: return の後のコードを検出",
        ],
        explanation:
          "go vet は go test 実行時に自動的に走る。Mutex のコピーは並行処理バグの典型。printf の引数不一致は実行時にしか気づきにくいバグ。go vet でこれらをコンパイル時に検出できる。",
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
        type: "text" as const,
        code: "//go:generate は ____ ベースのコード生成ディレクティブ。代表ツールは ____ (enum の String())、____ (interface のモック生成)、____ (SQL → Go コード)",
        blanks: ["コメント", "stringer", "mockgen", "sqlc"],
        explanation:
          "//go:generate コメントで go generate ./... 実行時にツールが起動。生成コードはリポジトリにコミットするのが慣習。CI で go generate → diff チェックで生成漏れを検出。",
      },
      {
        type: "concept" as const,
        code: "sqlc を使う利点と go:generate との組み合わせを説明してください",
        blanks: [
          "SQL クエリを .sql ファイルで定義し、型安全な Go のインターフェースと実装コードを自動生成",
          "手書きの sql.Scan / db.QueryRow を排除し、型ミスをコンパイル時に検出",
          "//go:generate sqlc generate で生成を自動化し、CI で生成漏れを検出",
        ],
        explanation:
          "sqlc は SQL First のアプローチ。ORM と違いSQLの制御が完全で、パフォーマンスチューニングも容易。query.sql を編集→生成→型チェックの流れでDB層を安全に管理できる。",
      },
    ],
  },

  // ── 基本文法（追加2） ──────────────────────────────────

  "syntax-struct-embedding": {
    id: "syntax-struct-embedding",
    section: "syntax",
    title: "struct の埋め込みと合成",
    tag: "設計",
    summary:
      "Go には継承がない。struct の埋め込み（embedding）でメソッドを昇格させ、合成（composition）で設計する。",
    why: "Java/C# の継承ツリーを Go に持ち込むと破綻する。Go は is-a ではなく has-a で考え、interface + embedding で柔軟に合成する。",
    tradeoffs: [
      {
        title: "埋め込み vs 明示的フィールド",
        desc: "埋め込みはメソッド昇格で便利だが、どのメソッドが使えるか見えにくくなる。API境界では明示的フィールド + 委譲が安全。",
      },
    ],
    badCode: `// 擬似継承（Java脳）
type Animal struct {
    Name string
}
func (a *Animal) Speak() string { return "..." }

type Dog struct {
    Animal  // 埋め込みで「継承」のつもり
}
// Dog.Speak() は Animal.Speak() を呼ぶだけ
// オーバーライドしても Animal のメソッド内からは呼ばれない

// interface を embed しすぎる
type HugeService interface {
    UserRepo
    OrderRepo
    PaymentRepo
    NotificationService
    // → 何でもできるモンスターinterface
}`,
    goodCode: `// Go らしい合成
type Logger struct{ w io.Writer }
func (l *Logger) Log(msg string) { fmt.Fprintln(l.w, msg) }

type Server struct {
    Logger  // メソッド昇格: Server.Log() が使える
    db  *sql.DB
    mux *http.ServeMux
}

// メソッドのオーバーライド（シャドウイング）
func (s *Server) Log(msg string) {
    s.Logger.Log("[SERVER] " + msg)  // 明示的に親を呼ぶ
}

// interface の合成（小さく保つ）
type Reader interface { Read(p []byte) (n int, err error) }
type Writer interface { Write(p []byte) (n int, err error) }
type ReadWriter interface {
    Reader
    Writer
}

// 必要な interface だけ受け取る
func process(r io.Reader) error { /* ... */ }`,
    interviewPoints: [
      {
        point:
          "Go の埋め込みは継承ではなく合成（has-a）。メソッド昇格で委譲を省略できる",
        detail:
          "埋め込んだ型のメソッドが外側の型に昇格する。ただし埋め込まれた型のメソッド内で this/self は埋め込まれた型を指す。ポリモーフィズムは interface で実現する。",
      },
      {
        point:
          "interface の埋め込みで小さな interface を合成する（io.ReadWriter パターン）",
        detail:
          "io.Reader + io.Writer = io.ReadWriter。大きな interface を最初から定義せず、小さな interface を組み合わせる。Go 標準ライブラリがこのパターンを多用している。",
      },
      {
        point: "メソッドのシャドウイングでオーバーライドに近い動作が可能",
        detail:
          "外側の型で同名メソッドを定義すると、埋め込まれた型のメソッドを隠す。ただし埋め込まれた型の他のメソッドからは元のメソッドが呼ばれる（仮想関数ではない）。",
      },
    ],
    quizzes: [
      {
        type: "text" as const,
        code: "Go の埋め込みは ____ ではなく ____ の関係。埋め込まれた型のメソッドは外側に ____ し、同名メソッドを定義すると ____ が起きる",
        blanks: ["is-a（継承）", "has-a（合成）", "昇格", "シャドウイング"],
        explanation:
          "struct に無名フィールドとして型を埋め込むと、そのメソッドが外側から直接呼べる。ただし埋め込まれた型の内部からは元のメソッドが呼ばれる（仮想関数ではない）。interface の埋め込みで小さな interface を合成するのも Go の定番。",
      },
      {
        code: 'type Animal struct { Name string }\nfunc (a Animal) Speak() string { return a.Name }\n\ntype Dog struct { ____ } // Animal を埋め込み\n\nd := Dog{Animal: Animal{"Rex"}}\nfmt.Println(d.____()) // Animal.Speak を直接呼べる',
        blanks: ["Animal", "Speak"],
        explanation:
          "struct に型名のみを書く（フィールド名なし）と埋め込みになる。埋め込まれた型のメソッドは外側の型から直接アクセスできる（メソッド昇格）。これが Go の composition の基本。",
      },
    ],
  },

  // ── 設計（追加2） ──────────────────────────────────────

  "design-functional-options": {
    id: "design-functional-options",
    section: "design",
    title: "Functional Options パターン",
    tag: "設計",
    summary:
      "可変長引数で設定を渡す Go のイディオム。API の後方互換を保ちつつ柔軟なオプション指定を可能にする。",
    why: "コンストラクタの引数が増えると可読性が低下し、デフォルト値の管理が困難になる。Functional Options は Go の可変長引数と関数型を活かした解決策。",
    tradeoffs: [
      {
        title: "Functional Options vs Config struct",
        desc: "Config struct はシンプルで JSON/YAML から直接マッピングできる。Functional Options はバリデーション内蔵・後方互換性に優れるが、オプションが少ない場合は過剰。",
      },
    ],
    badCode: `// 引数が増え続けるコンストラクタ
func NewServer(addr string, port int, timeout time.Duration,
    maxConns int, logger *log.Logger, tls bool) *Server {
    // ...
}

// 呼び出し側が意味不明
srv := NewServer("localhost", 8080, 30*time.Second, 100, nil, false)

// Config struct のゼロ値問題
type Config struct {
    Port    int    // 0 は未設定? それとも意図的?
    Timeout int    // 秒? ミリ秒?
}
srv := NewServer(Config{})  // 全部ゼロ値で起動`,
    goodCode: `// Functional Options パターン
type Server struct {
    addr    string
    port    int
    timeout time.Duration
    maxConn int
}

type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func WithTimeout(d time.Duration) Option {
    return func(s *Server) { s.timeout = d }
}

func WithMaxConn(n int) Option {
    return func(s *Server) { s.maxConn = n }
}

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{
        addr:    addr,
        port:    8080,          // デフォルト値
        timeout: 30 * time.Second,
        maxConn: 100,
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// 読みやすい呼び出し
srv := NewServer("localhost",
    WithPort(9090),
    WithTimeout(60 * time.Second),
)`,
    interviewPoints: [
      {
        point:
          "Functional Options は Go で最も一般的な設定パターン。grpc-go, zap 等が採用",
        detail:
          "Dave Cheney が提唱。type Option func(*T) の型定義と、With... のファクトリ関数で構成。新しいオプション追加が既存コードに影響しない（後方互換）。",
      },
      {
        point: "デフォルト値はコンストラクタ内で設定し、Option で上書きする",
        detail:
          "NewXxx 内で安全なデフォルト値を設定した後、opts をループで適用。バリデーションは Option 関数内または全 Option 適用後に行う。",
      },
      {
        point:
          "Config struct が適切な場合: 設定ファイルからの読み込みが主目的のとき",
        detail:
          "JSON/YAML/TOML からの設定読み込みには Config struct が自然。Functional Options はプログラマティックな API 設計向き。両方を組み合わせることも可能。",
      },
    ],
    quizzes: [
      {
        type: "text" as const,
        code: "Functional Options パターンでは ____ 型を定義し、____ 接頭辞のファクトリ関数を作る。コンストラクタでは ____ でオプションを適用する",
        blanks: ["type Option func(*T)", "With", "for ループ"],
        explanation:
          "type Option func(*Server) の型定義と WithPort, WithTimeout のファクトリ関数で構成。NewServer(addr, opts ...Option) の中で for _, opt := range opts { opt(s) } でオプションを適用する。",
      },
      {
        type: "concept" as const,
        code: "Functional Options パターンが Config struct より優れる点を3つ挙げよ",
        blanks: [
          "後方互換性",
          "デフォルト値の明示的設定",
          "バリデーション内蔵可能",
        ],
        explanation:
          "①後方互換性: 新しいオプションを追加しても既存の呼び出しコードが壊れない。②デフォルト値: コンストラクタ内で安全なデフォルトを設定し、Option で上書きする。③バリデーション: 各 Option 関数内でバリデーションを行える。Config struct は JSON/YAML からの読み込みには適しているが、Functional Options はプログラマティックな API に向く。",
      },
    ],
  },

  "design-di": {
    id: "design-di",
    section: "design",
    title: "依存性注入 (DI) の Go 流",
    tag: "設計",
    summary:
      "Go の DI はコンストラクタ引数で依存を渡すだけ。フレームワーク不要。interface で抽象化しテスト可能にする。",
    why: "DI フレームワーク（wire, fx）は大規模プロジェクトでは有用だが、Go では明示的なコンストラクタ注入が最も標準的で追いやすい。",
    tradeoffs: [
      {
        title: "手動 DI vs フレームワーク DI",
        desc: "手動は追いやすいが main の配線コードが長くなる。wire/fx は自動配線だが学習コストとマジック感がある。50+ の依存で検討。",
      },
    ],
    badCode: `// グローバル変数で依存を持つ（テスト不可能）
var db = connectDB()
var cache = connectRedis()

func GetUser(id string) (*User, error) {
    // db をグローバルから参照 → テストで差し替え不可
    return db.QueryUser(id)
}

// パッケージレベルの init() で初期化
func init() {
    db = mustConnectDB()  // テスト時にも実行される
}`,
    goodCode: `// コンストラクタで依存を注入（Go の標準的な DI）
type UserService struct {
    repo  UserRepository  // interface で受け取る
    cache Cache
}

// interface は消費者側で定義
type UserRepository interface {
    FindByID(ctx context.Context, id string) (*User, error)
}

func NewUserService(repo UserRepository, cache Cache) *UserService {
    return &UserService{repo: repo, cache: cache}
}

// main() で配線
func main() {
    db := connectDB()
    repo := postgres.NewUserRepo(db)
    cache := redis.NewCache(redisClient)
    svc := NewUserService(repo, cache)
    handler := NewUserHandler(svc)
    // ...
}

// テストでは mock を注入
func TestGetUser(t *testing.T) {
    mock := &mockUserRepo{user: testUser}
    svc := NewUserService(mock, noopCache)
    // ...
}`,
    interviewPoints: [
      {
        point:
          "Go の DI は「コンストラクタ引数で渡す」だけ。フレームワーク不要が基本",
        detail:
          "NewXxx(dep1, dep2) で依存を受け取り、struct に保持する。Go は暗黙的 interface 実装のおかげで、後から interface を定義してもコード変更が不要。",
      },
      {
        point:
          "interface は消費者側で定義する（Accept interfaces, return structs）",
        detail:
          "依存元（実装側）ではなく、依存先（利用側）が必要なメソッドだけの interface を定義する。これにより最小限の結合度になる。Go Proverb のひとつ。",
      },
      {
        point: "wire や fx は 50+ の依存がある大規模プロジェクトで検討",
        detail:
          "Google の wire はコード生成型、Uber の fx はリフレクション型。小〜中規模では手動 DI で十分。main.go の配線コードが 100行を超えたら導入を検討する目安。",
      },
    ],
    quizzes: [
      {
        type: "text" as const,
        code: "Go の DI は ____ で依存を渡すだけ。interface は ____ 側で定義する。フレームワーク (wire/fx) は ____ 以上の依存で検討する",
        blanks: ["コンストラクタ引数", "消費者（利用）", "50"],
        explanation:
          "NewXxx(dep1, dep2) で依存を受け取り struct に保持する。Go は暗黙的 interface 実装のおかげで後から interface を定義してもコード変更不要。小〜中規模では手動 DI で十分。",
      },
      {
        type: "concept" as const,
        code: "Go の DI で interface を使う利点は何か？また wire や fx を使うべき規模の目安は？",
        blanks: [
          "テストでモックに差し替え可能",
          "疎結合",
          "50+ の依存で wire/fx を検討",
        ],
        explanation:
          "interface で依存を抽象化すると、テスト時に mock を注入できる。Go の暗黙的実装により後から interface を定義しても既存コードに影響しない。wire（コード生成）や fx（リフレクション）は main の配線コードが 100行超、50以上の依存が生まれたら導入を検討する。",
      },
    ],
  },

  // ── 並行処理（追加2） ─────────────────────────────────

  "concurrency-pipeline": {
    id: "concurrency-pipeline",
    section: "concurrency",
    title: "Pipeline / Fan-out / Fan-in",
    tag: "設計",
    summary:
      "channel で処理ステージを繋ぐ Pipeline パターン。Fan-out で並列化し、Fan-in で集約する。",
    why: "データ処理パイプラインは ETL、ストリーム処理、画像処理で頻出。channel ベースの設計で各ステージを独立にスケール可能。",
    tradeoffs: [
      {
        title: "Pipeline vs 直列処理",
        desc: "Pipeline はステージごとに並行実行できるが複雑になる。I/O バウンドなら効果大。CPU バウンドかつ単純なら直列の方がシンプル。",
      },
      {
        title: "Fan-out の並列度",
        desc: "goroutine を増やしすぎると context switch とメモリが増加。CPU コア数や外部 API のレート制限に合わせて調整。",
      },
    ],
    badCode: `// 直列処理（I/O待ちが積み重なる）
func processAll(urls []string) []Result {
    var results []Result
    for _, url := range urls {
        data := fetch(url)        // 1つずつ待つ
        parsed := parse(data)     // 前の fetch が終わるまで idle
        result := transform(parsed)
        results = append(results, result)
    }
    return results  // 100 URL → 100 * latency
}

// goroutine 無制限生成
for _, url := range urls {
    go func(u string) {
        // 10万 URL → 10万 goroutine → OOM / rate limit
        results <- fetch(u)
    }(url)
}`,
    goodCode: `// Pipeline パターン
func gen(urls []string) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for _, u := range urls {
            out <- u
        }
    }()
    return out
}

func fetch(ctx context.Context, in <-chan string) <-chan Data {
    out := make(chan Data)
    go func() {
        defer close(out)
        for u := range in {
            data, err := httpGet(ctx, u)
            if err == nil { out <- data }
        }
    }()
    return out
}

// Fan-out: 複数の goroutine で並列処理
// Fan-in: 結果を1つの channel に集約
func fanOut(ctx context.Context, in <-chan string, n int) <-chan Data {
    var wg sync.WaitGroup
    merged := make(chan Data)

    for i := 0; i < n; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for u := range in {
                data, err := httpGet(ctx, u)
                if err == nil { merged <- data }
            }
        }()
    }

    go func() { wg.Wait(); close(merged) }()
    return merged
}

// 使用例
urls := gen(urlList)
results := fanOut(ctx, urls, 10)  // 10並列`,
    interviewPoints: [
      {
        point:
          "Pipeline は channel で処理ステージを接続。各ステージは独立した goroutine",
        detail:
          "gen() → stage1() → stage2() → consumer の形。各関数は <-chan T を受け取り <-chan U を返す。close で終了を伝播。context でキャンセルも可能。",
      },
      {
        point:
          "Fan-out は1つの channel を複数 goroutine で読む。Fan-in は複数 channel を1つに集約",
        detail:
          "Fan-out: N個の worker が同じ in channel から読む（channel は goroutine安全）。Fan-in: sync.WaitGroup で全 worker の完了を待ち merged channel を close する。",
      },
      {
        point: "Pipeline の終了は close の伝播と context キャンセルの2つで制御",
        detail:
          "正常終了: 上流の close が range で検知され下流に伝播。異常終了: context.Cancel() で全ステージが中断。defer close(out) で確実に channel を閉じる。",
      },
    ],
    quizzes: [
      {
        type: "text" as const,
        code: "Pipeline パターンでは各ステージを ____ で接続し、独立した ____ で動作させる。並列化には ____ パターンを使い、集約には ____ パターンを使う",
        blanks: ["channel", "goroutine", "Fan-out", "Fan-in"],
        explanation:
          "各関数が <-chan T を受け取り <-chan U を返す。Fan-out は1つの channel を複数 goroutine で読む。Fan-in は sync.WaitGroup で全 worker の完了を待ち merged channel を close する。",
      },
      {
        code: "Pipeline で上流の channel が close されたことを下流が検知するには:\nfor v := range ____ {\n    // v を処理\n    out <- transform(v)\n}\n// range が終わると out を ____ する",
        blanks: ["in（上流の channel）", "close"],
        explanation:
          "range は channel が close されると自動的にループを終了する。各ステージは入力 channel を range で読み、終わったら defer close(out) で出力 channel を close して下流に終了を伝播する。",
      },
    ],
  },

  // ── パフォーマンス（追加2） ─────────────────────────────

  "perf-gc-tuning": {
    id: "perf-gc-tuning",
    section: "performance",
    title: "GC チューニング (GOGC / GOMEMLIMIT)",
    tag: "最適化",
    summary:
      "Go の GC は並行マーク&スイープ。GOGC と GOMEMLIMIT で頻度とメモリ上限を制御する。",
    why: "デフォルト設定で十分な場合が多いが、低レイテンシ要求やメモリ制約のある環境では GC チューニングがスループットに直結する。",
    tradeoffs: [
      {
        title: "GOGC 高い vs 低い",
        desc: "高い（200+）= GC頻度下がりスループット向上、メモリ使用増。低い（50）= メモリ節約、CPU負荷増。",
      },
      {
        title: "GOMEMLIMIT の設定",
        desc: "コンテナのメモリ上限の 80-90% に設定。低すぎると GC thrashing、高すぎると OOM Kill。",
      },
    ],
    badCode: `// GC を意識しないコード（大量のヒープ割り当て）
func processRequests(reqs []Request) []Response {
    var responses []Response
    for _, req := range reqs {
        // 毎回新しいバッファを確保 → GC 負荷
        buf := make([]byte, 4096)
        result := process(req, buf)
        responses = append(responses, result)
    }
    return responses
}

// string と []byte の無駄な変換
func handler(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)    // []byte
    str := string(body)               // コピー発生
    data := []byte(str)               // また コピー
    json.Unmarshal(data, &req)
}`,
    goodCode: `// sync.Pool でバッファを再利用
var bufPool = sync.Pool{
    New: func() any { return make([]byte, 0, 4096) },
}

func processRequests(reqs []Request) []Response {
    responses := make([]Response, 0, len(reqs))
    for _, req := range reqs {
        buf := bufPool.Get().([]byte)
        buf = buf[:0]  // リセット
        result := process(req, buf)
        bufPool.Put(buf)
        responses = append(responses, result)
    }
    return responses
}

// 環境変数で GC チューニング
// GOGC=200        → GC 頻度を下げる（デフォルト100）
// GOMEMLIMIT=1GiB → メモリ上限を設定（Go 1.19+）
//
// Dockerfile:
// ENV GOGC=200
// ENV GOMEMLIMIT=1600MiB  # 2GiB コンテナの 80%
//
// runtime から動的に変更も可能
// debug.SetGCPercent(200)
// debug.SetMemoryLimit(1600 << 20)`,
    interviewPoints: [
      {
        point:
          "GOGC はヒープが前回 GC 後の N% 増えたら GC を実行する設定（デフォルト100）",
        detail:
          "GOGC=100 は前回GC後のライブヒープの 100% 増（2倍）で次のGCが走る。GOGC=200 なら 3倍まで許容。GOGC=off で GC を無効化（テスト用）。",
      },
      {
        point:
          "GOMEMLIMIT (Go 1.19+) でソフトメモリ上限を設定。コンテナ環境で必須",
        detail:
          "GOMEMLIMIT を設定すると、その上限に近づくと積極的に GC が走る。GOGC=off + GOMEMLIMIT で「メモリ上限までは GC しない」戦略も可能（バッチ処理向き）。",
      },
      {
        point: "sync.Pool でオブジェクトを再利用し GC 負荷を下げる",
        detail:
          "sync.Pool は GC 間でオブジェクトを保持する一時キャッシュ。[]byte バッファ、JSON エンコーダ、正規表現のマッチャーなど高頻度で生成・破棄するものに有効。",
      },
    ],
    quizzes: [
      {
        type: "text" as const,
        code: "GOGC のデフォルト値は ____ で、ヒープが前回 GC 後の ____倍 になると GC が走る。Go 1.19+ の ____ でソフトメモリ上限を設定できる",
        blanks: ["100", "2", "GOMEMLIMIT"],
        explanation:
          "GOGC=100 はヒープが 2倍になると GC。GOGC=200 なら 3倍まで許容でスループット向上するがメモリ消費増。GOMEMLIMIT はコンテナのメモリ上限の 80-90% に設定するのが目安。",
      },
      {
        type: "concept" as const,
        code: "GOGC=200 に設定した場合、デフォルト(100)と比べてどう変わるか？メリット・デメリットは？",
        blanks: ["GC 頻度が下がる", "スループット向上", "メモリ使用量が増加"],
        explanation:
          "GOGC=100 はヒープが前回 GC 後の 2倍で次の GC が走る。GOGC=200 は 3倍になるまで待つ。GC の CPU 消費が減りスループットが向上するが、ヒープが大きくなる。コンテナ環境では GOMEMLIMIT と組み合わせてメモリ上限を設定する。",
      },
    ],
  },

  // ── テスト（追加2） ───────────────────────────────────

  "test-fuzzing": {
    id: "test-fuzzing",
    section: "testing",
    title: "Fuzzing テスト (Go 1.18+)",
    tag: "計測",
    summary:
      "ランダムな入力を自動生成してバグを発見する Fuzz テスト。Go 1.18 で標準ライブラリに統合。",
    why: "手動テストでは思いつかないエッジケース（不正UTF-8、巨大入力、空文字列）を自動で発見できる。パーサーやバリデータに特に有効。",
    tradeoffs: [
      {
        title: "Fuzz テストの実行時間",
        desc: "デフォルトは無制限に実行。CI では -fuzztime=30s 等で制限する。長時間実行するほどカバレッジが上がるが CI が遅くなる。",
      },
    ],
    badCode: `// 手動テストでは限界がある
func TestParseDate(t *testing.T) {
    tests := []struct{
        input string
        want  time.Time
    }{
        {"2024-01-01", time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)},
        {"2024-12-31", time.Date(2024, 12, 31, 0, 0, 0, 0, time.UTC)},
        // ← "2024-02-30" は? "0000-00-00" は? "\xff\xfe" は?
        // 人間が思いつく範囲には限界がある
    }
    for _, tt := range tests {
        got, err := ParseDate(tt.input)
        if err != nil { t.Fatal(err) }
        if !got.Equal(tt.want) { t.Errorf("...") }
    }
}`,
    goodCode: `// Fuzz テスト（Go 1.18+）
func FuzzParseDate(f *testing.F) {
    // シードコーパスを追加（既知の入力）
    f.Add("2024-01-01")
    f.Add("2024-12-31")
    f.Add("")
    f.Add("not-a-date")

    f.Fuzz(func(t *testing.T, input string) {
        result, err := ParseDate(input)
        if err != nil {
            return  // パースエラーは正常
        }
        // 逆変換して一致するか検証（round-trip test）
        formatted := result.Format("2006-01-02")
        if formatted != input {
            t.Errorf("round-trip failed: %q -> %v -> %q",
                input, result, formatted)
        }
    })
}

// 実行方法
// go test -fuzz=FuzzParseDate           # 無制限実行
// go test -fuzz=FuzzParseDate -fuzztime=30s  # 30秒
// go test -fuzz=FuzzParseDate -fuzztime=1000x # 1000回
//
// 発見したクラッシュは testdata/fuzz/ に自動保存
// → 次回以降の go test で自動的にリプレイされる`,
    interviewPoints: [
      {
        point:
          "Fuzz テストはランダム入力でエッジケースを自動発見。パーサー・バリデータに最適",
        detail:
          "Go 1.18 で testing.F が追加。FuzzXxx(f *testing.F) で定義。f.Add() でシードを追加し、f.Fuzz() でテスト関数を定義。ランタイムが自動的に入力を変異させる。",
      },
      {
        point:
          "発見したクラッシュは testdata/fuzz/ に自動保存され、回帰テストになる",
        detail:
          "Fuzz で発見したクラッシュ入力は testdata/fuzz/FuzzXxx/ に保存される。通常の go test でもリプレイされるため、修正後の回帰テストとして機能する。",
      },
      {
        point:
          "round-trip test（変換 → 逆変換 → 一致確認）が Fuzz の代表的な検証方法",
        detail:
          "Parse → Format → 一致を検証。Marshal → Unmarshal → DeepEqual。エンコード → デコード → 一致。入力に対する具体的な期待値が不要なので Fuzz に適している。",
      },
    ],
    quizzes: [
      {
        type: "text" as const,
        code: "Fuzz テストは ____ で定義し、____ でシード入力を追加する。発見したクラッシュは ____ に自動保存され回帰テストになる",
        blanks: ["FuzzXxx(f *testing.F)", "f.Add()", "testdata/fuzz/"],
        explanation:
          "testing.F を使い FuzzXxx で定義。f.Add() でシードコーパスを追加し、f.Fuzz(func(t *testing.T, input string)) でテスト関数を定義。ランタイムが入力を自動変異させる。クラッシュは testdata/fuzz/ に保存。",
      },
      {
        type: "concept" as const,
        code: "Fuzz テストが特に効果的なシナリオを3つ挙げよ",
        blanks: [
          "パーサー（JSON, URL, 設定ファイルなど）— 予期しない入力でのクラッシュを検出",
          "エンコーダ/デコーダ — round-trip テストで一貫性を確認",
          "バリデーション関数 — bypass するような入力を自動発見",
        ],
        explanation:
          "Fuzz は人間が考えつかないエッジケースを機械的に発見する。特にユーザー入力を処理するコードは潜在的なバグがある。セキュリティ観点でも有効で、バッファオーバーフローやパニックを発見できる。",
      },
    ],
  },

  // ── アンチパターン（追加2） ────────────────────────────

  "anti-init-abuse": {
    id: "anti-init-abuse",
    section: "antipatterns",
    title: "init() の濫用",
    tag: "NG",
    summary:
      "init() はパッケージ読み込み時に暗黙実行。テスト困難・順序不定・副作用の温床になる。",
    why: "init() は暗黙的に実行されるため制御できない。DB接続やHTTPコールを init() で行うと、テスト時にも実行されて予期しない動作を引き起こす。",
    tradeoffs: [],
    badCode: `// init() で DB 接続（テスト時にも実行される）
var db *sql.DB

func init() {
    var err error
    db, err = sql.Open("postgres", os.Getenv("DB_URL"))
    if err != nil {
        log.Fatal(err)  // テスト時にクラッシュ
    }
}

// init() でグローバル変数を変更
var config Config

func init() {
    data, _ := os.ReadFile("config.json")
    json.Unmarshal(data, &config)
    // ファイルがないとゼロ値で動く（サイレント障害）
}

// 複数ファイルの init() → 実行順序が不定
// a.go: func init() { x = 1 }
// b.go: func init() { x = 2 }  // どちらが後?`,
    goodCode: `// 明示的な初期化関数
func NewDB(dsn string) (*sql.DB, error) {
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("connect db: %w", err)
    }
    if err := db.Ping(); err != nil {
        return nil, fmt.Errorf("ping db: %w", err)
    }
    return db, nil
}

// main() で明示的に呼ぶ
func main() {
    db, err := NewDB(os.Getenv("DB_URL"))
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
    // ...
}

// init() が許容されるケース（稀）
func init() {
    // 1. 副作用のない登録のみ
    sql.Register("custom", &customDriver{})
    // 2. 環境変数の読み込み（計算のみ）
    // 3. パッケージレベルの正規表現コンパイル
}`,
    interviewPoints: [
      {
        point: "init() はテスト困難・順序不定・暗黙実行の3つの問題がある",
        detail:
          "init() はパッケージが import されるだけで実行される。テスト時に DB接続が走る、複数 init() の実行順序がファイル名依存、副作用が隠れて追跡困難。",
      },
      {
        point: "init() の代わりに New 関数や明示的な初期化関数を使う",
        detail:
          "NewDB(dsn), LoadConfig(path) のように引数を受け取る関数にする。テスト時にモック値を渡せる。エラーハンドリングも呼び出し側で制御可能。",
      },
      {
        point:
          "init() が許容されるのは副作用のない登録のみ（sql.Register, flag 等）",
        detail:
          "database/sql のドライバ登録、image パッケージのフォーマット登録など、Go 標準ライブラリが init() を使うパターンはある。ただしネットワークアクセスやファイルI/Oは絶対に入れない。",
      },
    ],
    quizzes: [
      {
        type: "text" as const,
        code: "init() の問題点は ____ が困難、実行順序が ____、副作用が ____ の3つ。代わりに New 関数や明示的な初期化関数を使う",
        blanks: ["テスト", "不定", "暗黙的"],
        explanation:
          "init() はパッケージが import されるだけで暗黙実行される。テスト時にも実行されるため制御できない。NewDB(dsn) のように引数を受け取る明示的な初期化関数にすべき。",
      },
      {
        type: "concept" as const,
        code: "init() を使って良い場面はどれか？使ってはいけない場面は？",
        blanks: [
          "OK: フラグの登録（flag.Bool）、グローバルなマップの初期化（静的データ）",
          "NG: DB接続・HTTP呼び出しなどのI/O処理（テスト時にも実行される）",
          "NG: エラーが返せないため、失敗時に log.Fatal になりプロセスが終了する",
        ],
        explanation:
          "init() は同一パッケージ内に複数書け、実行順序はソースファイルの辞書順。I/O や外部依存のある処理は init() ではなく、明示的に呼ぶ初期化関数（func Setup() error）にする。",
      },
    ],
  },

  // ── 面接対策（追加） ──────────────────────────────────

  "interview-error-handling": {
    id: "interview-error-handling",
    section: "interview",
    title: "面接: エラーハンドリング設計を語る",
    tag: "まとめ",
    summary:
      "Go のエラー設計を体系的に説明できるようにする。errors.Is/As/Join、sentinel error、カスタムエラー型。",
    why: "エラーハンドリングは Go の面接で最も聞かれるトピック。設計思想（例外を使わない理由）から実装パターンまで一貫して語れることが求められる。",
    tradeoffs: [
      {
        title: "sentinel error vs カスタムエラー型",
        desc: "sentinel（var ErrNotFound = errors.New(...)）は単純で errors.Is で判定。カスタム型はフィールドに詳細情報を持てるが定義コストが高い。",
      },
    ],
    badCode: `// エラーを文字列で比較（バージョンアップで壊れる）
if err.Error() == "not found" { ... }

// エラーを握り潰す
result, _ := doSomething()

// 全てのエラーに panic
if err != nil { panic(err) }

// コンテキストなしで返す
func getUser(id string) (*User, error) {
    row := db.QueryRow("SELECT ...", id)
    return scanUser(row)  // どこで失敗したか分からない
}`,
    goodCode: `// Sentinel Error: パッケージレベルの定数エラー
var ErrNotFound = errors.New("user not found")
var ErrDuplicate = errors.New("duplicate entry")

// カスタムエラー型: 詳細情報を持つ
type ValidationError struct {
    Field   string
    Message string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s: %s", e.Field, e.Message)
}

// エラーラッピング: コンテキストを付加
func GetUser(ctx context.Context, id string) (*User, error) {
    user, err := repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return user, nil
}

// errors.Is で sentinel 判定
if errors.Is(err, ErrNotFound) { /* 404 */ }

// errors.As でカスタム型を取り出す
var ve *ValidationError
if errors.As(err, &ve) {
    // ve.Field, ve.Message にアクセス
}

// Go 1.20+ errors.Join で複数エラーを結合
errs := errors.Join(err1, err2, err3)`,
    interviewPoints: [
      {
        point:
          "Go が例外ではなく戻り値でエラーを返す理由: 明示性・制御フロー・合成可能性",
        detail:
          "例外は暗黙的に伝播するため制御フローが読めなくなる。Go は if err != nil で明示的に処理を強制する。try-catch の暗黙スコープより、呼び出し側が判断する方が Go の哲学に合う。",
      },
      {
        point:
          "errors.Is は値の比較（sentinel）、errors.As は型の取得（カスタムエラー）",
        detail:
          "errors.Is(err, target) はラップされたエラーチェーンを辿って target と一致するか判定。errors.As(err, &target) は型アサーションのラップ版。Go 1.13 で追加。",
      },
      {
        point:
          'fmt.Errorf("...: %w", err) でエラーをラップし、コンテキストを付加する',
        detail:
          "%w で Unwrap 可能なエラーを生成。呼び出しチェーン: get user 123: find by id: sql: no rows → 問題箇所が追跡可能。%v だと Unwrap できないので errors.Is/As が効かない。",
      },
      {
        point: "errors.Join (Go 1.20+) で複数エラーを1つに結合できる",
        detail:
          "バリデーションで複数フィールドのエラーを集約、並行処理の複数エラーをまとめる。errors.Is/As は Join されたエラー全てに対して検査する。",
      },
    ],
    quizzes: [
      {
        type: "text" as const,
        code: "Go のエラーハンドリング3点セット: ____ で定数エラーを定義、____ でコンテキスト付加、____ でチェーン判定",
        blanks: ["errors.New", "fmt.Errorf + %w", "errors.Is / errors.As"],
        explanation:
          "errors.New で sentinel error を定義。fmt.Errorf('get user: %w', err) でラップしてコンテキスト付加。errors.Is で sentinel 判定、errors.As でカスタム型の取り出し。Go 1.20+ では errors.Join で複数エラーを結合。",
      },
      {
        type: "concept" as const,
        code: "面接で「なぜ Go は例外（try-catch）ではなく戻り値でエラーを返すのか？」と聞かれたら",
        blanks: [
          "エラーは値：値として扱うことで compose・変換・ラップが容易",
          "明示性：どの関数がエラーを返すか呼び出し元から一目でわかる",
          "制御フロー：例外は暗黙的にスタックを遡り、制御フローが不明瞭になる",
        ],
        explanation:
          "Go チームは例外機構を意図的に除外した。エラーを戻り値にすることで if err != nil で明示的に処理が強制され、エラーの無視が可視化される（_ での無視も explicit）。プログラムの制御フローがコードから直接読める。",
      },
    ],
  },

  // ── 実務パターン ──────────────────────────────────────

  "practical-slog": {
    id: "practical-slog",
    section: "practical",
    title: "構造化ログ (slog)",
    tag: "実務頻出",
    summary:
      "Go 1.21 で追加された標準の構造化ログパッケージ。JSON出力・レベル制御・コンテキスト連携が標準で可能。",
    why: "log.Println は非構造化で検索困難。slog は標準ライブラリで構造化ログを提供し、外部ライブラリ（zap, zerolog）の置き換え候補。",
    tradeoffs: [
      {
        title: "slog vs zap/zerolog",
        desc: "slog は標準で依存ゼロだが zap より低速。高スループット（10万msg/s超）なら zap。通常のサービスなら slog で十分。",
      },
    ],
    badCode: `// 非構造化ログ（grep 困難）
log.Printf("user login: id=%s name=%s ip=%s",
    user.ID, user.Name, r.RemoteAddr)
// → "2024/01/01 12:00:00 user login: id=123 name=bob ip=10.0.0.1"
// → フィールドの区切りが曖昧。パースが困難

// ログレベルなし
log.Println("starting server...")      // INFO?
log.Println("db connection failed")    // ERROR?
log.Println("retrying in 5s")          // WARN?

// fmt.Errorf のログ出力（構造化されない）
log.Printf("error: %v", err)`,
    goodCode: `// slog: 構造化ログ（Go 1.21+）
import "log/slog"

// JSON ハンドラで構造化出力
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
}))
slog.SetDefault(logger)

// 構造化ログの出力
slog.Info("user login",
    "user_id", user.ID,
    "name", user.Name,
    "ip", r.RemoteAddr,
)
// → {"time":"...","level":"INFO","msg":"user login",
//    "user_id":"123","name":"bob","ip":"10.0.0.1"}

// エラーログ
slog.Error("db connection failed",
    "error", err,
    "retry_in", "5s",
)

// context からログ属性を取得
func handler(w http.ResponseWriter, r *http.Request) {
    logger := slog.With("request_id", r.Header.Get("X-Request-ID"))
    logger.Info("handling request", "method", r.Method)
}

// グループでネスト
slog.Info("request",
    slog.Group("user",
        slog.String("id", "123"),
        slog.String("role", "admin"),
    ),
)
// → {"msg":"request","user":{"id":"123","role":"admin"}}`,
    interviewPoints: [
      {
        point:
          "slog は Go 1.21 で追加された標準の構造化ログ。log/slog パッケージ",
        detail:
          "TextHandler（人間可読）と JSONHandler（機械可読）を標準提供。slog.Info, slog.Error, slog.Warn, slog.Debug の4レベル。key-value ペアで構造化データを出力。",
      },
      {
        point:
          "slog.With() でロガーに共通属性を付加し、リクエストスコープのログを実現",
        detail:
          "logger := slog.With('request_id', reqID) で全ログに request_id を付加。context.Context と組み合わせてリクエスト単位のトレーサビリティを実現する。",
      },
      {
        point: "slog.Handler interface を実装してカスタムハンドラを作成可能",
        detail:
          "Handler interface は Handle(ctx, Record) error メソッドを持つ。既存の zap/zerolog のバックエンドを slog のフロントエンドで使うアダプタも作成可能。",
      },
    ],
    quizzes: [
      {
        type: "text" as const,
        code: "slog は Go ____ で追加された標準の構造化ログ。____ で JSON 出力し、____ でロガーに共通属性を付加できる",
        blanks: ["1.21", "JSONHandler", "slog.With()"],
        explanation:
          "log/slog パッケージの JSONHandler で構造化 JSON ログを出力。TextHandler は人間可読。slog.With('request_id', id) でリクエストスコープのログを実現できる。",
      },
      {
        type: "concept" as const,
        code: "log.Println より slog を使うべき理由は何か？本番で重要な点は？",
        blanks: ["構造化（機械可読）", "ログレベル制御", "コンテキスト連携"],
        explanation:
          "log.Println は非構造化で検索・集計が困難。slog は key-value ペアで JSON 出力するため、Datadog/CloudWatch でのフィルタリングが容易。本番では INFO 以上のみ出力し DEBUG を除外。slog.With('request_id', id) でリクエストスコープのログを構造化し、分散トレーシングと連携できる。",
      },
    ],
  },

  "practical-http-client": {
    id: "practical-http-client",
    section: "practical",
    title: "HTTP クライアント設計",
    tag: "実務頻出",
    summary:
      "http.DefaultClient は本番で使わない。タイムアウト・リトライ・コネクションプール設定が必須。",
    why: "デフォルトの http.Client はタイムアウトなし・リトライなしで、外部 API 障害時にハングする。本番環境では必ずカスタム設定が必要。",
    tradeoffs: [
      {
        title: "タイムアウト設定",
        desc: "短すぎると正常なレスポンスもタイムアウト。長すぎると障害時に goroutine が詰まる。P99 レイテンシの 2-3 倍が目安。",
      },
    ],
    badCode: `// DefaultClient を使用（タイムアウトなし）
resp, err := http.Get("https://api.example.com/data")
// → 外部 API が応答しないと永久にブロック

// レスポンスボディを閉じない
resp, _ := http.Get(url)
data, _ := io.ReadAll(resp.Body)
// resp.Body.Close() を忘れ → コネクションリーク

// リトライなし
func callAPI(url string) ([]byte, error) {
    resp, err := http.Get(url)
    if err != nil {
        return nil, err  // 一時的な障害でも即エラー
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}`,
    goodCode: `// 本番用 HTTP クライアント
client := &http.Client{
    Timeout: 10 * time.Second,  // 全体のタイムアウト
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
        TLSHandshakeTimeout: 5 * time.Second,
    },
}

// context でリクエスト単位のタイムアウト
func callAPI(ctx context.Context, url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    resp, err := client.Do(req)
    if err != nil {
        return nil, fmt.Errorf("do request: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return nil, fmt.Errorf("api error: status %d", resp.StatusCode)
    }

    // ボディサイズを制限（DoS 防止）
    body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
    if err != nil {
        return nil, fmt.Errorf("read body: %w", err)
    }
    return body, nil
}`,
    interviewPoints: [
      {
        point:
          "http.DefaultClient はタイムアウトなし。本番では必ず http.Client{Timeout: ...} を設定",
        detail:
          "http.Client.Timeout は DNS解決からレスポンス読み取りまでの全体タイムアウト。http.Transport のフィールドで接続・TLSハンドシェイク・レスポンスヘッダの個別タイムアウトも設定可能。",
      },
      {
        point: "http.NewRequestWithContext で context をリクエストに紐づける",
        detail:
          "context.WithTimeout でリクエスト単位のタイムアウトを設定。context がキャンセルされると即座にリクエストが中断される。http.Get は context を受け取れないので使わない。",
      },
      {
        point:
          "resp.Body.Close() は defer で必ず呼ぶ。忘れるとコネクションリーク",
        detail:
          "HTTP/1.1 の Keep-Alive コネクションを再利用するには Body を最後まで読み切って Close する必要がある。io.ReadAll + defer resp.Body.Close() が定番パターン。",
      },
      {
        point:
          "io.LimitReader でレスポンスサイズを制限し、巨大レスポンスによる OOM を防ぐ",
        detail:
          "外部 API のレスポンスサイズは信頼できない。io.LimitReader(resp.Body, 1<<20) で 1MB に制限する。超えた場合は io.ReadAll が途中で切れる。",
      },
    ],
    quizzes: [
      {
        type: "text" as const,
        code: "http.DefaultClient は ____ がないため本番では使わない。リクエストには ____ で context を紐づけ、レスポンスの ____ は defer で必ず閉じる",
        blanks: ["タイムアウト", "http.NewRequestWithContext", "Body"],
        explanation:
          "http.Client{Timeout: 10*time.Second} を設定。http.NewRequestWithContext で context を紐づけ、context がキャンセルされると即座に中断。resp.Body.Close() を忘れるとコネクションリークする。",
      },
      {
        type: "concept" as const,
        code: "http.DefaultClient を本番で使ってはいけない理由は何か？必ず設定すべき項目は？",
        blanks: [
          "タイムアウトなし → 永久ブロック",
          "Timeout フィールドを設定",
          "Transport のプール設定",
        ],
        explanation:
          "http.DefaultClient は Timeout がゼロ（無制限）。外部 API が応答しないと goroutine が永久にブロックし、接続が枯渇する。本番では http.Client{Timeout: 10*time.Second} を設定。Transport に MaxIdleConnsPerHost を設定してコネクションプールも最適化する。context.WithTimeout でリクエスト単位のタイムアウトも重要。",
      },
    ],
  },

  "advanced-otel": {
    id: "advanced-otel",
    section: "advanced",
    title: "OpenTelemetry 分散トレーシング",
    tag: "Observability",
    summary: `otel.Tracer でスパンを生成し、context 経由で子スパンへ伝播させる。TraceID がリクエスト全体を貫通することで、マイクロサービス間の処理経路が可視化される。`,
    why: "マイクロサービス環境でレイテンシの原因を特定するには、ログだけでは不十分。分散トレーシングにより「どのサービスのどの処理がボトルネックか」が一目でわかる。",
    tradeoffs: [
      {
        title: "コスト増",
        desc: "全スパンを送信するとストレージ・ネットワークコストが増大。本番では head-based か tail-based サンプリングで絞る",
      },
      {
        title: "コンテキスト汚染リスク",
        desc: "context を引き回さないと伝播が途切れる。goroutine 境界では context.WithValue を使い直すこと",
      },
    ],
    badCode: `// NG: ログだけでは繋がりが見えない
func GetUser(id string) (*User, error) {
    log.Printf("GetUser called: %s", id)
    u, err := db.QueryUser(id) // どこで遅いか不明
    if err != nil {
        log.Printf("db error: %v", err)
        return nil, err
    }
    return u, nil
}`,
    goodCode: `// OK: span で処理単位を可視化
func GetUser(ctx context.Context, id string) (*User, error) {
    ctx, span := otel.Tracer("user-service").Start(ctx, "GetUser")
    defer span.End()

    span.SetAttributes(attribute.String("user.id", id))

    u, err := db.QueryUserCtx(ctx, id) // 子スパンへ context 伝播
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }
    return u, nil
}`,
    interviewPoints: [
      {
        point: "Trace・Span・Baggage の違い",
        detail:
          "Trace は一連のリクエスト全体。Span は個々の処理単位。Baggage はトレース横断でキャリーされるキー値。",
      },
      {
        point: "head-based vs tail-based サンプリング",
        detail:
          "head-based はリクエスト開始時に確率判定（シンプル）。tail-based はリクエスト完了後に判定（エラーだけ全件取得可能だが複雑）。",
      },
      {
        point: "context 伝播の仕組み",
        detail:
          "HTTP では W3C TraceContext ヘッダー（traceparent）でトレースIDを伝播。gRPC ではメタデータとして付与。",
      },
    ],
    quizzes: [
      {
        code: 'OpenTelemetry でスパンを作成するには ____ でトレーサーを取得し、____.Start(ctx, "操作名") でスパンを開始する。終了時は必ず ____ を呼ぶ',
        blanks: ['otel.Tracer("サービス名")', "tracer", "span.End()"],
        explanation:
          "otel.Tracer(name) でトレーサーを取得。Start は (context, span名) を引数に取り、新しい context と span を返す。defer span.End() で確実にスパンを終了させる。",
      },
      {
        type: "concept" as const,
        code: "head-based サンプリングと tail-based サンプリングの違いと、それぞれが適するユースケースは？",
        blanks: [
          "head-based: リクエスト開始時に確率でサンプリング。シンプルで低コスト",
          "tail-based: 完了後に内容を見てサンプリング。エラーや高レイテンシを全件取得可能",
          "本番高トラフィックはhead-based、障害調査重視はtail-based",
        ],
        explanation:
          "head-based は開始時点で確率判定するため実装がシンプルで処理コストが低い。tail-based はトレース全体を一時保存してから判定するため、エラーや遅いリクエストだけを選択的に保存できる。Jaeger・Tempo などで設定可能。",
      },
    ],
  },

  "advanced-prometheus": {
    id: "advanced-prometheus",
    section: "advanced",
    title: "Prometheus メトリクス設計",
    tag: "Observability",
    summary: `Counter（単調増加）/ Gauge（任意増減）/ Histogram（分布）/ Summary（パーセンタイル）を正しく使い分ける。ラベルの爆発を避けながら SLI/SLO を定義するのが実務の核心。`,
    why: "「サービスが遅い」を感覚でなく数値で語れるエンジニアは圧倒的に少ない。Prometheus でレイテンシ・エラーレート・スループットを計測することで SLA 達成を定量的に保証できる。",
    tradeoffs: [
      {
        title: "高カーディナリティ問題",
        desc: "user_id や request_id をラベルにすると系列数が爆発しストレージが枯渇する。ラベルは固定値または低カーディナリティ値のみ",
      },
      {
        title: "Histogram のバケット設計",
        desc: "バケット境界を事前に決めないと後から変更できない。SLO に合わせて 0.05/0.1/0.25/0.5/1.0 秒を基準に設定する",
      },
    ],
    badCode: `// NG: 型の誤用 + 高カーディナリティラベル
var reqCounter = prometheus.NewCounterVec(
    prometheus.CounterOpts{Name: "requests"},
    []string{"user_id"}, // NG: ユーザーIDは爆発する
)

// エラー数に Gauge を使うのも NG（減ることはないはず）
var errGauge = prometheus.NewGauge(
    prometheus.GaugeOpts{Name: "errors_total"},
)`,
    goodCode: `// OK: 適切な型とラベル設計
var (
    httpDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Buckets: []float64{.05, .1, .25, .5, 1, 2.5},
        },
        []string{"method", "path", "status"}, // 低カーディナリティ
    )
    httpErrors = prometheus.NewCounterVec(
        prometheus.CounterOpts{Name: "http_errors_total"},
        []string{"method", "path"},
    )
)

func handler(w http.ResponseWriter, r *http.Request) {
    timer := prometheus.NewTimer(httpDuration.With(
        prometheus.Labels{"method": r.Method, "path": r.URL.Path},
    ))
    defer timer.ObserveDuration()
}`,
    interviewPoints: [
      {
        point: "4種類のメトリクス型の使い分け",
        detail:
          "Counter=累積増加のみ（リクエスト数）。Gauge=増減する現在値（Gorutine数、メモリ使用量）。Histogram=分布を事前バケットで記録（レイテンシ）。Summary=クライアント側でパーセンタイル計算（精度重視だが集計できない）。",
      },
      {
        point: "SLI と SLO の定義",
        detail:
          "SLI（Service Level Indicator）は実測値。SLO（Objective）は目標値。Histogram なら histogram_quantile(0.99, rate(duration_bucket[5m])) < 0.5 でP99 < 500ms を表現できる。",
      },
    ],
    quizzes: [
      {
        code: "レイテンシの分布を記録するには ____ を使う。Counter は ____ のみ変化し、Gauge は ____ な値を記録する",
        blanks: ["Histogram", "単調増加", "任意に増減する現在"],
        explanation:
          "Histogram はバケットごとに観測値の件数を記録し、後から quantile を集計できる。Counter はリセット・減少不可（再起動時は 0 に戻る）。Gauge は goroutine 数やキューの深さなど増減する値に使う。",
      },
      {
        type: "concept" as const,
        code: "Prometheus でラベルの「高カーディナリティ」問題とは何か？どう対処するか？",
        blanks: [
          "ラベル値の組み合わせ数が爆発し時系列数が膨大になる",
          "user_id/request_id などユニーク値をラベルにしない",
          "method/status/regionなど固定値・低カーディナリティのみ使う",
        ],
        explanation:
          "Prometheus は label value の組み合わせごとに時系列を作成する。user_id を使うとユーザー数 × 他ラベル数の時系列が生まれストレージと書き込み性能が破綻する。exemplar（Trace IDとの紐付け）を使えば個別トレースへのリンクを持ちつつラベルは低カーディナリティを維持できる。",
      },
    ],
  },

  "advanced-db-pool": {
    id: "advanced-db-pool",
    section: "advanced",
    title: "DB接続プール最適化",
    tag: "Database",
    summary: `sql.DB はコネクションプールを内包する。MaxOpenConns / MaxIdleConns / ConnMaxLifetime / ConnMaxIdleTime の4設定を適切にチューニングしないと、接続枯渇・タイムアウト・コネクションリークが起きる。`,
    why: "DB接続プールの設定ミスはトラフィック増加時に突然顕在化する。事前に適切な上限を設定することで、DB側のmax_connections超過によるサービス停止を防ぐ。",
    tradeoffs: [
      {
        title: "MaxOpenConns が大きすぎる",
        desc: "DB 側の max_connections を超えると接続拒否される。DB サーバーの設定値の 70-80% を目安に設定",
      },
      {
        title: "MaxIdleConns が小さすぎる",
        desc: "アイドル接続が少ないと都度 TCP ハンドシェイクが発生しレイテンシが増大する。MaxOpenConns の半分程度を目安に",
      },
    ],
    badCode: `// NG: デフォルト設定（上限なし）
db, _ := sql.Open("postgres", dsn)
// MaxOpenConns = 0 (無制限)
// → トラフィックスパイク時に DB 接続を使い果たす
// → "too many connections" で全リクエスト失敗

func getUser(id string) (*User, error) {
    // context なし → タイムアウトしない
    row := db.QueryRow("SELECT * FROM users WHERE id=$1", id)
    // ...
}`,
    goodCode: `// OK: 適切な設定と context 使用
func NewDB(dsn string) (*sql.DB, error) {
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, err
    }
    db.SetMaxOpenConns(25)          // DB の max_connections の ~50%
    db.SetMaxIdleConns(10)          // アイドル接続を維持
    db.SetConnMaxLifetime(5 * time.Minute)  // ローテーション
    db.SetConnMaxIdleTime(1 * time.Minute)  // アイドル接続を解放
    return db, db.Ping()
}

func getUser(ctx context.Context, id string) (*User, error) {
    ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
    defer cancel()
    row := db.QueryRowContext(ctx, "SELECT * FROM users WHERE id=$1", id)
    // ...
}`,
    interviewPoints: [
      {
        point: "4つのプール設定パラメータの意味",
        detail:
          "MaxOpenConns=同時に開ける最大接続数。MaxIdleConns=アイドル状態で保持する接続数。ConnMaxLifetime=接続の最大寿命（ロードバランサー対策）。ConnMaxIdleTime=アイドル接続を閉じるまでの時間。",
      },
      {
        point: "Context を使う理由",
        detail:
          "QueryRowContext/ExecContext に context を渡すことで、クライアントキャンセル時やタイムアウト時に DB クエリも中断できる。context なしだと DB 側で処理が続き資源を無駄に消費する。",
      },
    ],
    quizzes: [
      {
        code: "db.SetMaxOpenConns で ____ を設定し、db.SetMaxIdleConns で ____ を設定する。接続の最大寿命は ____ で設定する",
        blanks: [
          "同時接続の上限数",
          "アイドル状態で保持する接続数",
          "db.SetConnMaxLifetime",
        ],
        explanation:
          "MaxOpenConns はDB側のmax_connectionsを超えないように設定。MaxIdleConns はプール内のアイドル接続数。ConnMaxLifetime はロードバランサーやファイアウォールで強制切断される前に自発的にリサイクルするための設定。",
      },
      {
        type: "concept" as const,
        code: "DB接続プールで ConnMaxLifetime を設定する理由は何か？",
        blanks: [
          "ロードバランサーやファイアウォールが古い接続を強制切断する前にリサイクル",
          "長期接続は DNS キャッシュが古くなりフェイルオーバー時に繋がらなくなる",
          "定期的に接続を更新することでDB側のリソースを均等分散",
        ],
        explanation:
          "クラウド環境のロードバランサーは一定時間（例: AWS RDS Proxy は 20分）でアイドル接続を切断する。ConnMaxLifetime でそれより短い時間に設定することで、アプリ側が制御した形で接続を更新できる。これにより 'broken pipe' や 'invalid connection' エラーを防ぐ。",
      },
    ],
  },

  "advanced-grpc": {
    id: "advanced-grpc",
    section: "advanced",
    title: "gRPC 設計パターン",
    tag: "API設計",
    summary: `gRPC は Protocol Buffers でスキーマ定義し HTTP/2 でストリーミング通信を実現する。Unary / Server Streaming / Client Streaming / Bidirectional の4種と、インターセプターによるミドルウェア設計が核心。`,
    why: "REST と比べ gRPC は型安全・スキーマ共有・多重化ストリーミングが強み。マイクロサービス間の内部通信には gRPC がデファクト化しており、インターセプターでトレーシング・認証・リトライを横断的に実装できる。",
    tradeoffs: [
      {
        title: "デバッグの難しさ",
        desc: "Protocol Buffers はバイナリ形式のためブラウザで直接確認できない。grpcurl や gRPC Server Reflection で補う",
      },
      {
        title: "ストリーミングのエラーハンドリング",
        desc: "ストリーム途中のエラーは status.Error で送信し、クライアント側で status.Code(err) で判定する",
      },
    ],
    badCode: `// NG: deadline なし + エラーコード不適切
func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    // deadline を設定しない → 依存サービスがハングすると永久にブロック
    user, err := s.db.Find(req.Id)
    if err != nil {
        return nil, err // NG: gRPC status code を設定していない
    }
    return user, nil
}`,
    goodCode: `// OK: deadline 伝播 + 適切な status code
func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    // context deadline は自動伝播。追加制限が必要なら WithTimeout で絞る
    if req.Id == "" {
        return nil, status.Error(codes.InvalidArgument, "id is required")
    }

    user, err := s.db.FindCtx(ctx, req.Id)
    if errors.Is(err, sql.ErrNoRows) {
        return nil, status.Errorf(codes.NotFound, "user %s not found", req.Id)
    }
    if err != nil {
        return nil, status.Errorf(codes.Internal, "db error: %v", err)
    }
    return toProto(user), nil
}

// インターセプターで横断的関心事を分離
func loggingInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
    start := time.Now()
    resp, err := handler(ctx, req)
    log.Printf("method=%s duration=%v err=%v", info.FullMethod, time.Since(start), err)
    return resp, err
}`,
    interviewPoints: [
      {
        point: "4種の通信パターンの使い分け",
        detail:
          "Unary=1リクエスト1レスポンス（通常のRPC）。Server Streaming=1リクエストで複数レスポンス（ログストリーミング）。Client Streaming=複数送信して1レスポンス（ファイルアップロード）。Bidirectional=双方向（チャット・リアルタイム）。",
      },
      {
        point: "gRPC status code と HTTP の対応",
        detail:
          "codes.NotFound=HTTP404。codes.InvalidArgument=HTTP400。codes.Internal=HTTP500。codes.Unauthenticated=HTTP401。codes.PermissionDenied=HTTP403。クライアント側は status.Code(err) で判定。",
      },
    ],
    quizzes: [
      {
        code: "gRPC でエラーを返すには ____ パッケージを使い、____ 関数でステータスコードとメッセージを付与する。クライアントはエラーコードを ____ で取り出す",
        blanks: [
          "google.golang.org/grpc/status",
          "status.Errorf(codes.NotFound, ...)",
          "status.Code(err)",
        ],
        explanation:
          'gRPC のエラーは google.golang.org/grpc/status パッケージで扱う。status.Errorf(codes.NotFound, "msg") でステータス付きエラーを生成。クライアント側で status.Code(err) == codes.NotFound と比較する。',
      },
      {
        type: "concept" as const,
        code: "gRPC のインターセプターとは何か？実際にどのような用途で使われるか？",
        blanks: [
          "RPC 呼び出しの前後に処理を挟む仕組み（ミドルウェア）",
          "認証・ロギング・トレーシング・リトライ・レート制限",
          "Unary と Streaming で別のインターセプター型がある",
        ],
        explanation:
          "インターセプターは HTTP ミドルウェアと同様の概念。grpc.ChainUnaryInterceptor で複数を連鎖させられる。認証トークン検証・OpenTelemetry スパン生成・パニックリカバリーなどを一箇所に集約できる。",
      },
    ],
  },

  "advanced-circuit-breaker": {
    id: "advanced-circuit-breaker",
    section: "advanced",
    title: "サーキットブレーカー",
    tag: "回復力",
    summary: `Closed（正常）/ Open（遮断）/ Half-Open（試行）の3状態で外部依存の障害を検出し、カスケード障害を防ぐ。失敗率が閾値を超えると Open になり、一定時間後に Half-Open で回復を試みる。`,
    why: "依存する外部 API やマイクロサービスが遅延・障害を起こした場合、タイムアウトを待ち続けるとスレッド/goroutine が詰まり自サービスも連鎖停止する（カスケード障害）。サーキットブレーカーは即座に失敗を返すことで自サービスを守る。",
    tradeoffs: [
      {
        title: "誤検知リスク",
        desc: "閾値が低すぎると一時的なエラーで Open になり正常トラフィックを遮断する。エラー率（件数ではなく割合）と最小リクエスト数の組み合わせで設定",
      },
      {
        title: "フォールバック設計が必要",
        desc: "Open 時に何を返すか（キャッシュ値・デフォルト値・エラー）を事前に設計しないと UX が悪化する",
      },
    ],
    badCode: `// NG: サーキットブレーカーなし → カスケード障害
func getRecommendations(userID string) ([]Item, error) {
    // 推薦サービスが遅延するとここで goroutine が詰まる
    resp, err := http.Get("http://recommendation-svc/items?user=" + userID)
    if err != nil {
        return nil, err
    }
    // ...
}`,
    goodCode: `// OK: gobreaker でサーキットブレーカーを実装
import "github.com/sony/gobreaker"

var cb = gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "recommendation",
    MaxRequests: 3,      // Half-Open 時の最大試行数
    Interval:    10 * time.Second,
    Timeout:     30 * time.Second, // Open → Half-Open までの待機
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        return counts.ConsecutiveFailures >= 5
    },
})

func getRecommendations(ctx context.Context, userID string) ([]Item, error) {
    result, err := cb.Execute(func() (any, error) {
        return callRecommendationSvc(ctx, userID)
    })
    if err == gobreaker.ErrOpenState {
        return getCachedRecommendations(userID), nil // フォールバック
    }
    if err != nil {
        return nil, err
    }
    return result.([]Item), nil
}`,
    interviewPoints: [
      {
        point: "3状態の遷移ルール",
        detail:
          "Closed=正常通信。失敗率が閾値超で Open へ。Open=リクエストを即座に拒否。timeout 後 Half-Open へ。Half-Open=限定的にリクエストを通す。成功すれば Closed、失敗すれば再 Open。",
      },
      {
        point: "Retry との組み合わせ",
        detail:
          "Retry は一時的な障害に有効だが、サービスが過負荷の場合 Retry がさらに負荷を増やす（Thundering herd）。Circuit Breaker でまず遮断し、Exponential backoff + Jitter で Retry するのが定石。",
      },
    ],
    quizzes: [
      {
        code: "サーキットブレーカーの3つの状態は ____、____、____ である",
        blanks: ["Closed（正常）", "Open（遮断）", "Half-Open（試行）"],
        explanation:
          "Closed は通常通り通信する状態。失敗率が閾値を超えると Open になり即座に失敗を返す。Timeout 後 Half-Open になり限定リクエストを通す。成功すれば Closed に戻り、失敗すれば再び Open になる。",
      },
      {
        type: "concept" as const,
        code: "サーキットブレーカーが「カスケード障害」を防ぐ仕組みを説明せよ",
        blanks: [
          "依存サービスへの呼び出しを遮断し goroutine を消費しない",
          "フォールバック値を即座に返すので自サービスのスループットを維持",
          "回復試行を制御して過負荷な依存サービスへの攻撃を防ぐ",
        ],
        explanation:
          "依存サービスが応答しない場合、タイムアウトを待つ goroutine が蓄積し自サービスのリソースが枯渇する。Circuit Breaker は Open 時にすぐ ErrOpenState を返すため goroutine は即座に解放される。これにより自サービスは生き続け、依存サービスの回復を待てる。",
      },
    ],
  },

  "advanced-cache": {
    id: "advanced-cache",
    section: "advanced",
    title: "キャッシュ戦略",
    tag: "パフォーマンス",
    summary: `Cache-Aside（Lazy Loading）/ Write-Through / Write-Behind の3戦略と、キャッシュスタンピード（Thundering Herd）防止、TTL 設計が実務の核心。Go では sync.singleflight で並行リクエストの重複排除ができる。`,
    why: "キャッシュは DB 負荷を劇的に下げるが、無効化タイミングとスタンピード対策を誤ると逆にシステムを不安定にする。正しいキャッシュ設計は高トラフィックサービスの必須技術。",
    tradeoffs: [
      {
        title: "キャッシュ一貫性",
        desc: "Write-Through は DB と同期するが書き込みが遅くなる。Cache-Aside は実装がシンプルだが更新直後に古い値が返る（eventual consistency）",
      },
      {
        title: "Cold Start 問題",
        desc: "キャッシュが空の状態でトラフィックが来るとDB直撃。ウォームアップスクリプトで事前キャッシュするか、singleflight で重複排除する",
      },
    ],
    badCode: `// NG: スタンピード対策なし
func GetProduct(ctx context.Context, id string) (*Product, error) {
    cached, _ := redis.Get(ctx, "product:"+id).Result()
    if cached != "" {
        // デシリアライズ...
        return product, nil
    }
    // 1000 goroutine 同時にここを通過 → DB 過負荷
    p, err := db.QueryProduct(ctx, id)
    if err != nil {
        return nil, err
    }
    redis.Set(ctx, "product:"+id, marshal(p), 5*time.Minute)
    return p, nil
}`,
    goodCode: `// OK: singleflight でスタンピード防止
var sfGroup singleflight.Group

func GetProduct(ctx context.Context, id string) (*Product, error) {
    key := "product:" + id

    // まずキャッシュ確認
    if cached := getFromCache(ctx, key); cached != nil {
        return cached, nil
    }

    // singleflight: 同じキーへの並行リクエストを1本にまとめる
    result, err, _ := sfGroup.Do(key, func() (any, error) {
        p, err := db.QueryProduct(ctx, id)
        if err != nil {
            return nil, err
        }
        // TTL にジッターを加えてキャッシュ同時期限切れを防ぐ
        ttl := 5*time.Minute + time.Duration(rand.Intn(30))*time.Second
        setCache(ctx, key, p, ttl)
        return p, nil
    })
    if err != nil {
        return nil, err
    }
    return result.(*Product), nil
}`,
    interviewPoints: [
      {
        point: "キャッシュスタンピードとは",
        detail:
          "キャッシュが同時に期限切れになった際、大量のリクエストが同時に DB にアクセスする現象。sync/singleflight で重複リクエストを1本にまとめるか、Probabilistic Early Recomputation でキャッシュ期限前に更新する。",
      },
      {
        point: "TTL にジッターを加える理由",
        detail:
          "全キーの TTL が同じだと同時に期限切れとなり集中アクセスが起きる。TTL に ±10% のランダム値を加えることで期限切れを分散させる（jitter）。",
      },
    ],
    quizzes: [
      {
        code: "キャッシュスタンピードを防ぐには ____ を使って同一キーへの並行リクエストを1本にまとめる。TTL にランダムな ____ を加えると同時期限切れを防げる",
        blanks: ["sync/singleflight", "ジッター（jitter）"],
        explanation:
          "singleflight.Group.Do は同じキーで並行実行中の場合、後続を待機させ最初の結果を共有する。TTL jitter は rand.Intn(30)*time.Second を加えることでキャッシュの期限切れタイミングを分散させる。",
      },
      {
        type: "concept" as const,
        code: "Cache-Aside パターンの手順と、Write-Through との違いを説明せよ",
        blanks: [
          "Cache-Aside: Read時にキャッシュミス→DB取得→キャッシュ書き込み",
          "Write-Through: 書き込み時に常にDB+キャッシュを同期更新",
          "Cache-Aside は読み取り最適化、Write-Through は強い一貫性が必要な場合",
        ],
        explanation:
          "Cache-Aside（Lazy Loading）はキャッシュミス時のみ DB を参照しキャッシュを更新する。書き込みは DB のみで、次の読み取り時にキャッシュが更新される。Write-Through は書き込み時に DB とキャッシュを同期するため一貫性は高いが書き込みレイテンシが増す。",
      },
    ],
  },

  "advanced-zero-downtime": {
    id: "advanced-zero-downtime",
    section: "advanced",
    title: "ゼロダウンタイムデプロイ",
    tag: "運用",
    summary: `Graceful Shutdown + Readiness Probe + Rolling Update の組み合わせがゼロダウンタイムの三本柱。SIGTERM 受信後に新規受付を停止し、進行中のリクエストを drain してから終了する。`,
    why: "コンテナ/Kubernetes 時代では1日に何度もデプロイするのが当たり前。停止なしでデプロイできる設計は DevOps の基礎であり、面接でも高頻度で問われる。",
    tradeoffs: [
      {
        title: "Drain タイムアウトの設定",
        desc: "ShutdownTimeout が長すぎると古いポッドがいつまでも残る。長くても 30 秒を上限に設定し、それを超えるリクエストは設計上存在しないようにする",
      },
      {
        title: "DB マイグレーションの互換性",
        desc: "カラム追加・リネームが含まれる場合、旧バージョンと新バージョンが同時に稼働する Rolling Update 中にエラーが起きる。後方互換マイグレーション（先に列追加→コードデプロイ→旧列削除）が必要",
      },
    ],
    badCode: `// NG: SIGTERM を無視してすぐ終了
func main() {
    http.HandleFunc("/", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
    // SIGTERM 時にコンテナが強制終了 → 処理中リクエストが切断
}`,
    goodCode: `// OK: Graceful Shutdown 実装
func main() {
    srv := &http.Server{Addr: ":8080", Handler: newRouter()}

    go func() {
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("server error: %v", err)
        }
    }()

    // シグナル待機
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit
    log.Println("shutting down...")

    // 進行中リクエストを最大 30 秒待つ
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("shutdown error: %v", err)
    }
    log.Println("server stopped")
}`,
    interviewPoints: [
      {
        point: "Kubernetes の Readiness/Liveness Probe の違い",
        detail:
          "Readiness Probe が失敗すると Service からエンドポイントが外れ、新規トラフィックが来なくなる（ゼロダウンタイムの鍵）。Liveness Probe が失敗するとコンテナ自体が再起動する。起動中は Readiness を false にして古いポッドのトラフィックを維持する。",
      },
      {
        point: "SIGTERM から SIGKILL までの流れ",
        detail:
          "Kubernetes は terminationGracePeriodSeconds（デフォルト30秒）待ってから SIGKILL を送る。preStop フックと ShutdownTimeout をこれより短く設定することでデータ損失なく終了できる。",
      },
    ],
    quizzes: [
      {
        code: "Graceful Shutdown は ____ シグナルを受け取り、____ で新規受付を停止しつつ処理中リクエストの完了を待つ。Kubernetes で新規トラフィックを遮断するには ____ を失敗させる",
        blanks: ["SIGTERM", "server.Shutdown(ctx)", "Readiness Probe"],
        explanation:
          "signal.Notify で SIGTERM を捕捉し server.Shutdown(ctx) を呼ぶ。Shutdown は新規 Accept を止め既存コネクションの処理完了を待つ。Kubernetes の Readiness Probe が失敗すると Service のエンドポイントから外れ新規トラフィックが来なくなる。",
      },
      {
        type: "concept" as const,
        code: "Rolling Update 中に DB マイグレーションで問題が起きるのはなぜか？どう対処するか？",
        blanks: [
          "旧バージョンと新バージョンが同時稼働するため、旧コードが新スキーマを読めない",
          "後方互換マイグレーション: 先にカラム追加→コードデプロイ→旧カラム削除を分割",
          "NOT NULL 制約はデータ充填後に追加、カラム削除は2デプロイに分割",
        ],
        explanation:
          "Rolling Update 中は新旧ポッドが混在する。その状態でカラム削除や非互換変更を行うと旧バージョンがエラーを起こす。3ステップ展開（expand-migrate-contract パターン）で解決する：①新カラム追加（nullable）→②コードを新カラム対応→③旧カラム削除。",
      },
    ],
  },

  "advanced-event-driven": {
    id: "advanced-event-driven",
    section: "advanced",
    title: "イベント駆動・Outboxパターン",
    tag: "分散システム",
    summary: `マイクロサービス間の非同期通信でデータ整合性を保つ Transactional Outbox パターン。DB 更新とメッセージ送信を同一トランザクションに含めることで、「DB に書いたがメッセージが送れなかった」という不整合を防ぐ。`,
    why: "「注文を確定したがメール送信が失敗した」「在庫を減らしたが決済サービスへの通知が届かなかった」はマイクロサービスで頻発するバグ。Outbox パターンはこれを原理的に解決する。",
    tradeoffs: [
      {
        title: "Relay プロセスの障害",
        desc: "Outbox テーブルをポーリングして Kafka/Pub-Sub に送信する Relay が落ちると遅延が発生するが、データは失われない。Debezium のような CDC（Change Data Capture）ツールで信頼性を高める手もある",
      },
      {
        title: "べき等性の必須化",
        desc: "at-least-once 配信なので同じイベントが複数回届く可能性がある。consumer 側でイベント ID を記録しデduplication（重複排除）を実装する",
      },
    ],
    badCode: `// NG: DB更新とメッセージ送信が別々 → 不整合が起きる
func PlaceOrder(ctx context.Context, order Order) error {
    if err := db.InsertOrder(ctx, order); err != nil {
        return err
    }
    // ここで障害が起きると DB は更新済みだがメッセージは未送信
    if err := kafka.Publish("order.created", order); err != nil {
        return err // DB ロールバック不可！
    }
    return nil
}`,
    goodCode: `// OK: Transactional Outbox パターン
func PlaceOrder(ctx context.Context, order Order) error {
    return db.WithTransaction(ctx, func(tx *sql.Tx) error {
        // 注文レコード挿入
        if err := insertOrder(ctx, tx, order); err != nil {
            return err
        }
        // 同じトランザクションで outbox テーブルにも書く
        event := OutboxEvent{
            ID:        uuid.New().String(),
            EventType: "order.created",
            Payload:   mustMarshal(order),
            CreatedAt: time.Now(),
        }
        return insertOutboxEvent(ctx, tx, event)
        // トランザクション成功 → DB と outbox が必ず同期
    })
}

// 別プロセス (Relay) が outbox を読んで Kafka に送信
func relayOutboxEvents(ctx context.Context) {
    events := fetchUnprocessedEvents(ctx)
    for _, e := range events {
        kafka.Publish(e.EventType, e.Payload)
        markAsProcessed(ctx, e.ID)
    }
}`,
    interviewPoints: [
      {
        point: "at-least-once vs exactly-once の違い",
        detail:
          "at-least-once は最低1回届くが重複の可能性あり。exactly-once は重複なしだが実装が複雑でパフォーマンスが低下。実務では at-least-once + べき等 consumer が多い。",
      },
      {
        point: "Outbox パターンと Saga の関係",
        detail:
          "Saga は分散トランザクションの補償アクションを管理するパターン。Outbox は各ステップのメッセージ送信を確実にするための実装技法。組み合わせて使うことが多い。",
      },
    ],
    quizzes: [
      {
        code: "Outbox パターンでは DB の更新と ____ の書き込みを ____ に含める。メッセージブローカーへの送信は ____ が行う",
        blanks: [
          "outbox テーブル",
          "同一トランザクション",
          "別プロセス（Relay）",
        ],
        explanation:
          "DB 更新と outbox への書き込みを同じトランザクションにまとめることで、どちらかだけが成功するという状況が原理的に起きない。Relay は outbox から未送信イベントを読み Kafka などに転送し、処理済みフラグを立てる。",
      },
      {
        type: "concept" as const,
        code: "べき等性（Idempotency）とは何か？なぜイベント駆動システムで必須なのか？",
        blanks: [
          "同じ操作を複数回実行しても結果が変わらない性質",
          "at-least-once配信では同一イベントが複数回届く可能性があるため",
          "イベントIDを記録してDuplicateを検出・無視する",
        ],
        explanation:
          "メッセージブローカーは通常 at-least-once 配信を保証する。ネットワーク障害後の再送などで同じイベントが2回届くことがある。consumer がべき等でなければ注文が2重に処理されるなどのバグになる。イベント ID をDBに記録し重複チェックすることで対処する。",
      },
    ],
  },

  // ── システム設計 ──────────────────────────────────────────

  "sysdesign-api-gateway": {
    id: "sysdesign-api-gateway",
    section: "system-design",
    title: "API Gateway パターン",
    tag: "設計",
    summary:
      "API Gateway はクライアントとバックエンドサービス群の間に置く統合エントリポイント。認証・レート制限・ルーティング・レスポンス集約を担う。",
    why: "マイクロサービスではサービスが多数になり、クライアントが個別に呼ぶと結合度が上がる。Gateway を挟むことでサービスの分割・統合が透過的になる。",
    tradeoffs: [
      {
        title: "単一障害点",
        desc: "Gateway がダウンすると全サービスが利用不能に。冗長化が必須。",
      },
      {
        title: "レイテンシ増加",
        desc: "追加のネットワークホップが入る。キャッシュや接続プールで緩和する。",
      },
    ],
    badCode: `// クライアントが各サービスを直接呼ぶ
const user = await fetch("http://user-svc:8080/users/1");
const orders = await fetch("http://order-svc:8080/orders?user=1");
const payments = await fetch("http://payment-svc:8080/payments?user=1");
// 3つのサービスのURLがクライアントにハードコード
// 認証チェックが各サービスにバラバラに実装`,
    goodCode: `// API Gateway 経由で統一的にアクセス
const profile = await fetch("/api/v1/users/1/profile");
// Gateway が内部で user-svc, order-svc, payment-svc を集約
// 認証・レート制限は Gateway で一元管理

// Go での Gateway ルーティング例
mux.Handle("/api/v1/users/", httputil.NewSingleHostReverseProxy(userSvcURL))
mux.Handle("/api/v1/orders/", httputil.NewSingleHostReverseProxy(orderSvcURL))`,
    interviewPoints: [
      {
        point: "BFF (Backend for Frontend) と API Gateway の違い",
        detail:
          "BFFはクライアント種別ごとに特化したGateway。モバイルBFF、Web BFFなど。API Gatewayは汎用的な統合ポイント。",
      },
      {
        point: "Gateway でやるべきこと・やるべきでないこと",
        detail:
          "やるべき: 認証・レート制限・ログ集約・TLS終端。やるべきでない: ビジネスロジック・データ変換の過度な実装。",
      },
    ],
    quizzes: [
      {
        code: "API Gateway は ____ と ____ の間に配置し、____ や ____ を一元管理する",
        blanks: ["クライアント", "バックエンドサービス", "認証", "レート制限"],
        explanation:
          "Gateway パターンにより、クライアントは個別のサービスURLを知る必要がなくなり、横断的関心事（認証、レート制限、ログ）を1箇所で管理できる。",
      },
      {
        type: "concept" as const,
        difficulty: "hard" as const,
        code: "API Gateway が単一障害点になるリスクをどう軽減するか？",
        blanks: [
          "複数インスタンスでの冗長化（ロードバランサ配下）",
          "ヘルスチェックと自動フェイルオーバー",
          "Circuit Breaker でバックエンド障害の伝播を防止",
        ],
        explanation:
          "Gateway 自体を水平スケールし、L4/L7 ロードバランサで分散する。各バックエンドへの接続に Circuit Breaker を設定し、1サービスの障害が全体に波及しないようにする。",
      },
    ],
  },

  "sysdesign-load-balancing": {
    id: "sysdesign-load-balancing",
    section: "system-design",
    title: "ロードバランシング戦略",
    tag: "設計",
    summary:
      "Round Robin・Least Connections・Consistent Hashing など、トラフィック分散の戦略とそのトレードオフ。",
    why: "サービスのスケーラビリティと可用性を確保するため。適切なアルゴリズムを選ばないとホットスポットやセッション断裂が起きる。",
    tradeoffs: [
      {
        title: "Round Robin vs Least Connections",
        desc: "RR はシンプルだがリクエスト処理時間のばらつきに弱い。LC は均等だが状態管理のオーバーヘッドがある。",
      },
      {
        title: "Sticky Session",
        desc: "セッション維持は簡単だがスケールアウト時に不均衡が発生。ステートレス設計が理想。",
      },
    ],
    badCode: `// 1台のサーバーに全トラフィックを流す
upstream backend {
    server app1:8080;
    server app2:8080 backup; // backup はほぼ使われない
}

// セッションをサーバーメモリに保存
sessions := map[string]*Session{} // スケールアウトで消失`,
    goodCode: `// Least Connections でバランシング
upstream backend {
    least_conn;
    server app1:8080;
    server app2:8080;
    server app3:8080;
}

// セッションは外部ストア（Redis）に保存
func getSession(r *http.Request) (*Session, error) {
    sid := r.Cookie("session_id")
    return redis.Get(ctx, "sess:"+sid.Value).Result()
}`,
    interviewPoints: [
      {
        point: "L4 と L7 ロードバランサの違い",
        detail:
          "L4はTCP/IPレベルで高速。L7はHTTPヘッダやパスでルーティングでき柔軟だがオーバーヘッドがある。",
      },
      {
        point: "Consistent Hashing の用途",
        detail:
          "キャッシュサーバーの分散に有効。ノード追加・削除時の再配置が最小限で済む。",
      },
    ],
    quizzes: [
      {
        code: "Consistent Hashing はノードの追加・削除時に ____ だけが再配置される。通常のハッシュでは ____ のキーが再配置される",
        blanks: ["一部のキー（隣接ノード分）", "ほぼ全て"],
        explanation:
          "通常のmod演算ではノード数変更で全キーの配置が変わるが、Consistent Hashingではリング上の隣接ノード間のキーだけが移動する。",
      },
      {
        type: "concept" as const,
        code: "L4 と L7 ロードバランサはどんな基準で使い分けるか？",
        blanks: [
          "L4: TCPレベルで高速・低レイテンシ、HTTPの中身を見ない（gRPCなど任意プロトコル対応）",
          "L7: HTTPヘッダ・URL・Cookieで細かいルーティング、SSL終端、WebSocketのアップグレード対応",
          "一般的に外部向けは L7（Nginx/ALB）、内部サービス間は L4 か L7 を用途で選択",
        ],
        explanation:
          "L4（AWS NLB, HAProxy TCP mode）は低レイテンシで任意のTCPトラフィックを扱える。L7（AWS ALB, Nginx）はHTTPを理解し、パスベースルーティングや認証オフロードが可能。マイクロサービスの内部通信はサービスメッシュ（Envoy/Istio）が L7 機能を提供する。",
      },
    ],
  },

  "sysdesign-caching-strategy": {
    id: "sysdesign-caching-strategy",
    section: "system-design",
    title: "キャッシュ戦略の設計",
    tag: "設計",
    summary:
      "Cache-Aside・Write-Through・Write-Behind の3戦略と、TTL・Eviction Policy の設計判断。",
    why: "適切なキャッシュ戦略はレイテンシを10-100倍改善する。一方で不整合やサンダリングハード問題を引き起こしうる。",
    tradeoffs: [
      {
        title: "一貫性 vs パフォーマンス",
        desc: "Write-Through は一貫性が高いが書き込み遅延が増す。Cache-Aside は読み取り最適だが stale read のリスク。",
      },
      {
        title: "メモリコスト vs ヒット率",
        desc: "キャッシュサイズを大きくするとヒット率は上がるがメモリコストが増大。LRU/LFU で効率的に管理。",
      },
    ],
    badCode: `// キャッシュの整合性を考慮していない
func GetUser(id string) (*User, error) {
    // キャッシュにあれば返す（古くても）
    if u, ok := cache[id]; ok {
        return u, nil  // TTLなし → 永遠に古いデータを返す
    }
    u, err := db.FindUser(id)
    cache[id] = u
    return u, err
}

// Thundering Herd: 大量リクエストが同時にDBを叩く
// キャッシュ切れの瞬間に100リクエストが同時にDBへ`,
    goodCode: `// Cache-Aside with TTL + singleflight
var group singleflight.Group

func GetUser(ctx context.Context, id string) (*User, error) {
    key := "user:" + id
    // キャッシュチェック
    if data, err := redis.Get(ctx, key).Bytes(); err == nil {
        var u User
        json.Unmarshal(data, &u)
        return &u, nil
    }
    // singleflight で同時リクエストを1つにまとめる
    v, err, _ := group.Do(key, func() (any, error) {
        u, err := db.FindUser(ctx, id)
        if err != nil { return nil, err }
        data, _ := json.Marshal(u)
        redis.Set(ctx, key, data, 5*time.Minute)
        return u, nil
    })
    return v.(*User), err
}`,
    interviewPoints: [
      {
        point: "Cache stampede（Thundering Herd）の防止策",
        detail:
          "singleflight、確率的早期更新（PER）、ロックベースのキャッシュ更新で対処。",
      },
      {
        point: "キャッシュの無効化戦略",
        detail:
          "TTLベース、イベント駆動（CDC）、明示的パージ。'There are only two hard things: cache invalidation and naming things.'",
      },
    ],
    quizzes: [
      {
        code: "Cache-Aside パターンでは、読み取り時にキャッシュミスすると ____ から取得して ____ に書き込む。書き込み時は ____ を更新しキャッシュを ____",
        blanks: ["DB", "キャッシュ", "DB", "無効化（delete）"],
        explanation:
          "Cache-Aside では読み取り時のみキャッシュが充填され、書き込み時はDBを更新後にキャッシュを削除する（update ではなく delete が推奨。次の read 時にDBから最新を取得）。",
      },
      {
        code: "singleflight.Group の ____ メソッドは、同一キーの同時呼び出しを ____ にまとめ、Thundering Herd を防ぐ",
        blanks: ["Do", "1つの実行"],
        explanation:
          "singleflight は Go 標準の x/sync パッケージ。同じキーに対する並行リクエストをDedupし、最初のリクエストの結果を全員に返す。キャッシュ再構築時のDB負荷を大幅に削減できる。",
        playgroundUrl: "https://go.dev/play/p/DYxRtIHkr6Z",
      },
    ],
  },

  "sysdesign-database-scaling": {
    id: "sysdesign-database-scaling",
    section: "system-design",
    title: "データベースのスケーリング",
    tag: "設計",
    summary:
      "Vertical Scaling・Read Replica・Sharding・Partitioning の使い分けと移行戦略。",
    why: "サービス成長に伴いDBがボトルネックになる。適切な戦略選択がサービスの成長限界を決める。",
    tradeoffs: [
      {
        title: "Read Replica vs Sharding",
        desc: "Read Replicaは読み取りスケールのみ。Shardingは書き込みもスケールするが複雑性が大幅に増す。",
      },
      {
        title: "アプリケーション分割 vs DBレベル分割",
        desc: "機能単位のDB分割（Vertical Partitioning）は比較的安全。行レベルのShardingはクロスシャードクエリが課題。",
      },
    ],
    badCode: `// 全データを1つのテーブルに（1億行超でスロークエリ）
SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
// フルテーブルスキャン → タイムアウト

// Sharding キーの選択ミス
// user_id でシャーディングしたが、特定ユーザーに注文が集中
// → ホットスポット発生`,
    goodCode: `// Read Replica で読み取り分散
func GetOrders(ctx context.Context, userID string) ([]Order, error) {
    // 読み取りはレプリカへ
    return db.Replica().WithContext(ctx).
        Where("user_id = ?", userID).
        Order("created_at DESC").
        Limit(50).Find(&orders)
}

func CreateOrder(ctx context.Context, o *Order) error {
    // 書き込みはプライマリへ
    return db.Primary().WithContext(ctx).Create(o).Error
}

// Sharding: compound key で均一分散
shardKey := hash(tenantID + userID) % numShards`,
    interviewPoints: [
      {
        point: "CAP定理とBASE",
        detail:
          "分散DBではConsistency・Availability・Partition Toleranceの3つ全ては同時に満たせない。BASEはAvailabilityを優先し結果整合性を受け入れるアプローチ。",
      },
      {
        point: "シャーディングの移行戦略",
        detail:
          "Double-write → Shadow read → Cutover。データ整合性チェックを挟みながら段階的に移行。",
      },
    ],
    quizzes: [
      {
        type: "concept" as const,
        difficulty: "hard" as const,
        code: "Read Replica で注意すべきレプリケーションラグとその対処法は？",
        blanks: [
          "プライマリからレプリカへの反映に遅延がある（数ms〜数秒）",
          "書き込み直後の読み取りはプライマリに向ける（read-your-writes一貫性）",
          "レプリカのlag監視とフェイルオーバー自動化",
        ],
        explanation:
          "非同期レプリケーションでは書き込み直後にレプリカを読むと古いデータが返る。重要な画面（注文完了直後の確認など）ではプライマリを読むことでユーザー体験を維持する。",
      },
      {
        type: "concept" as const,
        code: "DB Sharding のシャードキー選択基準を説明してください",
        blanks: [
          "高カーディナリティ（値の種類が多い）: 均一分散のため",
          "アクセスパターンに合致: クロスシャードクエリを避けるため（ユーザーIDならユーザー関連データを同シャードに集約）",
          "ホットスポットを避ける: 時系列データを timestamp でシャードすると最新シャードに集中",
        ],
        explanation:
          "シャードキーの選択はシャーディング設計の核心。変更が困難なため慎重に。tenant_id（マルチテナント）やuser_id（SNS）が典型。UUIDベースのランダムキーは均一だがクロスシャードクエリが増える。",
      },
    ],
  },

  "sysdesign-message-queue": {
    id: "sysdesign-message-queue",
    section: "system-design",
    title: "メッセージキューの設計",
    tag: "設計",
    summary:
      "Kafka・RabbitMQ・SQS の特性比較と、At-least-once / Exactly-once の意味。",
    why: "非同期処理・サービス間疎結合・ピーク負荷吸収にメッセージキューは不可欠。配信保証レベルの選択が整合性に直結する。",
    tradeoffs: [
      {
        title: "At-most-once vs At-least-once",
        desc: "At-most-once はメッセージ消失リスク。At-least-once は重複処理リスク（べき等性が必要）。",
      },
      {
        title: "順序保証 vs スループット",
        desc: "厳密な順序保証はパーティション単位でのみ実現可能。グローバル順序は実質不可能。",
      },
    ],
    badCode: `// メッセージの処理失敗を無視
func consume(msg Message) {
    processOrder(msg) // エラーを無視 → メッセージ消失
    msg.Ack()         // 常にAck → 失敗したメッセージが消える
}

// べき等性なしで At-least-once を使う
func processPayment(msg Message) {
    chargeCard(msg.Amount) // 重複配信で二重課金！
    msg.Ack()
}`,
    goodCode: `// べき等性 + エラーハンドリング + DLQ
func consume(ctx context.Context, msg Message) error {
    // べき等性チェック
    processed, _ := redis.SetNX(ctx,
        "processed:"+msg.ID, "1", 24*time.Hour).Result()
    if !processed {
        msg.Ack() // 重複 → スキップ
        return nil
    }
    if err := processOrder(ctx, msg); err != nil {
        msg.Nack() // 処理失敗 → リトライキューへ
        return err
    }
    msg.Ack()
    return nil
}`,
    interviewPoints: [
      {
        point: "Kafka と RabbitMQ の使い分け",
        detail:
          "Kafka: 大量ストリーム・ログ集約・イベントソーシング向け。RabbitMQ: タスクキュー・RPC・柔軟なルーティング向け。",
      },
      {
        point: "Dead Letter Queue (DLQ)",
        detail:
          "一定回数リトライしても処理できないメッセージを退避させるキュー。手動確認や後続処理の契機になる。",
      },
    ],
    quizzes: [
      {
        code: "At-least-once 配信では ____ のリスクがあるため、consumer は ____ でなければならない",
        blanks: ["重複配信", "べき等（idempotent）"],
        explanation:
          "ブローカーがAckを受信できなかった場合（ネットワーク障害等）、メッセージを再送する。consumer側でメッセージIDによる重複チェックや、UPSERTなどのべき等操作で対処する。",
      },
      {
        type: "concept" as const,
        code: "Kafka と SQS の使い分けをする主な基準を3つ挙げよ",
        blanks: [
          "Kafka: メッセージの保持・再生が必要（イベントソーシング、監査ログ）",
          "Kafka: 大量スループット（数百万msg/秒）が必要",
          "SQS: マネージドで運用コスト低・AWS統合が必要・シンプルなキューで十分",
        ],
        explanation:
          "Kafka はメッセージを設定期間保持し、複数コンシューマが独立したオフセットで読める（pub-sub + queue）。SQS はメッセージを一度読んだら削除するシンプルなキュー。Kafkaは運用コストが高い（ZooKeeper/KRaft、レプリカ管理）ためAWSではMSKやConfluentを使う。",
      },
    ],
  },

  "sysdesign-rate-limiting": {
    id: "sysdesign-rate-limiting",
    section: "system-design",
    title: "レート制限の設計と実装",
    tag: "設計",
    summary:
      "Token Bucket・Sliding Window・Fixed Window の3アルゴリズムと分散環境での実装。",
    why: "APIの保護・公平性確保・コスト管理にレート制限は必須。アルゴリズムの特性を理解しないとバースト許可や不公平な制限が発生する。",
    tradeoffs: [
      {
        title: "Fixed Window vs Sliding Window",
        desc: "Fixed Windowは境界でバーストが2倍になりうる。Sliding Windowは正確だがメモリ消費が多い。",
      },
      {
        title: "ローカル vs 分散",
        desc: "ローカルカウンタは高速だがインスタンス間で一貫性がない。Redis等の分散カウンタは正確だがレイテンシが加わる。",
      },
    ],
    badCode: `// Fixed Window の境界問題
// 窓 1: 11:00:00-11:00:59 → 100 req (limit 100)
// 窓 2: 11:01:00-11:01:59 → 100 req (limit 100)
// 実質 11:00:30-11:01:30 の1分間に200 req 通過！

// メモリリーク: クリーンアップなし
var counters = map[string]int{} // 無限に増加`,
    goodCode: `// Token Bucket (golang.org/x/time/rate)
limiter := rate.NewLimiter(rate.Every(time.Second), 10) // 10 req/s, burst 10

func rateLimitMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !limiter.Allow() {
            w.Header().Set("Retry-After", "1")
            http.Error(w, "Too Many Requests", 429)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// 分散環境: Redis Sliding Window
func isAllowed(ctx context.Context, key string, limit int, window time.Duration) bool {
    now := time.Now().UnixMilli()
    pipe := redis.Pipeline()
    pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(now-window.Milliseconds(), 10))
    pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: now})
    pipe.ZCard(ctx, key)
    pipe.Expire(ctx, key, window)
    results, _ := pipe.Exec(ctx)
    count := results[2].(*redis.IntCmd).Val()
    return count <= int64(limit)
}`,
    interviewPoints: [
      {
        point: "Token Bucket と Leaky Bucket の違い",
        detail:
          "Token Bucketはバースト許容。Leaky Bucketは一定レートで流出しバーストを平滑化。",
      },
      {
        point: "429 レスポンスの設計",
        detail:
          "Retry-Afterヘッダ、X-RateLimit-Remaining ヘッダで残量を通知。クライアントのexponential backoffと組み合わせる。",
      },
    ],
    quizzes: [
      {
        code: "Token Bucket は ____ のレートでトークンが補充され、バースト時は ____ まで一度に使える。Go の rate.NewLimiter(r, b) で r が ____ 、b が ____",
        blanks: ["一定", "バケット容量", "補充レート", "バーストサイズ"],
        explanation:
          "rate.NewLimiter(rate.Every(time.Second), 10) は毎秒10トークン補充、最大10トークン蓄積。バケットが満杯なら10リクエストを即座に処理でき、その後は毎秒10リクエストのペースに落ち着く。",
        playgroundUrl: "https://go.dev/play/p/t4MLmhKiNaJ",
      },
      {
        type: "concept" as const,
        code: "Redis を使った分散レート制限で Sliding Window ログ方式を実装する際の主要操作を説明せよ",
        blanks: [
          "ZADD key score member: 現在タイムスタンプをスコアとして追加",
          "ZREMRANGEBYSCORE key min max: ウィンドウ外（古い）エントリを削除",
          "ZCARD key: 現在のウィンドウ内のリクエスト数を取得",
        ],
        explanation:
          "Sorted Set を使い score=タイムスタンプで管理。パイプラインで ZREM→ZADD→ZCARD→EXPIRE をアトミックに実行。LUAスクリプトを使うとより正確なアトミック操作ができる。",
      },
    ],
  },

  "sysdesign-distributed-tracing": {
    id: "sysdesign-distributed-tracing",
    section: "system-design",
    title: "分散トレーシングの設計",
    tag: "設計",
    summary:
      "OpenTelemetry によるTrace/Span の概念、Context Propagation、サンプリング戦略。",
    why: "マイクロサービスではリクエストが複数サービスを横断する。トレーシングなしでは障害箇所の特定に数時間かかることもある。",
    tradeoffs: [
      {
        title: "全量トレース vs サンプリング",
        desc: "全量は高精度だがストレージ・CPUコストが高い。サンプリングはコスト削減だがレアなエラーを見逃す可能性。",
      },
      {
        title: "Head-based vs Tail-based サンプリング",
        desc: "Head-basedは入口で決定（シンプル）。Tail-basedは完了後に判定（エラーやスロークエリを確実に保持）。",
      },
    ],
    badCode: `// ログだけで追跡（サービスをまたぐと追えない）
log.Printf("processing order %s", orderID)
// user-svc のログと order-svc のログを
// タイムスタンプで突き合わせ？ → 非現実的

// context を伝播しない
func callPaymentService(orderID string) {
    http.Get("http://payment-svc/pay?order=" + orderID)
    // trace context が欠落 → 別のトレースとして記録
}`,
    goodCode: `// OpenTelemetry でトレース伝播
func callPaymentService(ctx context.Context, orderID string) error {
    // ctx から span を開始（親spanにリンク）
    ctx, span := tracer.Start(ctx, "callPaymentService")
    defer span.End()

    req, _ := http.NewRequestWithContext(ctx, "POST",
        "http://payment-svc/pay", nil)
    // otelhttp が W3C Traceparent ヘッダを自動注入
    otelhttp.NewTransport(http.DefaultTransport).RoundTrip(req)
    return nil
}

// サンプリング設定
tp := sdktrace.NewTracerProvider(
    sdktrace.WithSampler(
        sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1)), // 10%
    ),
)`,
    interviewPoints: [
      {
        point: "Trace・Span・SpanContext の関係",
        detail:
          "Traceは1リクエスト全体。Spanは1操作（DB呼び出し等）。SpanContextはTraceID+SpanIDでサービス間を伝播する。",
      },
      {
        point: "W3C Traceparent ヘッダ",
        detail:
          "version-traceid-parentid-flags の形式。OpenTelemetryが自動で注入・抽出し、サービス間でトレースを連結する。",
      },
    ],
    quizzes: [
      {
        code: "OpenTelemetry で tracer.Start(ctx, name) は新しい ____ を作成し、親の ____ をctxから継承する。サービス間では ____ ヘッダで伝播する",
        blanks: ["Span", "TraceID", "W3C Traceparent"],
        explanation:
          "各Spanは開始・終了時刻、属性、ステータスを記録する。ctxに含まれるTraceIDを引き継ぐことで、異なるサービスのSpanが同一Traceにまとまる。",
      },
      {
        type: "concept" as const,
        code: "Tail-based サンプリングと Head-based サンプリングの違いは？Tail-based の利点は？",
        blanks: [
          "Head-based: リクエスト開始時に確率でサンプリング決定（シンプルだがエラーを見逃す可能性）",
          "Tail-based: トレース完了後に判断（エラー・スロークエリを100%保存できる）",
          "Tail-based の欠点: トレース全体をバッファリングするためメモリコストが高い",
        ],
        explanation:
          "Tail-based サンプリングは Jaeger Collector の Adaptive Sampling や OpenTelemetry Collector の Tail Sampling Processor で実装。エラーのあるリクエストや p99 を超えるリクエストを確実に保存できる。",
      },
    ],
  },

  "sysdesign-circuit-breaker-detail": {
    id: "sysdesign-circuit-breaker-detail",
    section: "system-design",
    title: "Circuit Breaker の状態遷移設計",
    tag: "設計",
    summary:
      "Closed→Open→Half-Open の3状態遷移。失敗率の閾値、タイムアウト設計、フォールバック戦略。",
    why: "依存サービスの障害がカスケードして全システムダウンに至る。Circuit Breaker で障害を局所化し、復旧を待つ時間を確保する。",
    tradeoffs: [
      {
        title: "閾値の設定",
        desc: "閾値が低すぎると正常時にもOpenになる。高すぎると障害検知が遅れる。",
      },
      {
        title: "フォールバックの品質",
        desc: "キャッシュ返却・デフォルト値・機能縮退など。ユーザー体験とデータ鮮度のバランス。",
      },
    ],
    badCode: `// タイムアウトなし → 障害サービスを永遠に待つ
resp, err := http.Get("http://slow-service/api")
// slow-service が応答しない → goroutine がブロック
// → コネクションプール枯渇 → 呼び出し元もダウン`,
    goodCode: `// gobreaker でCircuit Breaker
cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "payment-service",
    MaxRequests: 3,              // Half-Open で許可するリクエスト数
    Interval:    10 * time.Second, // Closed での集計間隔
    Timeout:     30 * time.Second, // Open → Half-Open の待機時間
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        return counts.ConsecutiveFailures > 5
    },
})

result, err := cb.Execute(func() (any, error) {
    return callPaymentService(ctx)
})
if err != nil {
    // フォールバック: キャッシュから前回の結果を返す
    return getCachedResult(ctx)
}`,
    interviewPoints: [
      {
        point: "3状態の遷移",
        detail:
          "Closed(正常)→失敗閾値超過→Open(全拒否)→タイムアウト→Half-Open(試行)→成功→Closed / 失敗→Open",
      },
      {
        point: "Bulkhead パターンとの組み合わせ",
        detail:
          "Circuit Breakerは障害検知・遮断。Bulkheadはリソース分離（コネクションプール分割等）。併用で耐障害性を向上。",
      },
    ],
    quizzes: [
      {
        code: "Circuit Breaker の3状態は ____ → ____ → ____ 。Open状態では全リクエストを ____ し、タイムアウト後に ____ でプローブする",
        blanks: [
          "Closed",
          "Open",
          "Half-Open",
          "即座に拒否（fail fast）",
          "少数のリクエスト",
        ],
        explanation:
          "Closed で正常に通信。失敗率が閾値を超えると Open に遷移し、全リクエストを即座にエラーで返す。タイムアウト後に Half-Open で少数リクエストを試行し、成功すれば Closed に戻る。",
      },
      {
        type: "concept" as const,
        code: "Circuit Breaker の閾値設定で考慮すべき3つの指標は？",
        blanks: [
          "連続失敗回数（ConsecutiveFailures）: 5回連続で失敗したらOpen",
          "エラー率（ErrorRate）: 10秒間で50%以上がエラーならOpen",
          "タイムアウト（Timeout）: Open状態で30秒後にHalf-Open",
        ],
        explanation:
          "閾値が低すぎると正常時でもOpenになる（false positive）。高すぎると障害検知が遅れる。本番では最初は保守的（閾値高め）に設定し、モニタリングしながら調整する。p99レイテンシもトリガーに含めると良い。",
      },
    ],
  },

  // ── Go深層 ──────────────────────────────────────────

  "deep-scheduler": {
    id: "deep-scheduler",
    section: "concurrency",
    title: "Go Scheduler の内部構造 (GMP)",
    tag: "上級",
    summary:
      "G (goroutine)・M (OS thread)・P (Processor) の3要素モデルとスケジューリングの仕組み。",
    why: "goroutine のパフォーマンス特性とスケジューラの挙動を理解することで、並行処理の性能問題を根本から解決できるようになる。",
    tradeoffs: [
      {
        title: "GOMAXPROCS の設定",
        desc: "P の数 = 並行度。CPU集約ならコア数、I/O集約なら増やすメリットがある場合も。",
      },
      {
        title: "協調的プリエンプション",
        desc: "Go 1.14 以降はシグナルベースの非同期プリエンプション。計算ループでもブロックしなくなった。",
      },
    ],
    badCode: `// GOMAXPROCS=1 でCPU集約タスクを並列化しようとする
runtime.GOMAXPROCS(1)
for i := 0; i < 4; i++ {
    go heavyComputation() // P=1 なので実質直列
}

// goroutine が多すぎてスケジューラのオーバーヘッドが支配的に
for i := 0; i < 10_000_000; i++ {
    go tinyTask() // 10M goroutine → スケジューラの負荷大
}`,
    goodCode: `// CPU集約: コア数分のgoroutineで処理
numWorkers := runtime.GOMAXPROCS(0) // デフォルト=コア数
ch := make(chan Work, numWorkers)
for i := 0; i < numWorkers; i++ {
    go func() {
        for w := range ch { process(w) }
    }()
}

// I/O集約: goroutine数を増やしつつsemaphoreで制御
sem := make(chan struct{}, 100) // 同時100接続まで
for _, url := range urls {
    sem <- struct{}{}
    go func(u string) {
        defer func() { <-sem }()
        fetch(u)
    }(url)
}`,
    interviewPoints: [
      {
        point: "GMP モデルの各要素の役割",
        detail:
          "G: goroutine。M: OSスレッド。P: ローカルキュー+実行コンテキスト。M は P を持たないと G を実行できない。P のローカルキューが空だと他の P からワークスティーリング。",
      },
      {
        point: "goroutine のコスト",
        detail:
          "初期スタックは2KB（OS threadは1MB）。コンテキストスイッチはユーザー空間で完結。数十万goroutineが実用的。",
      },
    ],
    quizzes: [
      {
        code: "Go の GMP モデルで G は ____ 、M は ____ 、P は ____ を表す。GOMAXPROCS は ____ の数を制御する",
        blanks: [
          "goroutine",
          "OS スレッド",
          "Processor（ローカルキュー）",
          "P",
        ],
        explanation:
          "M は P を1つ持ち、P のローカルキューから G を取り出して実行する。ローカルキューが空だとグローバルキューや他の P からスティーリングする。GOMAXPROCS=N は同時にGを実行できるPの数を決める。",
      },
      {
        type: "concept" as const,
        difficulty: "hard" as const,
        code: "Go 1.14 で導入された非同期プリエンプションの仕組みと、それ以前の問題点は？",
        blanks: [
          "以前は関数呼び出し時にのみプリエンプションポイントがあった",
          "タイトなforループがスケジューラをブロックし、他のgoroutineが飢餓状態に",
          "1.14以降はシグナル(SIGURG)でスタックを検査し、任意のタイミングでプリエンプション可能に",
        ],
        explanation:
          "Go 1.14 以前は for{} の無限ループがあるとスケジューラが割り込めず、GOMAXPROCS個のgoroutineがCPUを独占していた。非同期プリエンプションにより、計算集約ループでもフェアスケジューリングが保証されるようになった。",
      },
    ],
  },

  "deep-memory-model": {
    id: "deep-memory-model",
    section: "concurrency",
    title: "Go Memory Model と happens-before",
    tag: "上級",
    summary:
      "happens-before 関係の定義、channel・mutex・atomic が保証する順序、sync.Once の安全性。",
    why: "メモリモデルを理解しないと「たまに壊れる」バグを書いてしまう。race detector で検出できないバグもある。",
    tradeoffs: [
      {
        title: "sync/atomic vs sync.Mutex",
        desc: "atomicは軽量だが複合操作には使えない。Mutexは汎用だがロック競合のリスク。",
      },
      {
        title: "Channel vs 共有メモリ",
        desc: "Channelは安全だがオーバーヘッドがある。共有メモリ+ロックは高速だが正しさの保証が難しい。",
      },
    ],
    badCode: `// happens-before なしのデータ共有
var data string
var ready bool

go func() {
    data = "hello"
    ready = true // コンパイラ/CPUが並べ替える可能性
}()

if ready { // data を読む時に "hello" とは限らない
    fmt.Println(data)
}`,
    goodCode: `// channel で happens-before を保証
var data string
done := make(chan struct{})

go func() {
    data = "hello"
    close(done) // data への書き込みが done 受信より前に起こることを保証
}()

<-done
fmt.Println(data) // 確実に "hello"

// sync.Once は内部で happens-before を保証
var once sync.Once
var config *Config
once.Do(func() {
    config = loadConfig() // 全goroutineがこの結果を確実に見る
})`,
    interviewPoints: [
      {
        point: "happens-before の3つの基本規則",
        detail:
          "1. 同一goroutine内の順序。2. channel送信は対応する受信より前。3. Mutex Unlockは次のLockより前。",
      },
      {
        point: "race detector の限界",
        detail:
          "-race フラグは実行パスに依存。全パスを実行しないと検出できない。CI で高カバレッジのテストを -race で回すのがベストプラクティス。",
      },
    ],
    quizzes: [
      {
        code: "Go のメモリモデルで channel の ____ は対応する ____ よりも happens-before 。これにより channel を介したデータ共有は ____",
        blanks: ["送信（send）", "受信（receive）", "安全（race-free）"],
        explanation:
          "channelの送信完了は受信完了よりも前に起きることがメモリモデルで保証されている。送信前にセットした変数は受信後に確実に見える。",
      },
      {
        type: "concept" as const,
        code: "sync.Once が内部で happens-before を保証するとはどういう意味か？",
        blanks: [
          "once.Do(f) 内の f の完了が、f の完了後に続く any goroutine の観測より前に happens",
          "f の中でセットした変数は、once.Do から返った後の全 goroutine で確実に見える",
          "double-checked locking パターンを安全に実現している",
        ],
        explanation:
          "sync.Once は内部で atomic と Mutex を組み合わせてメモリバリアを設定する。once.Do で初期化した変数は全 goroutine から正しく見える。自前で double-checked locking を実装すると happens-before が保証されないため sync.Once を使う。",
        playgroundUrl: "https://go.dev/play/p/2MAtNl2PXSE",
      },
    ],
  },

  "deep-reflect-unsafe": {
    id: "deep-reflect-unsafe",
    section: "advanced",
    title: "reflect と unsafe の実務的使い方",
    tag: "上級",
    summary:
      "reflect パッケージによる汎用処理と unsafe.Pointer の正当な使用場面。",
    why: "ORMやシリアライザなど reflect は実務フレームワークの根幹。unsafe は原則避けるが、理解しておくことでランタイムの動作を深く把握できる。",
    tradeoffs: [
      {
        title: "reflect vs generics",
        desc: "Go 1.18+ では generics で型安全に書ける場面が増えた。reflect は動的型情報が必要な場合のみ使用。",
      },
      {
        title: "unsafe の使用基準",
        desc: "標準ライブラリ内では性能最適化に使われる。アプリケーションコードでは原則禁止。互換性保証がない。",
      },
    ],
    badCode: `// reflect で全フィールドを無差別にセット
func setAll(v any, val string) {
    rv := reflect.ValueOf(v).Elem()
    for i := 0; i < rv.NumField(); i++ {
        f := rv.Field(i)
        if f.CanSet() {
            f.SetString(val) // 型チェックなし → panic
        }
    }
}

// unsafe で構造体のメモリレイアウトをハードコード
p := unsafe.Pointer(&s)
namePtr := (*string)(unsafe.Add(p, 16)) // オフセット決め打ち → 壊れやすい`,
    goodCode: `// reflect: 構造体タグを使った安全なマッピング
func mapFields(dst any, src map[string]string) error {
    rv := reflect.ValueOf(dst).Elem()
    rt := rv.Type()
    for i := 0; i < rt.NumField(); i++ {
        field := rt.Field(i)
        tag := field.Tag.Get("map")
        if tag == "" || tag == "-" { continue }
        val, ok := src[tag]
        if !ok { continue }
        f := rv.Field(i)
        if f.Kind() == reflect.String && f.CanSet() {
            f.SetString(val)
        }
    }
    return nil
}

// generics で置き換え可能なら generics を優先
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s { result[i] = f(v) }
    return result
}`,
    interviewPoints: [
      {
        point: "reflect.Type と reflect.Value の違い",
        detail:
          "Typeは型情報（フィールド名、タグ、メソッド一覧）。Valueは値への参照（読み書き可能）。Elem()でポインタの参照先を取得。",
      },
      {
        point: "unsafe.Pointer の合法的な使用パターン",
        detail:
          "任意のポインタ型への変換、uintptr を使ったポインタ演算。GC の影響を受けるため1式で完結させる必要がある。",
      },
    ],
    quizzes: [
      {
        code: "reflect.ValueOf(ptr).____() でポインタの参照先を取得し、.____() でフィールド数を得る。構造体タグは reflect.____().Field(i).Tag.Get(key) で取得する",
        blanks: ["Elem", "NumField", "TypeOf"],
        explanation:
          "reflect.ValueOf はインターフェースから reflect.Value を作成。ポインタなら Elem() で参照先を取得。NumField() はフィールド数。タグ情報は Type 側にあるので TypeOf() を使う。",
        playgroundUrl: "https://go.dev/play/p/7QbdU-mCi4K",
      },
      {
        type: "concept" as const,
        code: "reflect を使う前に generics で代替できないか確認すべき理由は？",
        blanks: [
          "reflect はランタイムエラー（panic）のリスクがある（型ミスをコンパイル時に検出できない）",
          "generics はコンパイル時に型解決され、型安全かつパフォーマンスが良い",
          "reflect は動的な型情報が必要な場合（ORM、シリアライザ、structタグ処理）のみ使用",
        ],
        explanation:
          "reflect のパニックリスクはコンパイラが検出できないため実行時に発覚する。Go 1.18+ では多くの汎用関数を generics で型安全に書ける。reflect が必要なのは「実行時に型が決まる」場面のみ（例: JSONの任意フィールドマッピング）。",
      },
    ],
  },

  "deep-generics-advanced": {
    id: "deep-generics-advanced",
    section: "advanced",
    title: "Generics 応用パターン",
    tag: "上級",
    summary:
      "型制約の設計、型推論の限界、Option/Result パターン、型安全なコンテナの実装。",
    why: "Go 1.18 の generics は基本的な使い方だけでなく、ライブラリ設計やパターン実装で真価を発揮する。",
    tradeoffs: [
      {
        title: "Generics vs Interface",
        desc: "Genericsはコンパイル時の型安全性。Interfaceは実行時の柔軟性。パフォーマンスはGenericsが有利（型消去なし）。",
      },
      {
        title: "制約の複雑さ",
        desc: "複雑な型制約はコードの理解を困難にする。シンプルな制約（comparable, constraints.Ordered等）を優先。",
      },
    ],
    badCode: `// any を多用して型安全性を放棄
func Filter(s []any, pred func(any) bool) []any {
    var result []any
    for _, v := range s {
        if pred(v) { result = append(result, v) }
    }
    return result
}
// 使用側で毎回型アサーション必要
nums := Filter(data, func(v any) bool {
    return v.(int) > 5 // panic リスク
})`,
    goodCode: `// 型安全な Filter
func Filter[T any](s []T, pred func(T) bool) []T {
    result := make([]T, 0, len(s)/2)
    for _, v := range s {
        if pred(v) { result = append(result, v) }
    }
    return result
}

// Result 型パターン
type Result[T any] struct {
    Value T
    Err   error
}
func Ok[T any](v T) Result[T] { return Result[T]{Value: v} }
func Fail[T any](err error) Result[T] { return Result[T]{Err: err} }

// 型制約でソート可能を保証
func MaxBy[T any, K constraints.Ordered](s []T, key func(T) K) T {
    best := s[0]
    for _, v := range s[1:] {
        if key(v) > key(best) { best = v }
    }
    return best
}`,
    interviewPoints: [
      {
        point: "型パラメータのコンパイル戦略",
        detail:
          "Go は辞書パッシング方式。各型インスタンスで同一のマシンコードを共有し、型情報を辞書で渡す。C++テンプレートのようなコード膨張が起きない。",
      },
      {
        point: "comparable 制約の注意点",
        detail:
          "map のキーや == 比較に必要。ただし interface を含む型は実行時panicの可能性がある（Go 1.20で改善）。",
      },
    ],
    quizzes: [
      {
        code: "Go の generics 関数 func Max[T ____](a, b T) T は T が比較可能であることを制約する。constraints パッケージの ____ はすべての数値・文字列の順序型を含む",
        blanks: ["constraints.Ordered", "Ordered"],
        explanation:
          "constraints.Ordered は ~int | ~float64 | ~string 等すべての順序比較可能な型のunion。comparable は == のみ、Ordered は < > も使える。",
        playgroundUrl: "https://go.dev/play/p/Oq9FY12AKCS",
      },
      {
        type: "concept" as const,
        code: "Generics の型制約として interface を使う場合と comparable を使う場合の違いは？また、型推論が効かないケースはどんな場合？",
        blanks: [
          "interface 制約はメソッドセットを制約し、comparable は == 演算子のみ保証する",
          "型推論は返り値のみが型パラメータになる場合（例: func New[T any]() T）は効かず、明示的に指定が必要",
          "複数の型パラメータで一方が推論できても他方が推論できない場合も明示指定が必要",
        ],
        explanation:
          "型推論はほとんどのケースで機能するが、関数の引数から推論できない型パラメータは明示指定が必要。例えば json.Unmarshal 的な汎用パーサーを generics で書く場合。Decode[T any](data []byte) T は呼び出し側で Decode[MyStruct](b) と型を指定する。",
      },
    ],
  },

  "deep-context-internals": {
    id: "deep-context-internals",
    section: "design",
    title: "context パッケージの内部実装",
    tag: "上級",
    summary:
      "context.Context のツリー構造、WithCancel/WithTimeout の伝播メカニズム、AfterFunc (Go 1.21)。",
    why: "context はキャンセル・タイムアウト・値伝播の統一メカニズム。内部構造を理解すると、リーク防止やパフォーマンス最適化が的確にできる。",
    tradeoffs: [
      {
        title: "context.Value の使用基準",
        desc: "リクエストスコープのメタデータ（traceID等）のみ。ビジネスロジックのパラメータには使わない。",
      },
      {
        title: "タイムアウトの階層",
        desc: "子 context は親より短いタイムアウトしか設定できない。親が5秒なら子に10秒を設定しても5秒で切れる。",
      },
    ],
    badCode: `// context.Value にビジネスデータを入れる
ctx = context.WithValue(ctx, "userID", 123)
// 型安全性なし、キーが衝突する可能性

// cancel を呼ばない → goroutine リーク
ctx, _ = context.WithCancel(parentCtx) // _ で cancel を捨てる
go longRunning(ctx) // parent がキャンセルされるまでリーク

// context.Background を深い層で使う
func innerFunc() {
    ctx := context.Background() // 親のキャンセルが伝播しない！
}`,
    goodCode: `// 型安全な context key
type ctxKey struct{}
func WithUserID(ctx context.Context, id int64) context.Context {
    return context.WithValue(ctx, ctxKey{}, id)
}
func UserID(ctx context.Context) (int64, bool) {
    id, ok := ctx.Value(ctxKey{}).(int64)
    return id, ok
}

// cancel を必ず呼ぶ
ctx, cancel := context.WithTimeout(parentCtx, 5*time.Second)
defer cancel() // 関数終了時に必ずキャンセル

// Go 1.21: AfterFunc でキャンセル時のクリーンアップ
stop := context.AfterFunc(ctx, func() {
    conn.Close() // ctx キャンセル時に自動実行
})
defer stop()`,
    interviewPoints: [
      {
        point: "context のツリー構造とキャンセル伝播",
        detail:
          "WithCancel は子ノードを作成。親がキャンセルされると全子孫に伝播。子のキャンセルは親に影響しない。",
      },
      {
        point: "context.Value の検索コスト",
        detail:
          "チェーンを親方向に線形探索。深いネストでは O(n)。頻繁なアクセスにはミドルウェアで一度取り出して関数引数に渡すのが望ましい。",
      },
    ],
    quizzes: [
      {
        code: "context.WithValue のキーには ____ 型を使い衝突を防ぐ。context.WithTimeout(parent, d) で d が親の残り時間より ____ 場合、親のタイムアウトが優先される",
        blanks: ["非公開の構造体（unexported struct）", "長い"],
        explanation:
          "非公開構造体型をキーにすると他パッケージからの衝突が原理的に起きない。タイムアウトは親子で短い方が適用される。子に長いタイムアウトを設定しても親の期限を超えられない。",
        playgroundUrl: "https://go.dev/play/p/TnXrwRRuePF",
      },
      {
        type: "concept" as const,
        code: "context をキャンセルしないとどんな問題が起きるか？defer cancel() で防ぐ仕組みを説明してください",
        blanks: [
          "キャンセルしないと context とその子孫が GC されない（goroutine リーク）",
          "タイマーや内部リソースが解放されず、メモリが徐々に増加",
          "defer cancel() で関数終了時に確実にキャンセルが呼ばれ、context ツリーの子孫が解放される",
        ],
        explanation:
          "WithCancel/WithTimeout は内部でタイマーや goroutine を確保する。cancel() を呼ばないとこれらが解放されない。慣用句：ctx, cancel := context.WithTimeout(...); defer cancel() の2行セット。",
      },
    ],
  },

  "deep-interface-internals": {
    id: "deep-interface-internals",
    section: "advanced",
    title: "interface の内部表現 (iface/eface)",
    tag: "上級",
    summary:
      "interface{} (eface) と 型付きinterface (iface) の内部構造、nil interface の罠、型アサーションのコスト。",
    why: "interface の内部構造を理解することで、nil比較のバグ、パフォーマンス特性、型アサーションの使い分けを正確に判断できる。",
    tradeoffs: [
      {
        title: "interface{} vs generics",
        desc: "interface{}は動的ディスパッチ（実行時コスト）。genericsは静的ディスパッチ（コンパイル時解決）。",
      },
      {
        title: "小さいinterface vs 大きいinterface",
        desc: "Go のイディオムは小さいinterface。io.Reader(1メソッド)が理想。大きいinterfaceは実装の負担が大きい。",
      },
    ],
    badCode: `// nil interface の罠
func getError() error {
    var p *MyError = nil
    return p // error interface に nil ポインタを入れる
}
err := getError()
if err != nil { // true！ interface は (type=*MyError, value=nil) で非nil
    fmt.Println("error:", err) // <nil> と表示される
}`,
    goodCode: `// nil を返す場合は明示的に interface の nil を返す
func getError() error {
    var p *MyError = nil
    if p == nil {
        return nil // interface 自体が nil
    }
    return p
}

// 型アサーション: カンマOKイディオム
if myErr, ok := err.(*MyError); ok {
    // myErr は *MyError 型として安全に使える
    log.Printf("code: %d", myErr.Code)
}

// 型スイッチでの分岐
switch e := err.(type) {
case *NotFoundError: return 404
case *ValidationError: return 400
default: return 500
}`,
    interviewPoints: [
      {
        point: "iface と eface の構造",
        detail:
          "iface は (tab *itab, data unsafe.Pointer)。tab はインターフェースの型情報とメソッドテーブル。eface (interface{}) は (type *_type, data unsafe.Pointer)。",
      },
      {
        point: "interface の nil 比較",
        detail:
          "interface が nil なのは type と data の両方が nil の場合のみ。nil ポインタを interface に入れると type が非nil になるため、interface 自体は非nil。",
      },
    ],
    quizzes: [
      {
        code: "Go の interface は内部的に (____, ____) のペアで表現される。nil ポインタを interface に代入すると type が ____ になるため interface != nil",
        blanks: ["type", "data（値ポインタ）", "非nil（具体型が設定される）"],
        explanation:
          "var p *MyError = nil を error に代入すると (type=*MyError, data=nil)。type フィールドが非nil なので interface の nil チェックは false を返す。これが Go の有名な nil interface の罠。",
        playgroundUrl: "https://go.dev/play/p/2MAtNl2PXSE",
      },
      {
        type: "concept" as const,
        code: "型アサーション `v, ok := i.(T)` と型スイッチの使い分けは？それぞれのパフォーマンス特性は？",
        blanks: [
          "型アサーションは1種類の型チェックに使用。ok パターンで安全にアサーション（panic を防ぐ）",
          "型スイッチは複数の型を分岐処理する場合に使用。可読性が高く複数 if-else の代替",
          "型アサーションは O(1) の itab ルックアップ。型スイッチもコンパイラが最適化するが case が多いと線形スキャン",
        ],
        explanation:
          "interface のメソッド呼び出しは間接参照（itab 経由）でわずかなオーバーヘッドがある。ホットパスで大量の型スイッチが必要な場合は generics への移行を検討。通常の用途では型アサーション・型スイッチのコストは無視できる。",
      },
    ],
  },

  // ── 運用・パフォーマンス ──────────────────────────────────

  "ops-profiling-production": {
    id: "ops-profiling-production",
    section: "performance",
    title: "本番環境プロファイリング",
    tag: "計測",
    summary:
      "net/http/pprof の本番公開戦略、Continuous Profiling、フレームグラフの読み方。",
    why: "ステージングでは再現しない本番特有のパフォーマンス問題がある。安全にプロファイルを取得する技術が必要。",
    tradeoffs: [
      {
        title: "CPU プロファイル vs メモリプロファイル",
        desc: "CPU は処理時間のホットスポット。メモリはアロケーション元の特定。両方取得するのが理想だがオーバーヘッドに注意。",
      },
      {
        title: "Sampling Rate",
        desc: "高頻度サンプリングは精度向上するがCPUオーバーヘッドが増す。デフォルト100Hz（10ms間隔）が妥当。",
      },
    ],
    badCode: `// pprof を認証なしで全公開
import _ "net/http/pprof"
go http.ListenAndServe(":6060", nil)
// 全世界からプロファイルが取得可能 → セキュリティリスク

// 本番で30秒のCPUプロファイル → レスポンス遅延
go tool pprof http://prod:6060/debug/pprof/profile?seconds=30`,
    goodCode: `// pprof を認証付き別ポートで公開
mux := http.NewServeMux()
mux.HandleFunc("/debug/pprof/", pprof.Index)
mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
mux.HandleFunc("/debug/pprof/heap", pprof.Handler("heap").ServeHTTP)

// 内部ネットワークのみ + Basic Auth
debugSrv := &http.Server{
    Addr:    ":6060",
    Handler: basicAuth(mux, "admin", os.Getenv("PPROF_PASS")),
}
go debugSrv.ListenAndServe()

// 短時間サンプル取得（5秒）
// go tool pprof http://internal:6060/debug/pprof/profile?seconds=5
// go tool pprof http://internal:6060/debug/pprof/heap`,
    interviewPoints: [
      {
        point: "フレームグラフの読み方",
        detail:
          "幅が広いほど時間消費が大きい。上に積まれたフレームが呼び出し元。flat（自身の時間）とcum（子を含む合計時間）の両方を確認。",
      },
      {
        point: "Continuous Profiling",
        detail:
          "Pyroscope, Datadog Continuous Profiler 等で常時プロファイルを収集。パフォーマンス劣化をデプロイと相関させて原因特定。",
      },
    ],
    quizzes: [
      {
        code: "pprof のフレームグラフで ____ が広いフレームほどCPU時間を消費している。flat は ____ の時間、cum は ____ を含む合計時間",
        blanks: ["幅", "その関数自身", "子関数の呼び出し"],
        explanation:
          "flat timeが大きい関数が直接のホットスポット。cum timeが大きいが flat が小さい場合、その関数自体ではなく呼び出し先に問題がある。",
      },
      {
        type: "concept" as const,
        code: "本番で pprof を安全に取得するためのチェックリストは？",
        blanks: [
          "認証付きの内部向けポート（例: :6060）でのみ公開",
          "CPUプロファイルは短時間（5-10秒）で取得。長時間はレイテンシに影響",
          "Continuous Profiler（Pyroscope/Datadog）で常時収集し on-demand pprof への依存を減らす",
        ],
        explanation:
          "pprof エンドポイントは CPU・メモリ・goroutineの詳細情報を含むためセキュリティリスク。認証なしの公開は脆弱性情報の露出になる。本番は 5-10 秒のスナップショットを取得し、常時監視は Continuous Profiler に任せる。",
      },
    ],
  },

  "ops-graceful-migration": {
    id: "ops-graceful-migration",
    section: "practical",
    title: "DB マイグレーションの安全な運用",
    tag: "実務頻出",
    summary:
      "無停止マイグレーション戦略: Expand/Contract パターン、Online DDL、データバックフィル。",
    why: "本番DBのスキーマ変更は最もリスクの高い運用作業。ロールバック不能な変更でサービス停止を引き起こした事例は多い。",
    tradeoffs: [
      {
        title: "Expand/Contract vs Big Bang",
        desc: "Expand/Contract は段階的で安全だが工数が倍かかる。Big Bangは高速だが失敗時の影響大。",
      },
      {
        title: "Online DDL",
        desc: "MySQL/PostgreSQL のOnline DDLはロックを最小化するが、大テーブルでは数時間かかることも。",
      },
    ],
    badCode: `-- 危険: カラムリネーム（即座に全アプリが壊れる）
ALTER TABLE users RENAME COLUMN name TO full_name;
-- 旧コードは SELECT name FROM users でエラー

-- 危険: NOT NULL 制約を一発で追加
ALTER TABLE orders ADD COLUMN status TEXT NOT NULL;
-- 既存行が制約違反 → マイグレーション失敗`,
    goodCode: `-- Expand/Contract パターン（4段階）

-- Phase 1: Expand - 新カラム追加（NULL許容）
ALTER TABLE users ADD COLUMN full_name TEXT;

-- Phase 2: Migrate - 既存データのバックフィル
UPDATE users SET full_name = name WHERE full_name IS NULL;
-- バッチで実行: LIMIT 1000 ずつ

-- Phase 3: コード変更 - 両方のカラムを読み書き
-- 新コードデプロイ後、新カラムのみ使用に切替

-- Phase 4: Contract - 旧カラム削除
ALTER TABLE users DROP COLUMN name;
-- 全サービスが新カラムのみ使用を確認後`,
    interviewPoints: [
      {
        point: "ロールバック可能なマイグレーション",
        detail:
          "各フェーズが独立してロールバック可能。Phase 4（旧カラム削除）は十分な待機期間の後に実行。",
      },
      {
        point: "バックフィルの負荷管理",
        detail:
          "一度に全行を更新せず、バッチ処理+スリープで本番DBの負荷を制御。LIMIT/OFFSETまたはカーソルベースで進行。",
      },
    ],
    quizzes: [
      {
        code: "Expand/Contract パターンの4段階は: 1.____ 2.____ 3.____ 4.____",
        blanks: [
          "新カラム追加（Expand）",
          "既存データのバックフィル",
          "コードを新カラムに切替",
          "旧カラム削除（Contract）",
        ],
        explanation:
          "各段階が独立してデプロイ・ロールバック可能。最も重要なのは Phase 2 と 3 の間で十分な検証期間を設けること。旧カラム削除は最後に行い、戻れなくなるリスクを最小化する。",
      },
      {
        type: "concept" as const,
        code: "バックフィル処理を本番DBに負荷をかけずに安全に行う方法は？",
        blanks: [
          "バッチサイズを小さく（1000行以下）して time.Sleep で間隔を空ける",
          "進捗を記録し、失敗時に途中から再開できるようにする",
          "PRIMARY KEYのカーソルを使い OFFSET/LIMIT より効率的に進む",
        ],
        explanation:
          "フルテーブルスキャンを一発で行うと本番DBのIOが飽和する。カーソルベースで1000行→sleep(100ms)→次の1000行と進む。また処理時間をLong-runningトランザクションにしないよう、行ごとにコミットする。",
      },
    ],
  },

  "ops-structured-logging": {
    id: "ops-structured-logging",
    section: "practical",
    title: "構造化ログと可観測性",
    tag: "実務頻出",
    summary: "slog による構造化ログの設計、ログレベル運用、ELK/Loki 連携。",
    why: "構造化ログはグレップではなくクエリで検索可能。アラート設定やダッシュボード構築の基盤になる。",
    tradeoffs: [
      {
        title: "JSON vs Text ログ",
        desc: "JSONは機械処理向き（ELK, Loki）。Textは人間が読みやすい（開発時）。環境変数で切替可能にするのがベスト。",
      },
      {
        title: "ログレベルの粒度",
        desc: "多すぎるログはストレージとパフォーマンスを圧迫。少なすぎると障害調査で情報不足。",
      },
    ],
    badCode: `// 構造化されていないログ
log.Printf("user %s ordered %d items for $%.2f", userID, count, total)
// パース困難、検索しにくい

// エラーログにスタックトレースなし
log.Printf("failed to process order: %v", err)
// どこで何が起きたか不明`,
    goodCode: `// slog で構造化ログ
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
}))

logger.Info("order created",
    slog.String("user_id", userID),
    slog.Int("item_count", count),
    slog.Float64("total", total),
    slog.String("trace_id", traceID),
)
// → {"time":"...","level":"INFO","msg":"order created","user_id":"u123","item_count":3,"total":99.99,"trace_id":"abc"}

// リクエストスコープのログ
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        logger := slog.With(
            slog.String("request_id", r.Header.Get("X-Request-ID")),
            slog.String("method", r.Method),
            slog.String("path", r.URL.Path),
        )
        ctx := context.WithValue(r.Context(), loggerKey{}, logger)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}`,
    interviewPoints: [
      {
        point: "slog の Handler パターン",
        detail:
          "slog.Handler インターフェースでカスタムハンドラを実装可能。複数出力先への分岐、フィールドのフィルタリング、サンプリングなど。",
      },
      {
        point: "ログとトレースの関連付け",
        detail:
          "trace_id をログに含めることで、分散トレーシングツールとログを横断検索できる。",
      },
    ],
    quizzes: [
      {
        code: "slog.With() は ____ をプリセットした新しいロガーを返す。slog.NewJSONHandler で出力は ____ 形式になる",
        blanks: ["共通のフィールド（属性）", "JSON"],
        explanation:
          "slog.With() で request_id 等を付与すると、以降のログ出力に自動で含まれる。JSONハンドラは機械処理に適した構造化出力を生成し、ELK や Loki でクエリ可能になる。",
        playgroundUrl: "https://go.dev/play/p/qjGPm9E2mEK",
      },
      {
        type: "concept" as const,
        code: "ログサンプリングをいつ検討すべきか？実装方法は？",
        blanks: [
          "高頻度エラー（毎秒1万回等）でストレージコストが問題になる場合",
          "slog の Handler をカスタム実装し、一定時間内の同一エラーを間引く",
          "エラー率の高低だけでなく、最初のN件は必ず記録してパターンを把握する",
        ],
        explanation:
          "同一エラーを無制限に記録するとストレージコストが爆発する。ただし間引きすぎると障害調査で情報不足になる。rateLimitedHandler として、同一エラーキーで1分間に1件のみ記録、残りはカウントのみ記録する方式が実用的。",
      },
    ],
  },

  "ops-container-best-practices": {
    id: "ops-container-best-practices",
    section: "practical",
    title: "Go アプリのコンテナ最適化",
    tag: "実務頻出",
    summary:
      "マルチステージビルド、scratch / distroless イメージ、ヘルスチェック、シグナルハンドリング。",
    why: "Go のシングルバイナリ特性を活かしたコンテナ最適化により、イメージサイズ 10-50MB、起動時間 < 1秒を実現できる。",
    tradeoffs: [
      {
        title: "scratch vs distroless",
        desc: "scratch は最小（数MB）だがデバッグツールなし。distroless はやや大きいがCA証明書等が含まれ実用的。",
      },
      {
        title: "CGO_ENABLED=0",
        desc: "純Go で完結するならCGO無効で完全静的リンク。SQLite等C依存がある場合はmusl libc を使用。",
      },
    ],
    badCode: `# 悪い Dockerfile（1GB超）
FROM golang:1.22
COPY . .
RUN go build -o app .
CMD ["./app"]
# Go ツールチェイン + ソースコード全体がイメージに含まれる`,
    goodCode: `# マルチステージビルド（最終イメージ ~15MB）
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \\
    -ldflags="-s -w" -o /app/server .

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /server
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]

# docker-compose.yml でヘルスチェック
healthcheck:
  test: ["CMD", "/server", "-health"]
  interval: 10s
  timeout: 3s
  retries: 3`,
    interviewPoints: [
      {
        point: "PID 1 問題",
        detail:
          "コンテナ内の PID 1 プロセスはシグナルのデフォルトハンドラが無効。Goで signal.Notify を明示的に設定するか、tini を使う。",
      },
      {
        point: '-ldflags="-s -w"',
        detail:
          "デバッグ情報とDWARFシンボルを削除してバイナリサイズを約30%削減。本番ではデバッグ不要なら推奨。",
      },
    ],
    quizzes: [
      {
        code: "Go のマルチステージビルドでは ____ ステージでビルドし、最終ステージは ____ や ____ を使い最小イメージにする",
        blanks: ["golang:x.xx-alpine（ビルダー）", "scratch", "distroless"],
        explanation:
          "ビルダーステージにはGoツールチェインと依存があるが、最終ステージにはバイナリのみをコピー。distrolessはCA証明書やタイムゾーンデータを含みTLS通信が可能。",
      },
      {
        type: "concept" as const,
        code: "コンテナ内 Go アプリで SIGTERM を正しく処理するための実装パターンを説明してください",
        blanks: [
          "signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT) でシグナルを受信",
          "HTTPサーバーは server.Shutdown(ctx) でグレースフルシャットダウン（新規接続拒否+既存処理完了待ち）",
          "DB接続やメッセージキューのコンシューマーも ctx.Done() を監視して安全に終了",
        ],
        explanation:
          "Kubernetes は Pod 停止時に SIGTERM を送り、terminationGracePeriodSeconds（デフォルト30秒）後に SIGKILL を送る。この期間内にグレースフルシャットダウンを完了させる必要がある。Go の signal.NotifyContext が最もシンプルな実装。",
      },
    ],
  },

  "ops-error-monitoring": {
    id: "ops-error-monitoring",
    section: "practical",
    title: "エラー監視とアラート設計",
    tag: "実務頻出",
    summary:
      "Sentry/Datadog でのエラー収集、アラート閾値設計、On-Call ローテーション。",
    why: "エラーの早期検知と適切なアラートがサービスの信頼性を決定づける。アラート疲れを防ぎながら重大な問題を見逃さない設計が重要。",
    tradeoffs: [
      {
        title: "アラート感度",
        desc: "高感度は早期検知できるが誤報が増えアラート疲れを招く。低感度は見逃しリスク。",
      },
      {
        title: "Error Rate vs Error Count",
        desc: "Rate（割合）はトラフィック変動に強い。Count（絶対数）は低トラフィック時に鈍感。",
      },
    ],
    badCode: `// 全エラーを同列にアラート
if err != nil {
    alertPagerDuty("ERROR: " + err.Error())
    // 404 Not Found でも深夜に叩き起こされる
}

// アラート閾値なし
if errorCount > 0 {
    sendAlert() // 1件のエラーでもアラート → アラート疲れ
}`,
    goodCode: `// エラーの重要度分類
type Severity int
const (
    SevLow    Severity = iota // ログのみ
    SevMedium                  // Slack通知
    SevHigh                    // PagerDuty
    SevCritical                // 即座にエスカレーション
)

// Error Rate ベースのアラート（Prometheus）
// 5xx率が5%を超えたら Warning、10%超で Critical
// ALERT: http_error_rate > 0.05 for 5m → Warning
// ALERT: http_error_rate > 0.10 for 2m → Critical

// Sentry でのエラーグルーピング
sentry.WithScope(func(scope *sentry.Scope) {
    scope.SetTag("service", "order-api")
    scope.SetLevel(sentry.LevelError)
    scope.SetUser(sentry.User{ID: userID})
    sentry.CaptureException(err)
})`,
    interviewPoints: [
      {
        point: "SLO/SLI/SLA の関係",
        detail:
          "SLI: 測定指標（レイテンシ、エラー率）。SLO: 内部目標（99.9%可用性）。SLA: 顧客契約（違反で金銭的ペナルティ）。Error Budget = 1 - SLO。",
      },
      {
        point: "アラートの4ゴールデンシグナル",
        detail:
          "Latency（レイテンシ）、Traffic（トラフィック）、Errors（エラー率）、Saturation（飽和度）。Google SRE が提唱。",
      },
    ],
    quizzes: [
      {
        type: "concept" as const,
        code: "SRE の 4 Golden Signals は何か？それぞれ何を監視するか？",
        blanks: [
          "Latency: リクエストの応答時間（p50, p95, p99）",
          "Traffic: リクエスト数/秒（QPS/RPS）",
          "Errors: 失敗したリクエストの割合（5xx率）",
          "Saturation: リソースの使用率（CPU, メモリ, ディスク, コネクション）",
        ],
        explanation:
          "4つの指標を組み合わせてサービスの健全性を判断する。例えばLatencyの p99 が悪化しているがErrorsは低い場合、DBのスロークエリやキャッシュミスが疑われる。",
      },
      {
        code: 'Prometheus のアラートルールで error rate が 5% 超えたら Warning とするには: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > ____。アラート疲れを防ぐには ____ 期間の継続条件を付ける',
        blanks: ["0.05", "for: （例: 5m）"],
        explanation:
          "瞬間的なエラースパイクでアラートが鳴るのを防ぐため、for 句で一定期間継続した場合のみ発火させる。Error Rate は絶対数と異なりトラフィック変動に強い。SLO に合わせて閾値を決め、Warning と Critical の2段階を設けるのがベストプラクティス。",
      },
    ],
  },

  // ── 面接対策（追加） ──────────────────────────────────

  "interview-system-design": {
    id: "interview-system-design",
    section: "interview",
    title: "システム設計面接の回答フレームワーク",
    tag: "面接",
    summary:
      "RESHADED フレームワーク: Requirements → Estimation → Storage → High-level → API → Detailed → Evaluation → Deployment",
    why: "システム設計面接は45分で大規模システムの設計を議論する。構造化されたアプローチがないと時間切れで核心に辿り着けない。",
    tradeoffs: [
      {
        title: "広さ vs 深さ",
        desc: "全体を浅く設計するか、重要部分を深掘りするか。面接官の質問に応じて切り替える。",
      },
      {
        title: "理想 vs 現実的",
        desc: "完璧なアーキテクチャより、制約下での妥当な判断を示す方が評価される。",
      },
    ],
    badCode: `// いきなり実装から始める
"まずGoでHTTPサーバーを書いて..."
// → 要件の確認なし、見積もりなし

// 全部を同列に説明する
"ユーザー認証はJWTで、DBはPostgresで、キャッシュはRedisで..."
// → 設計判断の理由がない、優先度が不明`,
    goodCode: `// RESHADED フレームワーク

// R - Requirements（2-3分）
"機能要件: URL短縮の作成・リダイレクト。非機能: 1日1億リダイレクト、99.9%可用性"

// E - Estimation（2-3分）
"1億/日 ≈ 1200 QPS。読み:書き = 100:1。データ: 500byte × 365日 × 1億 ≈ 18TB/年"

// S - Storage（5分）
"URL → hash のマッピングはKVストアが最適。DynamoDB or Redis + 永続層"

// H - High-level（5分）
"Client → LB → API Server → Cache → DB. 書き込みは非同期でDBへ"

// A - API（3分）
"POST /api/shorten {url, expiry} → {short_url}
 GET /:hash → 301 Redirect"

// D - Detailed Design（15分）
"hash生成: Base62エンコード。衝突回避: カウンタベース or UUID"

// E - Evaluation（5分）
"ボトルネック: リダイレクトのDB lookup → Redis キャッシュで解決"`,
    interviewPoints: [
      {
        point: "Back-of-the-envelope estimation",
        detail:
          "QPS、ストレージ、帯域幅を概算。1日=86400秒≈10^5、1年≈3×10^7秒。10^6 QPS はかなり大規模。",
      },
      {
        point: "トレードオフを明示する",
        detail:
          "「Aの方がBより良い」ではなく「Aはこの点で優れるがこの点でBに劣る。今回はこの理由でAを選ぶ」と説明。",
      },
    ],
    quizzes: [
      {
        type: "concept" as const,
        code: "システム設計面接で「URL短縮サービスを設計して」と言われた。最初の5分で何をすべきか？",
        blanks: [
          "機能要件の確認（作成・リダイレクト・カスタムURL・有効期限）",
          "非機能要件の確認（想定QPS、可用性、レイテンシ要件）",
          "概算（データ量、読み書き比率、必要なストレージ）",
        ],
        explanation:
          "面接官が期待するのは「要件を自分から確認しに行く姿勢」。曖昧な要件のまま設計を始めると、後で方向転換が必要になり時間を浪費する。",
      },
      {
        code: "「1億ユーザーのTwitter的サービス」を設計する場合: QPS 概算 = 1億 × ____ ツイート/日 ÷ 86400秒 ≈ ____。読み:書き = ____:1 なので読み取り QPS は ____",
        blanks: ["3", "3500", "100", "35万"],
        explanation:
          "Back-of-the-envelope: 1億ユーザー × 3ツイート/日 = 3億ツイート/日 ÷ 86400 ≈ 3500 write QPS。読み:書き比率 100:1 なら read QPS ≈ 350,000。このスケールでは水平スケール + CDN + Read Replica が必須。面接でこの概算ができると設計の根拠が明確になる。",
      },
    ],
  },

  "interview-concurrency-patterns": {
    id: "interview-concurrency-patterns",
    section: "interview",
    title: "並行処理の面接問答集",
    tag: "面接",
    summary:
      "goroutine リーク・race condition・deadlock の検出と対処を面接で説明できるようにする。",
    why: "Go エンジニアの面接では並行処理の深い理解が問われる。実務経験に基づいた具体的な回答が評価される。",
    tradeoffs: [
      {
        title: "channel vs mutex",
        desc: "channel はデータの所有権移転。mutex は共有データの保護。「Don't communicate by sharing memory; share memory by communicating.」",
      },
      {
        title: "sync.WaitGroup vs errgroup",
        desc: "WaitGroup はシンプルな完了待ち。errgroup はエラー伝播+コンテキストキャンセル付き。実務では errgroup が多い。",
      },
    ],
    badCode: `// 面接で避けるべき曖昧な回答
"goroutineは軽量スレッドです" // → 何が軽量か説明できていない
"channelを使えば安全です" // → なぜ安全か説明できていない
"mutexでロックすれば大丈夫" // → デッドロックの可能性は？`,
    goodCode: `// 面接で期待される具体的回答

// Q: goroutine リークをどう防ぐ？
"3つの原則:
 1. goroutine を起動する側がライフサイクルを管理する
 2. context.WithCancel でキャンセル伝播
 3. select + ctx.Done() で終了シグナルを受信

 具体例: HTTPリクエストのタイムアウトで
 context.WithTimeout を使い、超過時にgoroutineが
 確実に終了するようにする"

// Q: race condition の検出方法は？
"go test -race で race detector を有効化。
 CI で全テストに -race フラグを付ける。
 検出された場合は channel による所有権移転か
 sync.Mutex で保護。atomic は単一変数の場合のみ"`,
    interviewPoints: [
      {
        point: "goroutine のコスト感覚",
        detail:
          "初期スタック2KB、100万goroutineで約2GB。contextスイッチはns単位。OSスレッドの1/1000のコスト。",
      },
      {
        point: "select の挙動",
        detail:
          "複数の case が同時に ready の場合はランダム選択。default 節があると non-blocking。",
      },
    ],
    quizzes: [
      {
        code: "errgroup.Group は内部で ____ を使い、最初のエラーで ____ をキャンセルする。Wait() は ____ を返す",
        blanks: [
          "sync.WaitGroup + context",
          "context",
          "最初のエラー（non-nil error）",
        ],
        explanation:
          "errgroup は WaitGroup + エラー伝播 + コンテキストキャンセルのセット。errgroup.WithContext(ctx) で作成し、Go() でgoroutineを追加。1つでもエラーが返ると ctx がキャンセルされ、他の goroutine にも通知される。",
        playgroundUrl: "https://go.dev/play/p/XMdSRpKpfQf",
      },
      {
        type: "concept" as const,
        code: "面接で「Go のデッドロックを検出・回避する方法は？」と聞かれた場合、何を答えるべきか？",
        blanks: [
          "go test または runtime が検出: all goroutines are asleep - deadlock!",
          "回避策1: ロック取得の順序を全コードで統一（ロック順序の全体的な一貫性）",
          "回避策2: タイムアウト付き channel 操作（select + time.After/ctx.Done）でブロック回避",
          "回避策3: sync.Mutex の代わりに channel でデータを受け渡し、共有状態を排除",
        ],
        explanation:
          "デッドロックは2つ以上の goroutine が互いに相手のロック解放を待つ状態。Go ランタイムはすべての goroutine がブロックしている場合を検出してパニックする。ただし一部の goroutine だけがデッドロックしている場合は検出できないため、-race フラグや goroutine のスタックトレース確認が必要。",
      },
    ],
  },

  "interview-database-design": {
    id: "interview-database-design",
    section: "interview",
    title: "DB設計の面接問答集",
    tag: "面接",
    summary:
      "インデックス設計・N+1問題・トランザクション分離レベルを面接で語れるようにする。",
    why: "バックエンド面接ではDB設計の知識が必須。パフォーマンス最適化の実体験を具体的に語れると評価が高い。",
    tradeoffs: [
      {
        title: "正規化 vs 非正規化",
        desc: "正規化はデータの整合性を保つ。非正規化は読み取り性能を上げるが更新時の整合性維持が複雑。",
      },
      {
        title: "楽観ロック vs 悲観ロック",
        desc: "楽観ロック(version列)は競合が少ない場合に高性能。悲観ロック(SELECT FOR UPDATE)は競合が多い場合に確実。",
      },
    ],
    badCode: `// N+1 問題
users, _ := db.Query("SELECT * FROM users")
for users.Next() {
    var u User
    users.Scan(&u.ID, &u.Name)
    // ユーザーごとにクエリ → N+1
    orders, _ := db.Query("SELECT * FROM orders WHERE user_id = ?", u.ID)
}`,
    goodCode: `// JOIN で1クエリに
rows, _ := db.Query(\`
    SELECT u.id, u.name, o.id, o.total
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.active = true
\`)

// またはバッチロード
userIDs := collectIDs(users)
orders, _ := db.Query(
    "SELECT * FROM orders WHERE user_id IN (?)", userIDs)
// user_id でグルーピングしてマッピング

// 楽観ロック
result, _ := db.Exec(\`
    UPDATE products SET stock = stock - 1, version = version + 1
    WHERE id = ? AND version = ?\`, productID, currentVersion)
if result.RowsAffected() == 0 {
    return ErrConflict // リトライ
}`,
    interviewPoints: [
      {
        point: "B-Tree インデックスの仕組み",
        detail:
          "ソート済みのツリー構造。検索はO(log n)。複合インデックスはカラム順が重要（左端から使用される）。",
      },
      {
        point: "トランザクション分離レベル",
        detail:
          "Read Uncommitted < Read Committed < Repeatable Read < Serializable。PostgreSQLデフォルトはRead Committed。MySQLデフォルトはRepeatable Read。",
      },
    ],
    quizzes: [
      {
        code: "複合インデックス INDEX(a, b, c) で WHERE a=1 AND c=3 のクエリは ____ のみインデックスを使用する。WHERE a=1 AND b=2 AND c=3 は ____",
        blanks: ["a", "a, b, c 全て（フルインデックス利用）"],
        explanation:
          "複合インデックスは左端から順に使用される（Leftmost Prefix Rule）。a を飛ばして b, c だけでは使えない。a, c の場合は a のみ使用し c はフィルタリング。",
      },
      {
        type: "concept" as const,
        difficulty: "hard" as const,
        code: "楽観ロックと悲観ロックの使い分けを実例で説明してください",
        blanks: [
          "楽観ロック: ECサイトの商品閲覧→購入（競合少ない場合にversion列でチェック）",
          "悲観ロック: 銀行の口座振替（競合が多い場合にSELECT FOR UPDATE）",
          "楽観ロックはリトライコストが低い場合に有利、悲観ロックは確実性が必要な場合に有利",
        ],
        explanation:
          "楽観ロックはcommit時に競合検出→リトライ。悲観ロックは取得時にロック→他をブロック。Webアプリの一般的なCRUDは楽観ロック、金融系の残高操作は悲観ロックが適切。",
      },
    ],
  },

  "interview-api-design": {
    id: "interview-api-design",
    section: "interview",
    title: "API 設計の面接問答集",
    tag: "面接",
    summary:
      "REST vs gRPC、ページネーション、べき等性、バージョニングの面接回答。",
    why: "API設計は面接の頻出トピック。設計判断の理由を論理的に説明できるかが問われる。",
    tradeoffs: [
      {
        title: "REST vs gRPC",
        desc: "REST は汎用・ブラウザ親和性高い。gRPC は高性能・型安全・ストリーミング対応。内部通信は gRPC、外部向けは REST が多い。",
      },
      {
        title: "Cursor vs Offset ページネーション",
        desc: "Offset は実装シンプルだがページ飛ばし以外で非効率。Cursor はスケーラブルだが「N ページ目に飛ぶ」ができない。",
      },
    ],
    badCode: `// 動詞をURLに入れる
POST /api/getUser       // GET を使うべき
POST /api/deleteOrder   // DELETE を使うべき

// ページネーションなし
GET /api/users          // 100万件返す

// べき等でないPOST
POST /api/payments      // リトライで二重課金`,
    goodCode: `// RESTful 設計
GET    /api/v1/users/:id        // リソース取得
POST   /api/v1/users            // リソース作成
PUT    /api/v1/users/:id        // リソース全体更新
PATCH  /api/v1/users/:id        // リソース部分更新
DELETE /api/v1/users/:id        // リソース削除

// Cursor ページネーション
GET /api/v1/orders?cursor=abc123&limit=20
→ { "data": [...], "next_cursor": "def456", "has_more": true }

// べき等な決済API（Idempotency Key）
POST /api/v1/payments
Headers: Idempotency-Key: uuid-123
// 同じキーで再送しても1回しか課金されない`,
    interviewPoints: [
      {
        point: "HTTPメソッドのべき等性",
        detail:
          "GET, PUT, DELETE はべき等。POST は非べき等。PATCH は実装次第。べき等性はリトライの安全性を保証する。",
      },
      {
        point: "APIバージョニング戦略",
        detail:
          "URL（/v1/）、ヘッダ（Accept: application/vnd.api+json;version=1）、パラメータ。URLが最も明確で広く使われる。",
      },
    ],
    quizzes: [
      {
        code: "HTTP メソッドで ____ と ____ と ____ はべき等（同じリクエストを複数回送っても結果が同じ）。____ は非べき等",
        blanks: ["GET", "PUT", "DELETE", "POST"],
        explanation:
          "べき等性は分散システムでのリトライを安全にする重要な性質。POST は呼ぶたびにリソースが作成される（非べき等）。POST をべき等にするには Idempotency-Key ヘッダ等でクライアント側で制御する。",
      },
      {
        type: "concept" as const,
        code: "REST API の Cursor ベースページネーションの実装方法と、Offset ベースとの違いは？",
        blanks: [
          "Cursor: 最後に取得したレコードのID（または時刻）を next_cursor として返し、次回リクエストでそのカーソル以降を取得",
          "Offset は LIMIT/OFFSET なので大テーブルでは遅くなる（OFFSETの分だけスキャンが必要）",
          "Cursor は並行して追加・削除があっても一貫した結果を返せる。Offset はページ間のデータずれが起きる",
        ],
        explanation:
          "SNS のタイムラインや大量データの一覧表示では Cursor ページネーションが必須。Cursor は通常 PRIMARY KEY またはソート用カラム（created_at等）の値をBase64でエンコードして返す。SQLでは WHERE id > {cursor} LIMIT 20 の形式。",
      },
    ],
  },

  "interview-go-philosophy": {
    id: "interview-go-philosophy",
    section: "interview",
    title: "Go の設計思想と他言語との比較",
    tag: "面接",
    summary:
      "Go がなぜ継承を持たないか、エラーを値として扱う理由、シンプルさの哲学。",
    why: "「なぜGoを選ぶのか」「Goの長所・短所は？」は面接の定番質問。言語設計の哲学を理解しているかが問われる。",
    tradeoffs: [
      {
        title: "シンプルさ vs 表現力",
        desc: "Go はシンプルさを選んだ。generics 導入も慎重だった。結果としてコードの読みやすさと保守性が高い。",
      },
      {
        title: "明示的 vs 暗黙的",
        desc: "Go はエラーの明示的チェック、明示的インターフェース実装を要求。冗長だが意図が明確。",
      },
    ],
    badCode: `// Java 的な例外ベースのエラー処理を Go に持ち込む
func process() {
    defer func() {
        if r := recover(); r != nil {
            // 全てのエラーを recover で捕捉
            // → エラーの種類を区別できない
        }
    }()
    panic("something went wrong") // 例外的状況でないのに panic
}`,
    goodCode: `// Go 的なエラー処理: エラーは値
func process(ctx context.Context) error {
    data, err := fetchData(ctx)
    if err != nil {
        return fmt.Errorf("fetch data: %w", err) // エラーをラップして文脈を追加
    }
    result, err := transform(data)
    if err != nil {
        return fmt.Errorf("transform: %w", err)
    }
    return save(ctx, result)
}

// Go 的な composition（継承ではなく埋め込み）
type Logger struct { /* ... */ }
type Server struct {
    Logger     // 埋め込み = has-a 関係
    db *sql.DB
}
// Server は Logger のメソッドを「借りる」だけ
// is-a 関係ではない → 柔軟`,
    interviewPoints: [
      {
        point: "Go に generics が遅れて入った理由",
        detail:
          "Go チームは「正しい設計」が見つかるまで追加しなかった。Type Parameters Proposal は2018年から検討、2022年にGo 1.18で採用。シンプルさへのこだわり。",
      },
      {
        point: "Go vs Rust の使い分け",
        detail:
          "Go: ネットワークサービス、マイクロサービス、CLIツール。Rust: システムプログラミング、パフォーマンスクリティカル、メモリ安全性が最重要。Go はGCあり・開発速度重視、Rust はGCなし・安全性重視。",
      },
    ],
    quizzes: [
      {
        type: "concept" as const,
        code: "Go がクラスの継承ではなく構造体の埋め込み（composition）を採用した理由は？",
        blanks: [
          "継承は深い階層を作りやすく、変更の影響範囲が広がる（脆い基底クラス問題）",
          "Composition は必要な機能だけを組み合わせ、結合度が低い",
          "Go の implicit interface satisfaction と組み合わせることで、柔軟なポリモーフィズムを実現",
        ],
        explanation:
          "Go の「Composition over Inheritance」は Gang of Four のデザイン原則を言語レベルで実現。Interface は implicit（宣言なしで満たせる）なので、依存関係の逆転も容易。大規模コードベースでの保守性が高い。",
      },
      {
        code: "Go のエラーハンドリングが例外（try-catch）より優れている点を面接で説明するには: エラーは ____ として扱われ、関数の ____ に含まれる。これにより呼び出し側が ____ を強制される",
        blanks: ["値（value）", "返り値（return value）", "エラー処理"],
        explanation:
          "try-catch は例外の発生経路を隠蔽し、ハンドリングを忘れやすい。Go の if err != nil は冗長に見えるが、エラー処理が明示的でコードの全パスが追いやすい。errors.Is/As による型安全なエラー検査、%w によるラッピングで文脈の保存もできる。",
      },
    ],
  },

  "interview-production-incident": {
    id: "interview-production-incident",
    section: "interview",
    title: "本番障害の対応経験を語る",
    tag: "面接",
    summary:
      "STAR フレームワークで本番障害対応を構造的に語る方法。検知→切り分け→対応→再発防止。",
    why: "行動面接（Behavioral Interview）では過去の障害対応経験が頻出。構造的に語れるかでシニアリティが判断される。",
    tradeoffs: [
      {
        title: "速度 vs 正確さ",
        desc: "障害対応では仮の対処（ロールバック等）を素早く行い、根本原因分析は後から行うのが原則。",
      },
      {
        title: "個人 vs チーム",
        desc: "面接では個人の貢献を語りつつ、チームワークを示すバランスが重要。",
      },
    ],
    badCode: `// 悪い面接回答
"サーバーが落ちたので再起動しました"
// → 何を検知し、何が原因で、どう再発防止したか不明

"よく覚えていませんが、なんとか直しました"
// → 構造化されていない → 分析力を示せていない`,
    goodCode: `// STAR フレームワークで回答

// Situation（状況）
"金曜17時、注文APIのレイテンシが p99 で5秒に悪化。
 Datadog のアラートで検知。影響範囲は全ユーザーの注文処理。"

// Task（役割）
"On-Call エンジニアとして一次対応を担当。
 SRE チームと協力して30分以内の復旧を目指した。"

// Action（行動）
"1. Grafana でDBコネクションプールの枯渇を確認
 2. slow query log で未インデックスのクエリを特定
 3. 即座にDBの max_connections を一時的に引き上げ（応急）
 4. 問題クエリにインデックスを追加してデプロイ（根本対処）"

// Result（結果）
"応急処置で20分で復旧、根本対処は翌営業日に完了。
 Postmortem を作成し、slow query の自動アラートを追加。
 以降、同種の問題は0件。"`,
    interviewPoints: [
      {
        point: "Postmortem の書き方",
        detail:
          "Timeline（時系列）→ Impact（影響）→ Root Cause（根本原因）→ Action Items（再発防止策、担当者、期限付き）。Blameless（個人を責めない）文化が前提。",
      },
      {
        point: "On-Call のベストプラクティス",
        detail:
          "Runbook（手順書）の整備、エスカレーションパス、影響範囲の判断基準。15分ルール（15分で解決しなければエスカレーション）。",
      },
    ],
    quizzes: [
      {
        type: "concept" as const,
        code: "Postmortem に必ず含めるべき4つの要素は？",
        blanks: [
          "Timeline: いつ何が起きたかの時系列",
          "Impact: 影響を受けたユーザー数・期間・金額",
          "Root Cause: 根本原因（対症療法ではなく）",
          "Action Items: 再発防止策（担当者・期限付き）",
        ],
        explanation:
          "Blameless Postmortem はチームの学習機会。「誰が悪い」ではなく「システムの何が脆弱だったか」に焦点を当てる。Action Items は必ず期限と担当者を設定し、追跡する。",
      },
      {
        type: "concept" as const,
        code: "本番で突然レイテンシが悪化した。何を最初にチェックし、どう切り分けるか？",
        blanks: [
          "Grafana/Datadog で Latency, Error Rate, Saturation の4ゴールデンシグナルを確認",
          "デプロイ履歴と相関確認（直近のリリースが原因か？）→ 問題があればロールバック",
          "DB: slow query log, コネクションプール使用率 / 外部API: タイムアウト率 を確認",
          "goroutine 数急増なら goroutine leak、メモリ増加なら GC 圧迫を疑い pprof で調査",
        ],
        explanation:
          "障害対応の鉄則は「まず全体を見てから絞り込む」。いきなり特定のコードを調べるのは時間の無駄。Grafana ダッシュボードで問題の開始時刻とデプロイ時刻を重ね合わせ、相関がある場合は迷わずロールバックして問題を切り離す。根本原因分析は安定化してから。",
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
    group: "basics",
    description: "落とし穴とイディオム",
    topicIds: [
      "syntax-slice",
      "syntax-interface-nil",
      "syntax-defer",
      "syntax-receiver",
      "syntax-map",
      "syntax-generics",
      "syntax-struct-embedding",
    ],
  },
  {
    id: "design",
    title: "設計",
    icon: "◈",
    group: "basics",
    description: "error / context / interface / package",
    topicIds: [
      "design-error",
      "design-context",
      "design-interface",
      "design-package",
      "design-graceful-shutdown",
      "design-middleware",
      "design-functional-options",
      "design-di",
      "deep-context-internals",
    ],
  },
  {
    id: "concurrency",
    title: "並行処理",
    icon: "⇌",
    group: "skills",
    description: "goroutine / channel / worker pool / GMP",
    topicIds: [
      "concurrency-goroutine-channel",
      "concurrency-worker-pool",
      "concurrency-goroutine-leak",
      "concurrency-sync",
      "concurrency-rate-limit",
      "concurrency-pipeline",
      "deep-scheduler",
      "deep-memory-model",
    ],
  },
  {
    id: "performance",
    title: "パフォーマンス",
    icon: "⚡",
    group: "skills",
    description: "benchmark / pprof / memory / 本番プロファイリング",
    topicIds: [
      "perf-benchmark",
      "perf-pprof",
      "perf-memory",
      "perf-string",
      "perf-gc-tuning",
      "ops-profiling-production",
    ],
  },
  {
    id: "testing",
    title: "テスト",
    icon: "✓",
    group: "skills",
    description: "table-driven / mock / parallel",
    topicIds: ["test-table-driven", "test-mock", "test-helper", "test-fuzzing"],
  },
  {
    id: "antipatterns",
    title: "アンチパターン",
    icon: "✗",
    group: "basics",
    description: "避けるべき書き方と正しい代替",
    topicIds: [
      "anti-error-ignore",
      "anti-global-state",
      "anti-panic",
      "anti-over-engineering",
      "anti-init-abuse",
    ],
  },
  {
    id: "interview",
    title: "面接対策",
    icon: "◎",
    group: "interview",
    description: "技術面接で話せるようにする",
    topicIds: [
      "interview-goroutine",
      "interview-gc",
      "interview-interface",
      "interview-error-handling",
      "interview-system-design",
      "interview-concurrency-patterns",
      "interview-database-design",
      "interview-api-design",
      "interview-go-philosophy",
      "interview-production-incident",
    ],
  },
  {
    id: "toolchain",
    title: "ツールチェイン",
    icon: "⚙",
    group: "skills",
    description: "linter / go generate / 開発ツール",
    topicIds: ["tools-linter", "tools-go-generate"],
  },
  {
    id: "practical",
    title: "実務パターン",
    icon: "⊕",
    group: "advanced",
    description: "実務で頻出するパターンとベストプラクティス",
    topicIds: [
      "practical-slog",
      "practical-http-client",
      "ops-graceful-migration",
      "ops-structured-logging",
      "ops-container-best-practices",
      "ops-error-monitoring",
    ],
  },
  {
    id: "summary",
    title: "要点まとめ",
    icon: "≡",
    group: "interview",
    description: "実務で説明するための要約",
    topicIds: ["summary-idiomatic", "summary-design-decisions"],
  },
  {
    id: "advanced",
    title: "上級バックエンド",
    icon: "▲",
    group: "advanced",
    description: "分散システム・可観測性・高可用性の実践知識",
    topicIds: [
      "advanced-otel",
      "advanced-prometheus",
      "advanced-db-pool",
      "advanced-grpc",
      "advanced-circuit-breaker",
      "advanced-cache",
      "advanced-zero-downtime",
      "advanced-event-driven",
      "deep-reflect-unsafe",
      "deep-generics-advanced",
      "deep-interface-internals",
    ],
  },
  {
    id: "tl-interview",
    title: "TL面接",
    icon: "★",
    group: "interview",
    description: "テックリード候補向け — 設計判断・品質・チーム運営",
    topicIds: [],
  },
  {
    id: "system-design",
    title: "システム設計",
    icon: "◇",
    group: "advanced",
    description: "分散システム・スケーラビリティ・面接対策",
    topicIds: [
      "sysdesign-api-gateway",
      "sysdesign-load-balancing",
      "sysdesign-caching-strategy",
      "sysdesign-database-scaling",
      "sysdesign-message-queue",
      "sysdesign-rate-limiting",
      "sysdesign-distributed-tracing",
      "sysdesign-circuit-breaker-detail",
    ],
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
  { id: "design-functional-options", reason: "Go の設定パターンを理解する" },
  { id: "concurrency-pipeline", reason: "Pipeline パターンでデータ処理を設計" },
  { id: "practical-http-client", reason: "外部 API 呼び出しの落とし穴を防ぐ" },
  { id: "test-fuzzing", reason: "Go 1.18+ の Fuzz テストで品質向上" },
  {
    id: "interview-error-handling",
    reason: "面接でエラー設計を語れるようにする",
  },
  {
    id: "advanced-otel",
    reason: "分散トレーシングは上級エンジニアの必須スキル",
  },
  {
    id: "advanced-circuit-breaker",
    reason: "本番障害でカスケードを止められるか",
  },
  {
    id: "advanced-event-driven",
    reason: "Outboxパターンで分散トランザクションを解決",
  },
  {
    id: "sysdesign-caching-strategy",
    reason: "キャッシュ設計はパフォーマンスの要",
  },
  {
    id: "sysdesign-message-queue",
    reason: "非同期処理とサービス間疎結合の基盤",
  },
  {
    id: "deep-scheduler",
    reason: "GMP モデルを理解して並行処理を最適化",
  },
  {
    id: "interview-system-design",
    reason: "システム設計面接のフレームワークを習得",
  },
  {
    id: "ops-container-best-practices",
    reason: "Go + Docker の最適なビルドパターン",
  },
  {
    id: "interview-production-incident",
    reason: "障害対応経験を面接で構造的に語る",
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
  上級: "badge-error",
  面接: "badge-accent",
};
