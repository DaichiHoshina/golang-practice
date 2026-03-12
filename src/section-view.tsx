import { useState, useMemo } from "hono/jsx/dom";
import type { Topic, Section } from "./types";
import { TOPICS, TAG_BADGE } from "./data";
import hljs from "highlight.js/lib/core";
import go from "highlight.js/lib/languages/go";

hljs.registerLanguage("go", go);

// ─── Code Block ──────────────────────────────────────────
// Note: dangerouslySetInnerHTML is safe here because input is only
// hardcoded Go code strings from data.ts, never user input.

function CodeBlock({
  code,
  variant,
}: {
  code: string;
  variant: "good" | "bad";
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
      <div class={`text-xs font-bold mb-1.5 ${label.color}`}>{label.text}</div>
      <pre class={`code-block ${cls}`}>
        <code class="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

// ─── Interview Box ───────────────────────────────────────

function InterviewBox({ points }: { points: string[] }) {
  return (
    <div class="mt-4 bg-secondary/5 border border-secondary/20 rounded-box p-4">
      <div class="text-xs font-bold text-secondary mb-2.5">
        ◎ 面接で答えるときのポイント
      </div>
      <ul class="space-y-1.5">
        {points.map((p, i) => (
          <li key={i} class="text-xs opacity-80 flex gap-2 leading-relaxed">
            <span class="text-secondary shrink-0 mt-0.5">→</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
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
    <div class="mt-4 bg-warning/5 border border-warning/20 rounded-box p-4">
      <div class="text-xs font-bold text-warning mb-2.5">⇄ トレードオフ</div>
      <div class="space-y-2">
        {tradeoffs.map((t, i) => (
          <p key={i} class="text-xs opacity-80 leading-relaxed">
            <span class="font-semibold text-warning">{t.title}: </span>
            {t.desc}
          </p>
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
}: {
  topic: Topic;
  completed: boolean;
  onToggleComplete: () => void;
  note: string;
  onNoteChange: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const badgeCls = TAG_BADGE[topic.tag] || "badge-ghost";

  return (
    <div
      class={`card bg-base-200 border border-base-300 transition-all ${
        completed ? "opacity-60" : ""
      }`}
    >
      {/* Header */}
      <div
        class="card-body p-4 cursor-pointer"
        onClick={() => setExpanded((e: boolean) => !e)}
      >
        <div class="flex items-start gap-3">
          <input
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
            <p class="text-xs opacity-50 mt-1.5 leading-relaxed">
              {topic.summary}
            </p>
          </div>
          <span class="text-xs opacity-30 shrink-0 mt-1">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div class="card-body pt-0 border-t border-base-300 space-y-4">
          {/* Why */}
          <div>
            <p class="text-xs font-semibold opacity-50 mb-1">
              なぜそうするのか
            </p>
            <p class="text-xs opacity-80 leading-relaxed">{topic.why}</p>
          </div>

          <TradeoffBox tradeoffs={topic.tradeoffs} />

          {/* Code Examples */}
          {topic.badCode && (
            <div>
              <CodeBlock code={topic.badCode} variant="bad" />
              <CodeBlock code={topic.goodCode} variant="good" />
            </div>
          )}

          <InterviewBox points={topic.interviewPoints} />

          {/* Notes */}
          <div>
            <p class="text-xs font-semibold opacity-50 mb-1.5">学習メモ</p>
            <textarea
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
  onToggleComplete: (id: string) => void;
  onNoteChange: (id: string, val: string) => void;
}

export function SectionView({
  section,
  completed,
  notes,
  onToggleComplete,
  onNoteChange,
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
            <p class="text-sm opacity-40 mt-0.5">{section.description}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-4">
          <progress
            class="progress progress-primary flex-1"
            value={topics.length > 0 ? (doneCount / topics.length) * 100 : 0}
            max={100}
          />
          <span class="text-xs opacity-40 shrink-0">
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
          />
        ))}
      </div>
    </div>
  );
}
