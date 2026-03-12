import { useState, useEffect, useCallback } from "hono/jsx/dom";
import { GLOSSARY } from "./glossary";

// ─── Term detection setup ─────────────────────────────────

const sortedTerms = [...GLOSSARY].sort((a, b) => b.term.length - a.term.length);
const termPattern = new RegExp(
  `(${sortedTerms.map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "gi",
);
const termMap = new Map(
  GLOSSARY.map((e) => [e.term.toLowerCase(), e.description]),
);

// ─── Cross-instance close event ───────────────────────────
// Dispatched when a term is clicked, so other instances close their popups

const CLOSE_EVENT = "term-popup-close";

function dispatchClose() {
  document.dispatchEvent(new CustomEvent(CLOSE_EVENT));
}

// ─── Popup component ──────────────────────────────────────

interface PopupInfo {
  term: string;
  desc: string;
  /** Viewport-relative rect of the clicked element */
  anchorRect: DOMRect;
}

function TermPopup({
  info,
  onClose,
}: {
  info: PopupInfo;
  onClose: () => void;
}) {
  const isMobile = window.innerWidth < 640;

  // Desktop: position near the anchor word, clamped to viewport
  const popupWidth = 280;
  let style = "";
  if (!isMobile) {
    const left = Math.min(
      Math.max(info.anchorRect.left, 8),
      window.innerWidth - popupWidth - 8,
    );
    const spaceBelow = window.innerHeight - info.anchorRect.bottom;
    const top =
      spaceBelow > 160
        ? info.anchorRect.bottom + 6
        : info.anchorRect.top - 6 - 150; // position above if not enough space
    style = `position:fixed;left:${left}px;top:${top}px;width:${popupWidth}px;`;
  }

  return (
    <>
      {/* Invisible backdrop to catch outside clicks */}
      <div
        class="fixed inset-0 z-40"
        onClick={(e: Event) => {
          e.stopPropagation();
          onClose();
        }}
      />
      {/* Popup card */}
      <div
        class={
          isMobile
            ? "fixed bottom-0 left-0 right-0 z-50 bg-base-200 border-t border-base-300 rounded-t-2xl px-5 py-4 shadow-2xl popup-slide-up"
            : "z-50 bg-base-200 border border-base-300 rounded-xl shadow-xl px-4 py-3 popup-fade-in"
        }
        style={style}
        onClick={(e: Event) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div class="w-10 h-1 bg-base-content/20 rounded-full mx-auto mb-3" />
        )}
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <span class="text-primary font-bold text-sm">{info.term}</span>
          <button
            class="text-xs opacity-80 hover:opacity-100 shrink-0 p-2 -m-1 rounded"
            onClick={(e: Event) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        <p class="text-xs opacity-90 leading-relaxed">{info.desc}</p>
      </div>
    </>
  );
}

// ─── HighlightedText ─────────────────────────────────────

/**
 * テキスト内の Go 用語を自動検出し、タップ/クリックでポップアップ説明を表示
 */
export function HighlightedText({ text }: { text: string }) {
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  // Listen for close events from other HighlightedText instances
  useEffect(() => {
    const close = () => setPopup(null);
    document.addEventListener(CLOSE_EVENT, close);
    return () => document.removeEventListener(CLOSE_EVENT, close);
  }, []);

  const handleTermClick = useCallback(
    (e: MouseEvent, term: string, desc: string) => {
      e.stopPropagation();
      // Close all other popups first
      dispatchClose();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      // Toggle: if this exact term is already open, close it
      setPopup((prev) =>
        prev?.term === term ? null : { term, desc, anchorRect: rect },
      );
    },
    [],
  );

  const parts = text.split(termPattern);

  return (
    <span>
      {parts.map((part, i) => {
        const desc = termMap.get(part.toLowerCase());
        if (desc) {
          return (
            <button
              key={i}
              class="border-b border-dotted border-primary/40 text-primary/90 font-medium cursor-pointer hover:border-primary/70 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/70 rounded-sm"
              onClick={(e: MouseEvent) => handleTermClick(e, part, desc)}
              aria-label={`${part}の説明を見る`}
            >
              {part}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
      {popup && <TermPopup info={popup} onClose={() => setPopup(null)} />}
    </span>
  );
}
