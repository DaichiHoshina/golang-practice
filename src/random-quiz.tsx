import { useState, useMemo, useCallback } from "hono/jsx/dom";
import type { Quiz } from "./types";
import { TOPICS } from "./data";
import { HighlightedText } from "./term-highlight";

// ─── Collect all quizzes with topic metadata ─────────────

interface QuizWithMeta {
  quiz: Quiz;
  topicId: string;
  topicTitle: string;
}

const ALL_QUIZZES: QuizWithMeta[] = Object.values(TOPICS).flatMap((topic) =>
  (topic.quizzes ?? []).map((q) => ({
    quiz: q,
    topicId: topic.id,
    topicTitle: topic.title,
  })),
);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Types ───────────────────────────────────────────────

type Result = "correct" | "wrong";

export interface QuizScores {
  [key: string]: Result;
}

// ─── Component ───────────────────────────────────────────

const BLANK = "____";

interface Props {
  scores: QuizScores;
  onScore: (key: string, result: Result) => void;
}

export function RandomQuiz({ scores, onScore }: Props) {
  const [queue, setQueue] = useState<QuizWithMeta[]>(() =>
    shuffle(ALL_QUIZZES),
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  const current = queue[currentIdx];
  const total = ALL_QUIZZES.length;

  const correctCount = Object.values(scores).filter(
    (r) => r === "correct",
  ).length;
  const wrongCount = Object.values(scores).filter((r) => r === "wrong").length;
  const answered = correctCount + wrongCount;

  const qType = current?.quiz.type ?? "text";
  const allOpen = current ? openSet.size >= current.quiz.blanks.length : false;

  const toggleBlank = (idx: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  /** Build inline text with clickable blanks for text type */
  const textElements = useMemo(() => {
    if (!current || qType !== "text") return null;
    const parts = current.quiz.code.split(BLANK);
    const result: ReturnType<typeof HighlightedText>[] = [];
    let bi = 0;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i])
        result.push(<HighlightedText key={`t${i}`} text={parts[i]} />);
      if (i < parts.length - 1 && bi < current.quiz.blanks.length) {
        const idx = bi;
        if (openSet.has(idx)) {
          result.push(
            <span key={`b${idx}`} class="text-blank-revealed">
              {current.quiz.blanks[idx]}
            </span>,
          );
        } else {
          result.push(
            <button
              key={`b${idx}`}
              class="text-blank-hidden"
              onClick={() => toggleBlank(idx)}
            >
              ____
            </button>,
          );
        }
        bi++;
      }
    }
    return result;
  }, [current, openSet, qType]);

  const scoreKey = current ? `${current.topicId}_${currentIdx % total}` : "";

  const handleResult = useCallback(
    (result: Result) => {
      onScore(scoreKey, result);
      setOpenSet(new Set());
      setCurrentIdx((i) => {
        if (i + 1 >= queue.length) {
          const wrongKeys = new Set(
            Object.entries(scores)
              .filter(([, r]) => r === "wrong")
              .map(([k]) => k.split("_")[0]),
          );
          const priority = ALL_QUIZZES.filter((q) => wrongKeys.has(q.topicId));
          const rest = ALL_QUIZZES.filter((q) => !wrongKeys.has(q.topicId));
          setQueue([...shuffle(priority), ...shuffle(rest)]);
          return 0;
        }
        return i + 1;
      });
    },
    [scoreKey, onScore, scores, queue.length],
  );

  const handleReshuffle = useCallback(() => {
    setQueue(shuffle(ALL_QUIZZES));
    setCurrentIdx(0);
    setOpenSet(new Set());
  }, []);

  if (!current) return null;

  return (
    <div class="space-y-5">
      {/* Header */}
      <div>
        <div class="flex items-start gap-3">
          <span class="text-3xl leading-none mt-1">?</span>
          <div>
            <h1 class="text-xl font-bold">ランダム出題</h1>
            <p class="text-sm opacity-40 mt-0.5">
              穴埋め問題をランダムに出題。間違えた問題は優先的に再出題。
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div class="flex items-center gap-4 mt-4">
          <div class="flex gap-3 text-xs">
            <span class="text-success font-bold">{correctCount} 正解</span>
            <span class="text-error font-bold">{wrongCount} 不正解</span>
            <span class="opacity-40">{total - answered} 未回答</span>
          </div>
          <progress
            class="progress progress-info flex-1 h-1.5"
            value={total > 0 ? (answered / total) * 100 : 0}
            max={100}
          />
          <button
            class="btn btn-ghost btn-xs opacity-40"
            onClick={handleReshuffle}
            aria-label="シャッフル"
          >
            シャッフル
          </button>
        </div>
      </div>

      {/* Quiz Card */}
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="badge badge-info badge-sm">{current.topicTitle}</span>
            <span class="text-xs opacity-30">
              {currentIdx + 1} / {queue.length}
            </span>
          </div>

          {/* Question display based on type */}
          {qType === "concept" ? (
            <p class="text-sm font-medium leading-relaxed mb-1">
              <HighlightedText text={current.quiz.code} />
            </p>
          ) : (
            <p class="text-sm leading-relaxed">
              <span>{textElements}</span>
            </p>
          )}

          {/* Concept: hint badges */}
          {qType === "concept" && (
            <div class="mt-3 flex flex-wrap gap-2">
              {current.quiz.blanks.map((b, i) =>
                openSet.has(i) ? (
                  <span key={i} class="badge badge-secondary badge-sm">
                    {b}
                  </span>
                ) : (
                  <button
                    key={i}
                    class="badge badge-ghost badge-sm cursor-pointer hover:badge-secondary transition-colors"
                    onClick={() => toggleBlank(i)}
                  >
                    ヒント {i + 1}
                  </button>
                ),
              )}
            </div>
          )}

          {allOpen && (
            <div class="mt-3 space-y-3">
              <div
                class={`border rounded-lg p-3 ${qType === "concept" ? "bg-secondary/5 border-secondary/15" : "bg-info/5 border-info/15"}`}
              >
                <p class="text-xs opacity-80 leading-relaxed">
                  <HighlightedText text={current.quiz.explanation} />
                </p>
              </div>

              <div class="flex gap-2 pt-1">
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

      {/* Accuracy */}
      {answered > 0 && (
        <div class="card bg-base-200 border border-base-300">
          <div class="card-body p-4">
            <div class="text-xs font-bold opacity-50 mb-2">正答率</div>
            <div class="flex items-center gap-3">
              <div
                class="radial-progress text-primary text-sm"
                style={`--value:${Math.round((correctCount / answered) * 100)}; --size:3.5rem; --thickness:4px;`}
              >
                {Math.round((correctCount / answered) * 100)}%
              </div>
              <div class="text-xs opacity-60 leading-relaxed">
                <p>
                  {answered} 問回答 / 全 {total} 問
                </p>
                <p class="mt-0.5">
                  {wrongCount > 0
                    ? `${wrongCount} 問を優先的に再出題します`
                    : "全問正解中!"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
