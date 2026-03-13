import { useState, useEffect, useRef, useMemo } from "hono/jsx/dom";
import { TOPICS, SECTIONS, TAG_BADGE } from "./data";
import { SearchIcon } from "./icons";

// ─── Search index ─────────────────────────────────────────

interface SearchResult {
  topicId: string;
  sectionId: string;
  title: string;
  summary: string;
  tag: string;
  sectionTitle: string;
  sectionIcon: string;
}

const SEARCH_INDEX: SearchResult[] = Object.values(TOPICS).map((topic) => {
  const section = SECTIONS.find((s) => s.topicIds.includes(topic.id));
  return {
    topicId: topic.id,
    sectionId: topic.section,
    title: topic.title,
    summary: topic.summary,
    tag: topic.tag,
    sectionTitle: section?.title ?? "",
    sectionIcon: section?.icon ?? "",
  };
});

function runSearch(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return SEARCH_INDEX.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.tag.toLowerCase().includes(q) ||
      r.sectionTitle.toLowerCase().includes(q),
  ).slice(0, 12);
}

// ─── Component ─────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onNavigate: (sectionId: string) => void;
}

export function SearchModal({ onClose, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => runSearch(query), [query]);

  // Auto-focus on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIdx]) {
        onNavigate(results[selectedIdx].sectionId);
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [results, selectedIdx, onNavigate, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div class="fixed inset-0 z-[99] bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div class="fixed inset-x-0 top-[10vh] z-[100] flex justify-center px-4 pointer-events-none">
        <div
          class="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-base-300 pointer-events-auto"
          onClick={(e: Event) => e.stopPropagation()}
        >
          {/* Input */}
          <div class="flex items-center gap-3 px-4 py-3 border-b border-base-300">
            <SearchIcon size={16} class="text-base-content/40 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              class="flex-1 bg-transparent outline-none text-sm placeholder:text-base-content/40"
              placeholder="トピック・キーワードを検索..."
              value={query}
              onInput={(e: Event) =>
                setQuery((e.target as HTMLInputElement).value)
              }
            />
            <kbd class="kbd kbd-xs shrink-0">Esc</kbd>
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <ul class="max-h-72 overflow-y-auto py-1.5">
              {results.map((r, i) => (
                <li key={r.topicId}>
                  <button
                    class={`w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors ${
                      i === selectedIdx ? "bg-primary/10" : "hover:bg-base-200"
                    }`}
                    onClick={() => {
                      onNavigate(r.sectionId);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIdx(i)}
                  >
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-medium leading-tight">
                        {r.title}
                      </span>
                      <span
                        class={`badge badge-xs ${TAG_BADGE[r.tag] ?? "badge-ghost"}`}
                      >
                        {r.tag}
                      </span>
                      <span class="text-[0.65rem] text-base-content/50 ml-auto shrink-0">
                        {r.sectionIcon} {r.sectionTitle}
                      </span>
                    </div>
                    <span class="text-xs text-base-content/60 line-clamp-1 leading-relaxed">
                      {r.summary}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <div class="py-10 text-center text-sm text-base-content/50">
              「{query}」に一致するトピックが見つかりません
            </div>
          ) : (
            <div class="py-6 text-center text-xs text-base-content/40">
              トピック名・キーワードで検索
            </div>
          )}

          {/* Footer hint */}
          <div class="border-t border-base-300 px-4 py-2 flex gap-4 text-[0.65rem] text-base-content/40">
            <span>
              <kbd class="kbd kbd-xs">↑↓</kbd> 選択
            </span>
            <span>
              <kbd class="kbd kbd-xs">Enter</kbd> 移動
            </span>
            <span>
              <kbd class="kbd kbd-xs">Esc</kbd> 閉じる
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
