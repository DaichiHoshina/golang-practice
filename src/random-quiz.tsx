import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "hono/jsx/dom";
import type { Quiz } from "./types";
import { getQuizDifficulty } from "./types";
import { TOPICS, SECTIONS } from "./data";
import { HighlightedText } from "./term-highlight";
import {
  DiceIcon,
  ShuffleIcon,
  CheckIcon,
  RefreshCwIcon,
  TimerIcon,
  PlayIcon,
} from "./icons";
import { isDue, countDue } from "./srs";

// ─── Collect all quizzes with topic metadata ─────────────

interface QuizWithMeta {
  quiz: Quiz;
  topicId: string;
  topicTitle: string;
  sectionId: string;
}

const ALL_QUIZZES: QuizWithMeta[] = Object.values(TOPICS).flatMap((topic) =>
  (topic.quizzes ?? []).map((q) => ({
    quiz: q,
    topicId: topic.id,
    topicTitle: topic.title,
    sectionId: topic.section,
  })),
);

/** Section options for filter */
const SECTION_OPTIONS = SECTIONS.filter((s) => s.id !== "dashboard")
  .map((s) => ({
    id: s.id,
    title: s.title,
    icon: s.icon,
    count: ALL_QUIZZES.filter((q) => q.sectionId === s.id).length,
  }))
  .filter((s) => s.count > 0);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Difficulty = "all" | "easy" | "medium" | "hard";
type QuizMode = "normal" | "review" | "weak";

function getPool(sectionId: string, difficulty: Difficulty): QuizWithMeta[] {
  let pool =
    sectionId === "all"
      ? ALL_QUIZZES
      : ALL_QUIZZES.filter((q) => q.sectionId === sectionId);
  if (difficulty !== "all") {
    pool = pool.filter((q) => getQuizDifficulty(q.quiz) === difficulty);
  }
  return pool;
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
  srsData: import("./srs").SRSStore;
  onScore: (key: string, result: Result) => void;
}

const CELEBRATE_EMOJIS = ["🎉", "✨", "🔥", "⭐", "💪", "🚀", "👏", "💯"];
const CONFETTI_COLORS = [
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
];

function CelebrationBurst() {
  const emojis = Array.from({ length: 4 }, (_, i) => ({
    emoji:
      CELEBRATE_EMOJIS[Math.floor(Math.random() * CELEBRATE_EMOJIS.length)],
    left: 20 + Math.random() * 60,
    delay: i * 0.1,
  }));
  const dots = Array.from({ length: 8 }, (_, i) => ({
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: 10 + Math.random() * 80,
    delay: Math.random() * 0.3,
  }));
  return (
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      {emojis.map((e, i) => (
        <span
          key={`e${i}`}
          class="celebrate-emoji"
          style={`left:${e.left}%;top:60%;animation-delay:${e.delay}s`}
        >
          {e.emoji}
        </span>
      ))}
      {dots.map((d, i) => (
        <span
          key={`d${i}`}
          class="confetti-dot"
          style={`left:${d.left}%;top:50%;background:${d.color};animation-delay:${d.delay}s`}
        />
      ))}
    </div>
  );
}

const TIMER_SECONDS = 30;

export function RandomQuiz({ scores, srsData, onScore }: Props) {
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>("all");
  const [quizMode, setQuizMode] = useState<QuizMode>("normal");
  const [queue, setQueue] = useState<QuizWithMeta[]>(() =>
    shuffle(ALL_QUIZZES),
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [timerMode, setTimerMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const dueCount = useMemo(() => countDue(srsData), [srsData]);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current)
        clearTimeout(celebrationTimerRef.current);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!timerMode) return;
    setTimeLeft(TIMER_SECONDS);
  }, [currentIdx, timerMode]);

  useEffect(() => {
    if (!timerMode || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timerMode, timeLeft]);

  // When timer hits 0, reveal all blanks
  useEffect(() => {
    if (timerMode && timeLeft === 0 && currentIdx < queue.length) {
      const current = queue[currentIdx];
      if (current) {
        setOpenSet(
          new Set(
            Array.from({ length: current.quiz.blanks.length }, (_, i) => i),
          ),
        );
      }
    }
  }, [timerMode, timeLeft, currentIdx, queue]);

  /** Compute weak topic IDs (accuracy < 80%) */
  const weakTopicIds = useMemo(() => {
    const topicAcc = new Map<string, { correct: number; total: number }>();
    for (const [key, result] of Object.entries(scores)) {
      const topicId = key.split("_")[0];
      const prev = topicAcc.get(topicId) ?? { correct: 0, total: 0 };
      topicAcc.set(topicId, {
        correct: prev.correct + (result === "correct" ? 1 : 0),
        total: prev.total + 1,
      });
    }
    const ids = new Set<string>();
    for (const [id, stats] of topicAcc) {
      if (stats.total >= 1 && stats.correct / stats.total < 0.8) {
        ids.add(id);
      }
    }
    return ids;
  }, [scores]);

  /** Build queue with SRS-due items first, then wrong, then rest */
  const buildQueue = useCallback(
    (sectionId: string, difficulty: Difficulty, mode: QuizMode = "normal") => {
      let pool = getPool(sectionId, difficulty);

      if (mode === "review") {
        // Only SRS-due cards
        pool = pool.filter((q) => {
          const idx = ALL_QUIZZES.indexOf(q);
          const key = `${q.topicId}_${idx % pool.length}`;
          const card = srsData[key];
          return card && isDue(card);
        });
        return shuffle(pool);
      }

      if (mode === "weak") {
        // Only weak topics (< 80% accuracy)
        pool = pool.filter((q) => weakTopicIds.has(q.topicId));
        return shuffle(pool);
      }

      // Normal: SRS-due first, then rest
      const due: QuizWithMeta[] = [];
      const rest: QuizWithMeta[] = [];
      for (const q of pool) {
        const key = `${q.topicId}_${pool.indexOf(q) % pool.length}`;
        const card = srsData[key];
        if (card && isDue(card)) {
          due.push(q);
        } else {
          rest.push(q);
        }
      }
      return [...shuffle(due), ...shuffle(rest)];
    },
    [srsData, weakTopicIds],
  );

  const handleSectionChange = useCallback(
    (sectionId: string) => {
      setSelectedSection(sectionId);
      setQueue(buildQueue(sectionId, selectedDifficulty, quizMode));
      setCurrentIdx(0);
      setOpenSet(new Set());
    },
    [buildQueue, selectedDifficulty, quizMode],
  );

  const handleDifficultyChange = useCallback(
    (difficulty: Difficulty) => {
      setSelectedDifficulty(difficulty);
      setQueue(buildQueue(selectedSection, difficulty, quizMode));
      setCurrentIdx(0);
      setOpenSet(new Set());
    },
    [buildQueue, selectedSection, quizMode],
  );

  const handleModeChange = useCallback(
    (mode: QuizMode) => {
      setQuizMode(mode);
      setQueue(buildQueue(selectedSection, selectedDifficulty, mode));
      setCurrentIdx(0);
      setOpenSet(new Set());
    },
    [buildQueue, selectedSection, selectedDifficulty],
  );

  const current = queue[currentIdx];
  const pool = useMemo(
    () => getPool(selectedSection, selectedDifficulty),
    [selectedSection, selectedDifficulty],
  );
  const total = pool.length;

  const filteredScoreEntries = useMemo(() => {
    if (selectedSection === "all") return Object.entries(scores);
    return Object.entries(scores).filter(([k]) => {
      const topicId = k.split("_")[0];
      return TOPICS[topicId]?.section === selectedSection;
    });
  }, [scores, selectedSection]);

  const correctCount = filteredScoreEntries.filter(
    ([, r]) => r === "correct",
  ).length;
  const wrongCount = filteredScoreEntries.filter(
    ([, r]) => r === "wrong",
  ).length;
  const answered = correctCount + wrongCount;

  const qType = current?.quiz.type ?? "text";
  const allOpen = current ? openSet.size >= current.quiz.blanks.length : false;

  const toggleBlank = useCallback((idx: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  /** Reveal next unrevealed blank (for keyboard shortcut) */
  const revealNext = useCallback(() => {
    if (!current) return;
    for (let i = 0; i < current.quiz.blanks.length; i++) {
      if (!openSet.has(i)) {
        toggleBlank(i);
        return;
      }
    }
  }, [current, openSet, toggleBlank]);

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
  }, [current, openSet, qType, toggleBlank]);

  const scoreKey = current ? `${current.topicId}_${currentIdx % total}` : "";

  const handleResult = useCallback(
    (result: Result) => {
      onScore(scoreKey, result);
      if (result === "correct") {
        setStreak((s) => s + 1);
        if (celebrationTimerRef.current)
          clearTimeout(celebrationTimerRef.current);
        setShowCelebration(true);
        celebrationTimerRef.current = setTimeout(
          () => setShowCelebration(false),
          900,
        );
      } else {
        setStreak(0);
      }
      setOpenSet(new Set());
      setCurrentIdx((i) => {
        if (i + 1 >= queue.length) {
          const wrongKeys = new Set(
            Object.entries(scores)
              .filter(([, r]) => r === "wrong")
              .map(([k]) => k.split("_")[0]),
          );
          const p = pool.filter((q) => wrongKeys.has(q.topicId));
          const rest = pool.filter((q) => !wrongKeys.has(q.topicId));
          setQueue([...shuffle(p), ...shuffle(rest)]);
          return 0;
        }
        return i + 1;
      });
    },
    [scoreKey, onScore, scores, queue.length, pool],
  );

  const handleReshuffle = useCallback(() => {
    setQueue(buildQueue(selectedSection, selectedDifficulty, quizMode));
    setCurrentIdx(0);
    setOpenSet(new Set());
  }, [selectedSection, selectedDifficulty, quizMode, buildQueue]);

  // ─── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        revealNext();
      } else if (e.key === "ArrowRight" && allOpen) {
        e.preventDefault();
        handleResult("correct");
      } else if (e.key === "ArrowLeft" && allOpen) {
        e.preventDefault();
        handleResult("wrong");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealNext, allOpen, handleResult]);

  if (!current) {
    return (
      <div class="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <span class="text-5xl">📭</span>
        <p class="text-base font-semibold">
          このセクションにはクイズがありません
        </p>
        <p class="text-sm opacity-80">別のセクションを選択してください</p>
      </div>
    );
  }

  return (
    <div class="space-y-5">
      {/* Header */}
      <div>
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <DiceIcon size={28} class="shrink-0 mt-1 opacity-80" />
            <div>
              <h1 class="text-xl font-bold">ランダム出題</h1>
              <p class="text-sm opacity-85 mt-0.5">
                穴埋め問題をランダムに出題。SRS復習予定の問題を優先。
                {dueCount > 0 && (
                  <span class="badge badge-warning badge-xs ml-1.5 align-middle">
                    復習 {dueCount}件
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            class={`btn btn-sm gap-1.5 shrink-0 ${timerMode ? "btn-warning" : "btn-ghost opacity-80"}`}
            onClick={() => setTimerMode((v) => !v)}
            title="タイマーモード (30秒)"
          >
            <TimerIcon size={13} />
            {timerMode ? "タイマーON" : "タイマー"}
          </button>
        </div>

        {/* Section filter */}
        <div class="flex flex-wrap gap-1.5 mt-4">
          <button
            class={`badge badge-md cursor-pointer transition-colors py-1.5 px-3 ${selectedSection === "all" ? "badge-primary" : "badge-ghost hover:badge-primary"}`}
            onClick={() => handleSectionChange("all")}
          >
            全て ({ALL_QUIZZES.length})
          </button>
          {SECTION_OPTIONS.map((s) => (
            <button
              key={s.id}
              class={`badge badge-md cursor-pointer transition-colors py-1.5 px-3 ${selectedSection === s.id ? "badge-primary" : "badge-ghost hover:badge-primary"}`}
              onClick={() => handleSectionChange(s.id)}
            >
              {s.icon} {s.title} ({s.count})
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <div class="flex gap-1.5 mt-2">
          {(
            [
              { id: "all", label: "全難易度" },
              { id: "easy", label: "易" },
              { id: "medium", label: "中" },
              { id: "hard", label: "難" },
            ] as { id: Difficulty; label: string }[]
          ).map((d) => (
            <button
              key={d.id}
              class={`badge badge-sm cursor-pointer transition-colors py-1 px-2 ${
                selectedDifficulty === d.id
                  ? d.id === "easy"
                    ? "badge-success"
                    : d.id === "medium"
                      ? "badge-warning"
                      : d.id === "hard"
                        ? "badge-error"
                        : "badge-neutral"
                  : "badge-ghost hover:badge-neutral"
              }`}
              onClick={() => handleDifficultyChange(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Mode filter */}
        <div class="flex gap-1.5 mt-2">
          {[
            { id: "normal" as QuizMode, label: "通常" },
            {
              id: "review" as QuizMode,
              label: `復習 (${dueCount}件)`,
              disabled: dueCount === 0,
            },
            {
              id: "weak" as QuizMode,
              label: `苦手 (${weakTopicIds.size}件)`,
              disabled: weakTopicIds.size === 0,
            },
          ].map((m) => (
            <button
              key={m.id}
              class={`badge badge-sm cursor-pointer transition-colors py-1 px-2 ${
                quizMode === m.id
                  ? m.id === "review"
                    ? "badge-warning"
                    : m.id === "weak"
                      ? "badge-error"
                      : "badge-neutral"
                  : m.disabled
                    ? "badge-ghost opacity-40 cursor-not-allowed"
                    : "badge-ghost hover:badge-neutral"
              }`}
              onClick={() => !m.disabled && handleModeChange(m.id)}
              disabled={m.disabled}
            >
              {m.id === "review" ? "🔄 " : m.id === "weak" ? "🎯 " : ""}
              {m.label}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div class="flex items-center gap-4 mt-3">
          <div class="flex gap-3 text-xs">
            <span class="text-success font-bold">{correctCount} 正解</span>
            <span class="text-error font-bold">{wrongCount} 不正解</span>
            <span class="opacity-85">{total - answered} 未回答</span>
          </div>
          <progress
            class="progress progress-info flex-1 h-1.5"
            value={total > 0 ? (answered / total) * 100 : 0}
            max={100}
          />
          <button
            class="btn btn-ghost btn-xs opacity-80 gap-1"
            onClick={handleReshuffle}
            aria-label="シャッフル"
          >
            <ShuffleIcon size={11} />
            シャッフル
          </button>
        </div>
      </div>

      {/* Streak badge */}
      {streak >= 2 && (
        <div class="flex justify-center">
          <span class="streak-badge badge badge-warning gap-1 text-sm font-bold px-4 py-3">
            🔥 {streak}連続正解!
          </span>
        </div>
      )}

      {/* Screen reader announcement */}
      <div aria-live="polite" class="sr-only">
        {showCelebration ? "正解!" : ""}
      </div>

      {/* Quiz Card */}
      <div
        class="card bg-base-200 border border-base-300 relative overflow-hidden"
        role="region"
        aria-label="クイズ問題"
      >
        {showCelebration && <CelebrationBurst />}
        <div class="card-body p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="badge badge-info badge-sm">{current.topicTitle}</span>
            <div class="flex items-center gap-2">
              {timerMode && (
                <span
                  class={`text-xs font-mono font-bold ${timeLeft <= 10 ? "text-error" : timeLeft <= 20 ? "text-warning" : "text-success"}`}
                >
                  {timeLeft}s
                </span>
              )}
              <span class="text-xs opacity-85">
                {currentIdx + 1} / {queue.length}
              </span>
            </div>
          </div>
          {timerMode && (
            <progress
              class={`progress h-1 mb-3 w-full ${timeLeft <= 10 ? "progress-error" : timeLeft <= 20 ? "progress-warning" : "progress-success"}`}
              value={timeLeft}
              max={TIMER_SECONDS}
            />
          )}

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
                class={`border rounded-lg p-3 ${qType === "concept" ? "bg-secondary/10 border-secondary/25" : "bg-info/10 border-info/25"}`}
              >
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

              <div class="flex gap-2 pt-1">
                <button
                  class="btn btn-success btn-sm flex-1 gap-1.5"
                  onClick={() => handleResult("correct")}
                >
                  <CheckIcon size={14} />
                  わかった
                  <kbd class="kbd kbd-xs ml-0.5 opacity-80 hidden sm:inline">
                    →
                  </kbd>
                </button>
                <button
                  class="btn btn-error btn-outline btn-sm flex-1 gap-1.5"
                  onClick={() => handleResult("wrong")}
                >
                  <RefreshCwIcon size={13} />
                  もう一度
                  <kbd class="kbd kbd-xs ml-0.5 opacity-80 hidden sm:inline">
                    ←
                  </kbd>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard hint */}
      <div class="text-center text-xs opacity-80 hidden sm:block">
        <kbd class="kbd kbd-xs">Space</kbd> 次のブランクを開く{" "}
        <kbd class="kbd kbd-xs">→</kbd> わかった <kbd class="kbd kbd-xs">←</kbd>{" "}
        もう一度
      </div>

      {/* Accuracy */}
      {answered > 0 &&
        (() => {
          const pct = Math.round((correctCount / answered) * 100);
          const milestone =
            pct === 100
              ? { icon: "🏆", msg: "パーフェクト! 完璧です!", glow: true }
              : pct >= 80
                ? { icon: "🌟", msg: "素晴らしい! この調子!", glow: false }
                : pct >= 60
                  ? { icon: "💪", msg: "いい感じ! もう少し!", glow: false }
                  : pct >= 40
                    ? { icon: "📚", msg: "着実に成長中!", glow: false }
                    : {
                        icon: "🌱",
                        msg: "繰り返しが大事! 頑張ろう!",
                        glow: false,
                      };
          return (
            <div
              class={`card bg-base-200 border border-base-300 ${milestone.glow ? "milestone-card" : ""}`}
            >
              <div class="card-body p-4">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">{milestone.icon}</span>
                  <span class="text-xs font-bold opacity-85">正答率</span>
                </div>
                <div class="flex items-center gap-3">
                  <div
                    class="radial-progress text-primary text-sm"
                    style={`--value:${pct}; --size:3.5rem; --thickness:4px;`}
                  >
                    {pct}%
                  </div>
                  <div class="text-xs opacity-90 leading-relaxed">
                    <p class="font-semibold text-primary/80">{milestone.msg}</p>
                    <p class="mt-0.5">
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
          );
        })()}
    </div>
  );
}
