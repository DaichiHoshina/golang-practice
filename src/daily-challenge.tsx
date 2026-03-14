import { useState, useMemo, useCallback } from "hono/jsx/dom";
import type { Quiz } from "./types";
import { TOPICS } from "./data";
import { HighlightedText } from "./term-highlight";
import { PlayIcon } from "./icons";

// ─── Daily quiz selection ─────────────────────────────────

interface DailyQuiz {
  quiz: Quiz;
  topicId: string;
  topicTitle: string;
}

const ALL: DailyQuiz[] = Object.values(TOPICS).flatMap((t) =>
  (t.quizzes ?? []).map((q) => ({
    quiz: q,
    topicId: t.id,
    topicTitle: t.title,
  })),
);

/** Deterministic shuffle based on a seed string */
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
    h |= 0;
  }
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 17), 0x9e3779b9);
    h = Math.imul(h ^ (h >>> 5), 0x6c62272e);
    h ^= h >>> 13;
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DAILY_COUNT = 5;

function getDailyQuizzes(): DailyQuiz[] {
  const today = new Date().toISOString().slice(0, 10);
  return seededShuffle(ALL, today).slice(0, DAILY_COUNT);
}

// ─── Blank rendering ─────────────────────────────────────

const BLANK_MARKER = "____";

function TextWithBlanks({
  text,
  blanks,
  openSet,
  onToggle,
}: {
  text: string;
  blanks: string[];
  openSet: Set<number>;
  onToggle: (i: number) => void;
}) {
  const parts = text.split(BLANK_MARKER);
  const elements: unknown[] = [];
  let bi = 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i])
      elements.push(<HighlightedText key={`t${i}`} text={parts[i]} />);
    if (i < parts.length - 1 && bi < blanks.length) {
      const idx = bi;
      elements.push(
        openSet.has(idx) ? (
          <span key={`b${idx}`} class="text-blank-revealed">
            {blanks[idx]}
          </span>
        ) : (
          <button
            key={`b${idx}`}
            class="text-blank-hidden"
            onClick={() => onToggle(idx)}
          >
            ____
          </button>
        ),
      );
      bi++;
    }
  }
  return <span>{elements}</span>;
}

// ─── Component ────────────────────────────────────────────

interface Props {
  onComplete: (correct: number, total: number) => void;
}

export function DailyChallenge({ onComplete }: Props) {
  const dailyQuizzes = useMemo(() => getDailyQuizzes(), []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<("correct" | "wrong")[]>([]);
  const [done, setDone] = useState(false);

  const current = dailyQuizzes[currentIdx];
  const qType = current?.quiz.type ?? "text";
  const allOpen = current ? openSet.size >= current.quiz.blanks.length : false;

  const toggle = useCallback((i: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, []);

  const handleResult = useCallback(
    (result: "correct" | "wrong") => {
      const newResults = [...results, result];
      setResults(newResults);
      if (currentIdx + 1 >= dailyQuizzes.length) {
        setDone(true);
        onComplete(
          newResults.filter((r) => r === "correct").length,
          dailyQuizzes.length,
        );
      } else {
        setCurrentIdx((i) => i + 1);
        setOpenSet(new Set());
      }
    },
    [results, currentIdx, dailyQuizzes.length, onComplete],
  );

  if (done) {
    const correctCount = results.filter((r) => r === "correct").length;
    const pct = Math.round((correctCount / dailyQuizzes.length) * 100);
    const msg =
      pct === 100
        ? "パーフェクト! 完璧だ!"
        : pct >= 80
          ? "素晴らしい! 今日も好調!"
          : pct >= 60
            ? "いい調子! 明日も続けよう!"
            : "繰り返しで定着させよう!";

    return (
      <div class="space-y-5">
        <div>
          <h1 class="text-xl font-bold">今日のチャレンジ 完了!</h1>
        </div>
        <div class="card bg-base-200">
          <div class="card-body p-6 text-center">
            <div class="text-5xl mb-3">
              {pct === 100 ? "🏆" : pct >= 80 ? "🌟" : pct >= 60 ? "💪" : "📚"}
            </div>
            <div
              class="radial-progress text-primary text-lg mx-auto mb-3"
              style={`--value:${pct}; --size:5rem; --thickness:5px;`}
            >
              {pct}%
            </div>
            <p class="text-sm font-semibold text-primary/80">{msg}</p>
            <p class="text-xs opacity-80 mt-1">
              {correctCount} / {dailyQuizzes.length} 問正解
            </p>
          </div>
        </div>
        <div class="flex gap-2 mt-2">
          {results.map((r, i) => (
            <div
              key={i}
              class={`flex-1 h-2 rounded-full ${r === "correct" ? "bg-success" : "bg-error"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div class="space-y-5">
      {/* Header */}
      <div>
        <div class="flex items-start gap-3">
          <span class="text-3xl leading-none mt-1">📅</span>
          <div>
            <h1 class="text-xl font-bold">今日のチャレンジ</h1>
            <p class="text-sm opacity-85 mt-0.5">
              毎日5問。今日の問題は{new Date().toLocaleDateString("ja-JP")}版。
            </p>
          </div>
        </div>
        {/* Progress dots */}
        <div class="flex gap-2 mt-4">
          {dailyQuizzes.map((_, i) => (
            <div
              key={i}
              class={`flex-1 h-1.5 rounded-full transition-colors ${
                i < results.length
                  ? results[i] === "correct"
                    ? "bg-success"
                    : "bg-error"
                  : i === currentIdx
                    ? "bg-primary"
                    : "bg-base-300"
              }`}
            />
          ))}
        </div>
        <div class="text-xs opacity-60 mt-1 text-right">
          {currentIdx + 1} / {dailyQuizzes.length}
        </div>
      </div>

      {/* Quiz Card */}
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="badge badge-info badge-sm">{current.topicTitle}</span>
            <span class="badge badge-ghost badge-sm">
              {qType === "concept" ? "理論問題" : "穴埋め"}
            </span>
          </div>

          {qType === "concept" ? (
            <>
              <p class="text-sm font-medium leading-relaxed mb-3">
                <HighlightedText text={current.quiz.code} />
              </p>
              <div class="flex flex-wrap gap-2">
                {current.quiz.blanks.map((b, i) =>
                  openSet.has(i) ? (
                    <span key={i} class="badge badge-secondary badge-sm">
                      {b}
                    </span>
                  ) : (
                    <button
                      key={i}
                      class="badge badge-ghost badge-sm cursor-pointer hover:badge-secondary transition-colors"
                      onClick={() => toggle(i)}
                    >
                      ヒント {i + 1}
                    </button>
                  ),
                )}
              </div>
            </>
          ) : (
            <p class="text-sm leading-relaxed">
              <TextWithBlanks
                text={current.quiz.code}
                blanks={current.quiz.blanks}
                openSet={openSet}
                onToggle={toggle}
              />
            </p>
          )}

          {allOpen && (
            <div class="mt-3 space-y-3">
              <div class="bg-secondary/10 border border-secondary/25 rounded-lg p-3">
                <p class="text-xs opacity-90 leading-relaxed">
                  <HighlightedText text={current.quiz.explanation} />
                </p>
                {current.quiz.playgroundUrl && (
                  <a
                    href={current.quiz.playgroundUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                  >
                    <PlayIcon size={12} />
                    Playground で試す
                  </a>
                )}
              </div>
              <div class="flex gap-2">
                <button
                  class="btn btn-success btn-sm flex-1"
                  onClick={() => handleResult("correct")}
                >
                  わかった
                </button>
                <button
                  class="btn btn-error btn-outline btn-sm flex-1"
                  onClick={() => handleResult("wrong")}
                >
                  もう一度
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
