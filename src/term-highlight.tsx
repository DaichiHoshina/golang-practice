import { GLOSSARY } from "./glossary";

// 用語を長さ降順でソートし、正規表現でまとめてマッチ
const sortedTerms = [...GLOSSARY].sort((a, b) => b.term.length - a.term.length);
const termPattern = new RegExp(
  `(${sortedTerms.map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "gi",
);
const termMap = new Map(
  GLOSSARY.map((e) => [e.term.toLowerCase(), e.description]),
);

/**
 * テキスト内の Go 用語を自動検出し、ツールチップ付きスパンに変換
 */
export function HighlightedText({ text }: { text: string }) {
  const parts = text.split(termPattern);

  return (
    <span>
      {parts.map((part, i) => {
        const desc = termMap.get(part.toLowerCase());
        if (desc) {
          return (
            <span
              key={i}
              class="tooltip tooltip-bottom cursor-help"
              data-tip={desc}
            >
              <span class="border-b border-dotted border-primary/40 text-primary/90 font-medium">
                {part}
              </span>
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
