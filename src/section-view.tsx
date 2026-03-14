import { useState, useMemo } from "hono/jsx/dom";
import type { Topic, Section, InterviewPoint, Quiz } from "./types";
import { TOPICS, SECTIONS, TAG_BADGE } from "./data";
import { HighlightedText } from "./term-highlight";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MessageSquareIcon,
  ArrowLeftRightIcon,
  PencilIcon,
  BookmarkIcon,
  BookmarkOutlineIcon,
  PlayIcon,
  HighlighterIcon,
} from "./icons";
import hljs from "highlight.js/lib/core";
import go from "highlight.js/lib/languages/go";

hljs.registerLanguage("go", go);

// ─── Code Block ──────────────────────────────────────────
// Note: dangerouslySetInnerHTML is safe here because input is only
// hardcoded Go code strings from data.ts, never user input.

// Note: dangerouslySetInnerHTML usage below is SAFE because the input is only
// hardcoded Go code strings from data.ts (never user input). highlight.js
// output is trusted and does not contain executable scripts.

function CodeBlock({
  code,
  variant,
  onTry,
}: {
  code: string;
  variant: "good" | "bad";
  onTry?: (code: string) => void;
}) {
  const cls = variant === "good" ? "code-good" : "code-bad";
  const label =
    variant === "good"
      ? { text: "✓ Good", color: "text-success" }
      : { text: "✗ Bad", color: "text-error" };

  const highlighted = useMemo(
    () => hljs.highlight(code, { language: "go" }).value,
    [code],
  );

  return (
    <div class="my-3">
      <div class={`flex items-center justify-between mb-1.5`}>
        <span class={`text-xs font-bold ${label.color}`}>{label.text}</span>
        {onTry && (
          <button
            class="btn btn-ghost btn-xs gap-1 text-primary"
            onClick={() => onTry(code)}
          >
            <PlayIcon size={10} />
            Try
          </button>
        )}
      </div>
      <pre class={`code-block ${cls}`}>
        <code class="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

// ─── Interview Point Item ────────────────────────────────

function InterviewPointItem({
  item,
  highlighted,
  onToggleHighlight,
}: {
  item: InterviewPoint;
  highlighted?: boolean;
  onToggleHighlight?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!item.detail;

  return (
    <li
      class={`text-xs leading-relaxed rounded-md transition-colors ${highlighted ? "bg-warning/15 px-2 py-1 -mx-2" : "opacity-90"}`}
    >
      <div
        class={`flex gap-2 ${hasDetail ? "cursor-pointer hover:opacity-100 transition-opacity rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary/60 outline-none" : ""}`}
        onClick={() => hasDetail && setOpen((o: boolean) => !o)}
        role={hasDetail ? "button" : undefined}
        tabIndex={hasDetail ? 0 : undefined}
        aria-expanded={hasDetail ? open : undefined}
        onKeyDown={(e: KeyboardEvent) => {
          if (hasDetail && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((o: boolean) => !o);
          }
        }}
      >
        <span class="text-secondary shrink-0 mt-0.5">→</span>
        <span class="flex-1">
          <HighlightedText text={item.point} />
          {hasDetail && (
            <span class="ml-1.5 text-secondary/70 inline-flex items-center gap-0.5 text-[0.65rem]">
              {open ? (
                <ChevronUpIcon size={10} />
              ) : (
                <ChevronDownIcon size={10} />
              )}
              {!open && "詳細"}
            </span>
          )}
        </span>
        {onToggleHighlight && (
          <button
            class={`shrink-0 p-0.5 rounded transition-colors ${highlighted ? "text-warning" : "text-base-content/20 hover:text-warning/60"}`}
            onClick={(e: Event) => {
              e.stopPropagation();
              onToggleHighlight();
            }}
            aria-label={highlighted ? "マーカー解除" : "マーカーを付ける"}
            title={highlighted ? "マーカー解除" : "マーカーを付ける"}
          >
            <HighlighterIcon size={11} />
          </button>
        )}
      </div>
      {open && item.detail && (
        <div class="ml-5 mt-1.5 pl-3 border-l-2 border-secondary/30 text-xs opacity-90 leading-relaxed">
          <HighlightedText text={item.detail} />
        </div>
      )}
    </li>
  );
}

// ─── Interview Box ───────────────────────────────────────

function InterviewBox({
  points,
  topicId,
  highlights,
  onToggleHighlight,
}: {
  points: InterviewPoint[];
  topicId: string;
  highlights: Record<string, boolean>;
  onToggleHighlight: (key: string) => void;
}) {
  return (
    <div class="mt-4 bg-secondary/10 border border-secondary/30 rounded-box p-4">
      <div class="text-xs font-bold text-secondary mb-2.5 flex items-center gap-1.5">
        <MessageSquareIcon size={11} />
        面接で答えるときのポイント
      </div>
      <ul class="space-y-1.5">
        {points.map((p, i) => {
          const key = `${topicId}:ip:${i}`;
          return (
            <InterviewPointItem
              key={i}
              item={p}
              highlighted={!!highlights[key]}
              onToggleHighlight={() => onToggleHighlight(key)}
            />
          );
        })}
      </ul>
    </div>
  );
}

// ─── Quiz Card ───────────────────────────────────────────

const BLANK_MARKER = "____";

/** Split text by ____ and render with inline clickable blanks */
function TextWithBlanks({
  text,
  blanks,
  openSet,
  onToggle,
}: {
  text: string;
  blanks: string[];
  openSet: Set<number>;
  onToggle: (idx: number) => void;
}) {
  const parts = text.split(BLANK_MARKER);
  const elements: (string | ReturnType<typeof HighlightedText>)[] = [];
  let blankIdx = 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i])
      elements.push(<HighlightedText key={`t${i}`} text={parts[i]} />);
    if (i < parts.length - 1 && blankIdx < blanks.length) {
      const idx = blankIdx;
      if (openSet.has(idx)) {
        elements.push(
          <span key={`b${idx}`} class="text-blank-revealed">
            {blanks[idx]}
          </span>,
        );
      } else {
        elements.push(
          <button
            key={`b${idx}`}
            class="text-blank-hidden"
            onClick={() => onToggle(idx)}
          >
            ____
          </button>,
        );
      }
      blankIdx++;
    }
  }
  return <span>{elements}</span>;
}

function QuizCard({ quiz, index }: { quiz: Quiz; index: number }) {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());
  const qType = quiz.type ?? "text";
  const allOpen = openSet.size >= quiz.blanks.length;

  const toggle = (idx: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  // ── Concept type ──
  if (qType === "concept") {
    return (
      <div class="border border-secondary/30 rounded-box overflow-hidden">
        <div class="bg-secondary/10 px-4 py-2 flex items-center justify-between">
          <span class="text-xs font-bold text-secondary">
            Q{index + 1}. 理論問題
          </span>
          {!allOpen && (
            <span class="text-[0.65rem] opacity-80">
              考えてから答えを見よう
            </span>
          )}
        </div>
        <div class="p-3">
          <p class="text-sm font-medium leading-relaxed mb-3">
            <HighlightedText text={quiz.code} />
          </p>
          <div class="flex flex-wrap gap-2">
            {quiz.blanks.map((b, i) =>
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
          {allOpen && (
            <div class="mt-3 bg-secondary/10 border border-secondary/25 rounded-lg p-3">
              <p class="text-xs opacity-90 leading-relaxed">
                <HighlightedText text={quiz.explanation} />
              </p>
              {quiz.playgroundUrl && (
                <a
                  href={quiz.playgroundUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                >
                  <PlayIcon size={12} />
                  Playground で試す
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Text fill-in-blank type (default) ──
  return (
    <div class="border border-info/30 rounded-box overflow-hidden">
      <div class="bg-info/10 px-4 py-2 flex items-center justify-between">
        <span class="text-xs font-bold text-info">
          Q{index + 1}. 穴埋め問題
        </span>
        {!allOpen && (
          <span class="text-[0.65rem] opacity-80">
            ____ をクリックして答えを開こう
          </span>
        )}
      </div>
      <div class="p-3">
        <p class="text-sm leading-relaxed">
          <TextWithBlanks
            text={quiz.code}
            blanks={quiz.blanks}
            openSet={openSet}
            onToggle={toggle}
          />
        </p>
        {allOpen && (
          <div class="mt-3 bg-info/10 border border-info/25 rounded-lg p-3">
            <p class="text-xs opacity-90 leading-relaxed">
              <HighlightedText text={quiz.explanation} />
            </p>
            {quiz.playgroundUrl && (
              <a
                href={quiz.playgroundUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
              >
                <PlayIcon size={12} />
                Playground で試す
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizSection({ quizzes }: { quizzes: Quiz[] }) {
  if (!quizzes.length) return null;
  return (
    <div class="mt-4 space-y-3">
      <div class="text-xs font-bold opacity-85">確認問題</div>
      {quizzes.map((q, i) => (
        <QuizCard key={i} quiz={q} index={i} />
      ))}
    </div>
  );
}

// ─── Tradeoff Box ────────────────────────────────────────

function TradeoffBox({
  tradeoffs,
}: {
  tradeoffs: { title: string; desc: string }[];
}) {
  if (!tradeoffs.length) return null;
  return (
    <div class="mt-4 bg-warning/10 border border-warning/30 rounded-box p-4">
      <div
        class="text-xs font-bold mb-2.5 flex items-center gap-1.5"
        style="color: oklch(0.52 0.14 80)"
      >
        <ArrowLeftRightIcon size={11} />
        トレードオフ
      </div>
      <div class="space-y-2">
        {tradeoffs.map((t, i) => (
          <p key={i} class="text-xs opacity-90 leading-relaxed">
            <span class="font-semibold" style="color: oklch(0.52 0.14 80)">
              {t.title}:{" "}
            </span>
            <HighlightedText text={t.desc} />
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Related Topics ──────────────────────────────────────

function RelatedTopics({
  topic,
  onNavigate,
}: {
  topic: Topic;
  onNavigate: (id: string) => void;
}) {
  // Find topics in the same section (excluding self)
  const section = SECTIONS.find((s) => s.id === topic.section);
  const sameSection = (section?.topicIds ?? [])
    .filter((id) => id !== topic.id)
    .map((id) => TOPICS[id])
    .filter(Boolean);

  if (sameSection.length === 0) return null;

  return (
    <div>
      <p class="text-xs font-semibold opacity-85 mb-1.5">関連トピック</p>
      <div class="flex flex-wrap gap-1.5">
        {sameSection.map((t) => (
          <button
            key={t.id}
            class="badge badge-ghost badge-sm cursor-pointer hover:badge-info transition-colors"
            onClick={(e: Event) => {
              e.stopPropagation();
              onNavigate(topic.section);
            }}
          >
            {t.title}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Topic Card ──────────────────────────────────────────

function TopicCard({
  topic,
  completed,
  onToggleComplete,
  note,
  onNoteChange,
  onNavigate,
  bookmarked,
  onToggleBookmark,
  highlights,
  onToggleHighlight,
  onOpenPlayground,
}: {
  topic: Topic;
  completed: boolean;
  onToggleComplete: () => void;
  note: string;
  onNoteChange: (v: string) => void;
  onNavigate: (id: string) => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  highlights: Record<string, boolean>;
  onToggleHighlight: (key: string) => void;
  onOpenPlayground?: (code: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const badgeCls = TAG_BADGE[topic.tag] || "badge-ghost";
  const cardHighlighted = !!highlights[`topic:${topic.id}`];

  return (
    <div class={`card border-l-4 transition-all ${cardHighlighted ? "bg-warning/8 border-l-warning border-t-warning/30 border-r-warning/30 border-b-warning/30" : completed ? "bg-base-200 border-l-success border-t-base-300 border-r-base-300 border-b-base-300" : "bg-base-200 border-base-300"}`}>
      {/* Header */}
      <div
        class="card-body p-4 cursor-pointer rounded-t-box focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 outline-none"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((e: boolean) => !e)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((prev: boolean) => !prev);
          }
        }}
      >
        <div class="flex items-start gap-3">
          <label class="sr-only" for={`check-${topic.id}`}>
            {topic.title} を完了にする
          </label>
          <input
            id={`check-${topic.id}`}
            type="checkbox"
            class="checkbox checkbox-primary checkbox-sm mt-0.5 shrink-0"
            checked={completed}
            onClick={(e: Event) => {
              e.stopPropagation();
              onToggleComplete();
            }}
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3
                class={`text-sm font-semibold leading-snug ${
                  completed ? "line-through opacity-60" : ""
                }`}
              >
                {topic.title}
              </h3>
              <span class={`badge badge-sm ${badgeCls}`}>{topic.tag}</span>
            </div>
            <p class="text-xs opacity-90 mt-1.5 leading-relaxed">
              <HighlightedText text={topic.summary} />
            </p>
          </div>
          <div class="flex items-center gap-1 shrink-0 mt-0.5">
            <button
              class={`p-1 rounded transition-colors ${cardHighlighted ? "text-warning" : "text-base-content/30 hover:text-warning/60"}`}
              onClick={(e: Event) => {
                e.stopPropagation();
                onToggleHighlight(`topic:${topic.id}`);
              }}
              aria-label={cardHighlighted ? "マーカー解除" : "マーカーを付ける"}
              title={cardHighlighted ? "マーカー解除" : "マーカーを付ける"}
            >
              <HighlighterIcon size={12} />
            </button>
            <button
              class={`p-1 rounded transition-colors ${bookmarked ? "text-warning" : "text-base-content/30 hover:text-warning/70"}`}
              onClick={(e: Event) => {
                e.stopPropagation();
                onToggleBookmark();
              }}
              aria-label={bookmarked ? "ブックマーク解除" : "ブックマーク追加"}
              title={bookmarked ? "ブックマーク解除" : "ブックマーク追加"}
            >
              {bookmarked ? (
                <BookmarkIcon size={12} />
              ) : (
                <BookmarkOutlineIcon size={12} />
              )}
            </button>
            <span class="opacity-60">
              {expanded ? (
                <ChevronUpIcon size={14} />
              ) : (
                <ChevronDownIcon size={14} />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div class="card-body pt-0 border-t border-base-300 space-y-4">
          {/* Why */}
          <div>
            <p class="text-xs font-semibold opacity-85 mb-1">
              なぜそうするのか
            </p>
            <p class="text-xs opacity-90 leading-relaxed">
              <HighlightedText text={topic.why} />
            </p>
          </div>

          <TradeoffBox tradeoffs={topic.tradeoffs} />

          {/* Code Examples */}
          {topic.badCode && (
            <div>
              <CodeBlock
                code={topic.badCode}
                variant="bad"
                onTry={onOpenPlayground}
              />
              <CodeBlock
                code={topic.goodCode}
                variant="good"
                onTry={onOpenPlayground}
              />
            </div>
          )}

          <InterviewBox
              points={topic.interviewPoints}
              topicId={topic.id}
              highlights={highlights}
              onToggleHighlight={onToggleHighlight}
            />

          {/* Quizzes */}
          {topic.quizzes && topic.quizzes.length > 0 && (
            <QuizSection quizzes={topic.quizzes} />
          )}

          {/* Related Topics */}
          <RelatedTopics topic={topic} onNavigate={onNavigate} />

          {/* Notes */}
          <div>
            <label
              for={`note-${topic.id}`}
              class="text-xs font-semibold opacity-85 mb-1.5 flex items-center gap-1"
            >
              <PencilIcon size={10} />
              学習メモ
            </label>
            <textarea
              id={`note-${topic.id}`}
              class="textarea textarea-bordered w-full text-xs"
              rows={3}
              placeholder="気づき・疑問・実務での経験をメモ..."
              value={note}
              onInput={(e: Event) =>
                onNoteChange((e.target as HTMLTextAreaElement).value)
              }
              onClick={(e: Event) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section View ────────────────────────────────────────

interface SectionViewProps {
  section: Section;
  completed: Record<string, boolean>;
  notes: Record<string, string>;
  bookmarks: Record<string, boolean>;
  highlights: Record<string, boolean>;
  onToggleComplete: (id: string) => void;
  onNoteChange: (id: string, val: string) => void;
  onToggleBookmark: (id: string) => void;
  onToggleHighlight: (key: string) => void;
  onNavigate: (id: string) => void;
  onOpenPlayground?: (code: string) => void;
}

export function SectionView({
  section,
  completed,
  notes,
  bookmarks,
  highlights,
  onToggleComplete,
  onNoteChange,
  onToggleBookmark,
  onToggleHighlight,
  onNavigate,
  onOpenPlayground,
}: SectionViewProps) {
  const topics = section.topicIds.map((id) => TOPICS[id]).filter(Boolean);
  const doneCount = topics.filter((t) => completed[t.id]).length;

  return (
    <div class="space-y-5">
      {/* Header */}
      <div>
        <div class="flex items-start gap-3">
          <span class="text-3xl leading-none mt-1">{section.icon}</span>
          <div>
            <h1 class="text-xl font-bold">{section.title}</h1>
            <p class="text-sm opacity-85 mt-0.5">{section.description}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-4">
          <progress
            class="progress progress-primary flex-1"
            value={topics.length > 0 ? (doneCount / topics.length) * 100 : 0}
            max={100}
          />
          <span class="text-xs opacity-85 shrink-0">
            {doneCount}/{topics.length} 完了
          </span>
        </div>
      </div>

      {/* Topic Cards */}
      <div class="space-y-3">
        {topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            completed={!!completed[topic.id]}
            onToggleComplete={() => onToggleComplete(topic.id)}
            note={notes[topic.id] || ""}
            onNoteChange={(v: string) => onNoteChange(topic.id, v)}
            onNavigate={onNavigate}
            bookmarked={!!bookmarks[topic.id]}
            onToggleBookmark={() => onToggleBookmark(topic.id)}
            highlights={highlights}
            onToggleHighlight={onToggleHighlight}
            onOpenPlayground={onOpenPlayground}
          />
        ))}
      </div>
    </div>
  );
}
