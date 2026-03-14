import { useState, useCallback, useMemo, useEffect, useRef } from "hono/jsx/dom";
import hljs from "highlight.js/lib/core";
import go from "highlight.js/lib/languages/go";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  CheckCircleIcon,
  CodeIcon,
} from "./icons";
import {
  ALL_TL_QUESTIONS,
  CASE_STUDIES,
  TL_QUIZZES,
  CATEGORY_LABELS,
  type TLCategory,
  type TLQuestion,
  type CaseStudy,
  type TLQuiz,
} from "./tl-data";

hljs.registerLanguage("go", go);

// ─── localStorage ──────────────────────────────────────

const LS_KEY = "go-study-tl-reviewed";

function loadReviewed(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReviewed(s: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...s]));
}

// ─── Code highlight ────────────────────────────────────

// Note: dangerouslySetInnerHTML is SAFE here because input is only
// hardcoded Go code strings from tl-data.ts (never user input).
// highlight.js also escapes HTML entities in the source code.
function HighlightedCode({ code }: { code: string }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = code.trim();
      hljs.highlightElement(ref.current);
    }
  }, [code]);

  return (
    <pre class="text-xs overflow-x-auto p-3 rounded-lg bg-base-300/60 leading-relaxed mt-2">
      <code ref={ref} class="hljs language-go" />
    </pre>
  );
}

// ─── Question Card ─────────────────────────────────────

function QuestionCard({
  q,
  reviewed,
  onToggleReview,
}: {
  q: TLQuestion;
  reviewed: boolean;
  onToggleReview: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      class={`border rounded-lg transition-colors ${
        reviewed ? "border-primary/30 bg-primary/5" : "border-base-300 bg-base-100"
      }`}
    >
      <button
        class="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span class="mt-0.5 shrink-0">
          {open ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
        </span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span
              class={`badge badge-xs ${
                q.difficulty === "advanced" ? "badge-warning" : "badge-ghost"
              }`}
            >
              {q.difficulty === "advanced" ? "応用" : "基本"}
            </span>
            {q.tags.slice(0, 2).map((tag) => (
              <span key={tag} class="badge badge-xs badge-ghost opacity-60">
                {tag}
              </span>
            ))}
            {reviewed && <span class="badge badge-xs badge-primary">確認済み</span>}
          </div>
          <p class="text-sm font-medium">{q.question}</p>
        </div>
      </button>

      {open && (
        <div class="px-4 pb-4 border-t border-base-200">
          {q.context && (
            <p class="text-xs text-base-content/60 mt-3 mb-2 italic">※ {q.context}</p>
          )}

          <div class="mt-3">
            <p class="text-xs font-bold text-success mb-1.5">模範回答</p>
            <p class="text-sm leading-relaxed whitespace-pre-wrap">{q.modelAnswer}</p>
          </div>

          <div class="mt-4">
            <p class="text-xs font-bold mb-1.5 flex items-center gap-1">
              <CheckCircleIcon size={11} />
              面接官が見るポイント
            </p>
            <ul class="space-y-1">
              {q.keyPoints.map((kp, i) => (
                <li key={i} class="text-xs flex items-start gap-1.5">
                  <span class="text-primary mt-0.5 shrink-0">▸</span>
                  {kp}
                </li>
              ))}
            </ul>
          </div>

          {q.goExample && (
            <div class="mt-4">
              <p class="text-xs font-bold mb-1 flex items-center gap-1">
                <CodeIcon size={11} />
                Go コード例
              </p>
              <HighlightedCode code={q.goExample} />
            </div>
          )}

          <button
            class={`btn btn-xs mt-4 gap-1 ${
              reviewed ? "btn-primary" : "btn-ghost border border-base-300"
            }`}
            onClick={() => onToggleReview(q.id)}
          >
            <CheckIcon size={11} />
            {reviewed ? "確認済み" : "確認済みにする"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Case Study Card ───────────────────────────────────

function CaseStudyCard({
  cs,
  reviewed,
  onToggleReview,
}: {
  cs: CaseStudy;
  reviewed: boolean;
  onToggleReview: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      class={`border rounded-lg transition-colors ${
        reviewed ? "border-primary/30 bg-primary/5" : "border-base-300 bg-base-100"
      }`}
    >
      <button
        class="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span class="mt-0.5 shrink-0">
          {open ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
        </span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="badge badge-xs badge-accent">ケーススタディ</span>
            {reviewed && <span class="badge badge-xs badge-primary">確認済み</span>}
          </div>
          <p class="text-sm font-medium line-clamp-2">{cs.scenario}</p>
        </div>
      </button>

      {open && (
        <div class="px-4 pb-4 border-t border-base-200">
          <div class="mt-3 p-3 bg-base-200 rounded-lg">
            <p class="text-xs font-bold mb-1 opacity-70">状況</p>
            <p class="text-sm leading-relaxed">{cs.scenario}</p>
          </div>

          <div class="mt-3">
            <p class="text-sm font-semibold text-accent">{cs.question}</p>
          </div>

          <div class="mt-4">
            <p class="text-xs font-bold mb-1.5">考慮すべき観点</p>
            <ul class="space-y-1">
              {cs.considerations.map((c, i) => (
                <li key={i} class="text-xs flex items-start gap-1.5">
                  <span class="text-warning mt-0.5 shrink-0">?</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div class="mt-4">
            <p class="text-xs font-bold text-success mb-1.5">アプローチ例</p>
            <p class="text-sm leading-relaxed">{cs.sampleApproach}</p>
          </div>

          {cs.goExample && (
            <div class="mt-4">
              <p class="text-xs font-bold mb-1 flex items-center gap-1">
                <CodeIcon size={11} />
                Go コード例
              </p>
              <HighlightedCode code={cs.goExample} />
            </div>
          )}

          <button
            class={`btn btn-xs mt-4 gap-1 ${
              reviewed ? "btn-primary" : "btn-ghost border border-base-300"
            }`}
            onClick={() => onToggleReview(cs.id)}
          >
            <CheckIcon size={11} />
            {reviewed ? "確認済み" : "確認済みにする"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Quiz Section ──────────────────────────────────────

function QuizSection({
  category,
  reviewed,
  onToggleReview,
}: {
  category: TLCategory | "all";
  reviewed: Set<string>;
  onToggleReview: (id: string) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const quizzes = useMemo<TLQuiz[]>(
    () =>
      category === "all"
        ? TL_QUIZZES
        : TL_QUIZZES.filter((q) => q.category === category),
    [category],
  );

  // Reset quiz index when category changes
  useEffect(() => {
    setCurrent(0);
    setShowAnswer(false);
  }, [category]);

  if (quizzes.length === 0) {
    return (
      <p class="text-sm text-center py-8 opacity-60">
        このカテゴリのクイズはありません
      </p>
    );
  }

  const q = quizzes[Math.min(current, quizzes.length - 1)];
  const isReviewed = reviewed.has(`quiz-${q.id}`);

  const next = () => {
    setShowAnswer(false);
    setCurrent((c) => (c + 1) % quizzes.length);
  };
  const prev = () => {
    setShowAnswer(false);
    setCurrent((c) => (c - 1 + quizzes.length) % quizzes.length);
  };

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between text-xs opacity-60">
        <span>
          {current + 1} / {quizzes.length}
        </span>
        <span>
          確認済み:{" "}
          {quizzes.filter((qz) => reviewed.has(`quiz-${qz.id}`)).length}/
          {quizzes.length}
        </span>
      </div>

      <div class="card bg-base-200 border border-base-300">
        <div class="card-body p-5">
          <div class="flex items-center gap-2 mb-3 flex-wrap">
            <span
              class={`badge badge-xs ${
                q.difficulty === "advanced" ? "badge-warning" : "badge-ghost"
              }`}
            >
              {q.difficulty === "advanced" ? "応用" : "基本"}
            </span>
            <span class="badge badge-xs badge-ghost">
              {CATEGORY_LABELS[q.category]}
            </span>
          </div>

          <p class="text-sm font-medium mb-4">{q.question}</p>

          {!showAnswer ? (
            <button
              class="btn btn-primary btn-sm"
              onClick={() => setShowAnswer(true)}
            >
              回答を見る
            </button>
          ) : (
            <div class="space-y-3">
              <div class="p-3 bg-base-100 rounded-lg">
                <p class="text-xs font-bold text-success mb-1">回答</p>
                <p class="text-sm leading-relaxed">{q.answer}</p>
              </div>
              <div class="p-3 bg-base-100 rounded-lg">
                <p class="text-xs font-bold opacity-60 mb-1">解説</p>
                <p class="text-xs leading-relaxed opacity-80">{q.explanation}</p>
              </div>
              <button
                class={`btn btn-xs gap-1 ${
                  isReviewed ? "btn-primary" : "btn-ghost border border-base-300"
                }`}
                onClick={() => onToggleReview(`quiz-${q.id}`)}
              >
                <CheckIcon size={11} />
                {isReviewed ? "確認済み" : "確認済みにする"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div class="flex justify-between">
        <button class="btn btn-ghost btn-sm" onClick={prev}>
          前へ
        </button>
        <button class="btn btn-ghost btn-sm" onClick={next}>
          次へ
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────

type ContentMode = "qa" | "case" | "quiz";

export function TechLeadInterview() {
  const [category, setCategory] = useState<TLCategory | "all">("all");
  const [mode, setMode] = useState<ContentMode>("qa");
  const [reviewed, setReviewed] = useState<Set<string>>(loadReviewed);

  const toggleReview = useCallback((id: string) => {
    setReviewed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReviewed(next);
      return next;
    });
  }, []);

  const filteredQuestions = useMemo(
    () =>
      category === "all"
        ? ALL_TL_QUESTIONS
        : ALL_TL_QUESTIONS.filter((q) => q.category === category),
    [category],
  );

  const filteredCases = useMemo(
    () =>
      category === "all"
        ? CASE_STUDIES
        : CASE_STUDIES.filter((cs) => cs.category === category),
    [category],
  );

  const totalItems = ALL_TL_QUESTIONS.length + CASE_STUDIES.length + TL_QUIZZES.length;
  const reviewedCount = reviewed.size;
  const progressPct = Math.round((reviewedCount / totalItems) * 100);

  const CATEGORIES: { id: TLCategory | "all"; label: string; icon: string }[] = [
    { id: "all", label: "すべて", icon: "≡" },
    { id: "arch", label: "技術設計", icon: "◇" },
    { id: "quality", label: "品質・レビュー", icon: "✓" },
    { id: "team", label: "チームリード", icon: "⊕" },
  ];

  return (
    <div class="space-y-6">
      {/* Header */}
      <div>
        <h1 class="text-2xl font-bold mb-1">テックリード面接対策</h1>
        <p class="text-sm opacity-70">
          シニアエンジニア向け — 設計判断・品質管理・チーム運営を網羅
        </p>
      </div>

      {/* Progress */}
      <div class="card bg-base-200">
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold">全体の進捗</span>
            <span class="text-xs opacity-60">
              {reviewedCount}/{totalItems} 確認済み ({progressPct}%)
            </span>
          </div>
          <progress class="progress progress-primary w-full" value={progressPct} max={100} />
          <div class="flex gap-4 mt-2 text-xs opacity-60">
            <span>Q&A: {ALL_TL_QUESTIONS.length}問</span>
            <span>ケーススタディ: {CASE_STUDIES.length}件</span>
            <span>クイズ: {TL_QUIZZES.length}問</span>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div class="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => {
          const count =
            cat.id === "all"
              ? ALL_TL_QUESTIONS.length
              : ALL_TL_QUESTIONS.filter((q) => q.category === cat.id).length;
          return (
            <button
              key={cat.id}
              class={`badge badge-sm cursor-pointer py-3 px-3 transition-colors ${
                category === cat.id ? "badge-neutral" : "badge-ghost hover:badge-neutral"
              }`}
              onClick={() => setCategory(cat.id)}
            >
              <span class="mr-1 opacity-70">{cat.icon}</span>
              {cat.label}
              {cat.id !== "all" && <span class="ml-1 opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Mode tabs */}
      <div class="flex gap-1.5">
        {(["qa", "case", "quiz"] as ContentMode[]).map((m) => {
          const labels: Record<ContentMode, string> = {
            qa: "Q&A",
            case: "ケーススタディ",
            quiz: "クイズ",
          };
          return (
            <button
              key={m}
              class={`btn btn-sm ${mode === m ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setMode(m)}
            >
              {labels[m]}
            </button>
          );
        })}
      </div>

      {/* Q&A */}
      {mode === "qa" && (
        <div class="space-y-3">
          <p class="text-xs opacity-60">
            {filteredQuestions.length}問
            {category !== "all" && ` — ${CATEGORY_LABELS[category]}`}
          </p>
          {filteredQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              reviewed={reviewed.has(q.id)}
              onToggleReview={toggleReview}
            />
          ))}
        </div>
      )}

      {/* Case Studies */}
      {mode === "case" && (
        <div class="space-y-3">
          <p class="text-xs opacity-60">
            {filteredCases.length}件
            {category !== "all" && ` — ${CATEGORY_LABELS[category as TLCategory]}`}
          </p>
          {filteredCases.map((cs) => (
            <CaseStudyCard
              key={cs.id}
              cs={cs}
              reviewed={reviewed.has(cs.id)}
              onToggleReview={toggleReview}
            />
          ))}
        </div>
      )}

      {/* Quiz */}
      {mode === "quiz" && (
        <QuizSection
          category={category}
          reviewed={reviewed}
          onToggleReview={toggleReview}
        />
      )}
    </div>
  );
}
