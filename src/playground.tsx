import { useState, useCallback, useRef, useEffect } from "hono/jsx/dom";
import { executeGo, DEFAULT_CODE } from "./go-executor";
import type { ExecutionResult } from "./go-executor";
import { PlayIcon, SaveIcon, TrashIcon, CodeIcon } from "./icons";

// ─── Types ───────────────────────────────────────────────

interface Snippet {
  id: string;
  name: string;
  source: string;
  createdAt: number;
}

type EditorState = "idle" | "running" | "done" | "error";

// ─── Snippets storage ────────────────────────────────────

const SNIPPETS_KEY = "go-study-snippets";
const MAX_SNIPPETS = 50;

function loadSnippets(): Snippet[] {
  try {
    const raw = localStorage.getItem(SNIPPETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSnippets(snippets: Snippet[]) {
  localStorage.setItem(
    SNIPPETS_KEY,
    JSON.stringify(snippets.slice(0, MAX_SNIPPETS)),
  );
}

// ─── Component ───────────────────────────────────────────

export function Playground({ initialCode }: { initialCode?: string }) {
  const [source, setSource] = useState(initialCode || DEFAULT_CODE);
  const [state, setState] = useState<EditorState>("idle");
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [snippets, setSnippets] = useState<Snippet[]>(loadSnippets);
  const [showSnippets, setShowSnippets] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current && !initialCode) {
      textareaRef.current.focus();
    }
  }, []);

  const run = useCallback(async () => {
    if (state === "running") return;
    setState("running");
    setResult(null);

    abortRef.current = new AbortController();
    const timeout = setTimeout(() => abortRef.current?.abort(), 10000);

    try {
      const res = await executeGo(source, abortRef.current.signal);
      setResult(res);
      setState("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("abort")) {
        setResult({
          stdout: "",
          stderr: "",
          error: "Timeout: 10 seconds exceeded",
          duration: 10000,
        });
      } else {
        setResult({ stdout: "", stderr: "", error: msg, duration: 0 });
      }
      setState("error");
    } finally {
      clearTimeout(timeout);
    }
  }, [source, state]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd/Ctrl+Enter to run
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        run();
        return;
      }
      // Tab to indent
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.target as HTMLTextAreaElement;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const val = ta.value;
        const newVal = val.substring(0, start) + "\t" + val.substring(end);
        setSource(newVal);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1;
        });
      }
    },
    [run],
  );

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    const snippet: Snippet = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      source,
      createdAt: Date.now(),
    };
    const updated = [snippet, ...snippets].slice(0, MAX_SNIPPETS);
    setSnippets(updated);
    saveSnippets(updated);
    setSaveName("");
    setShowSaveDialog(false);
  }, [saveName, source, snippets]);

  const handleDelete = useCallback(
    (id: string) => {
      const updated = snippets.filter((s) => s.id !== id);
      setSnippets(updated);
      saveSnippets(updated);
    },
    [snippets],
  );

  const handleLoad = useCallback((snippet: Snippet) => {
    setSource(snippet.source);
    setShowSnippets(false);
    setResult(null);
    setState("idle");
  }, []);

  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <CodeIcon size={20} />
          Go Playground
        </h2>
        <div class="flex gap-2">
          <button
            class="btn btn-ghost btn-xs"
            onClick={() => setShowSnippets((o) => !o)}
          >
            {showSnippets ? "Editor" : `Snippets (${snippets.length})`}
          </button>
        </div>
      </div>

      {showSnippets ? (
        <SnippetsList
          snippets={snippets}
          onLoad={handleLoad}
          onDelete={handleDelete}
        />
      ) : (
        <>
          {/* Editor */}
          <div class="relative">
            <textarea
              ref={textareaRef}
              class="textarea textarea-bordered w-full font-mono text-sm leading-relaxed bg-base-200 resize-none"
              style="min-height: 300px; tab-size: 4;"
              value={source}
              onInput={(e) =>
                setSource((e.target as HTMLTextAreaElement).value)
              }
              onKeyDown={handleKeyDown}
              spellcheck={false}
              autocomplete="off"
              autocapitalize="off"
              placeholder="Go code here..."
            />
            <div class="absolute top-2 right-2 flex gap-1">
              <span class="badge badge-ghost badge-xs opacity-60">
                {/Mac|iPhone|iPad/.test(navigator.userAgent) ? "Cmd" : "Ctrl"}
                +Enter to Run
              </span>
            </div>
          </div>

          {/* Action bar */}
          <div class="flex items-center gap-2 mt-3">
            <button
              class={`btn btn-primary btn-sm gap-1 ${state === "running" ? "loading" : ""}`}
              onClick={run}
              disabled={state === "running" || !source.trim()}
            >
              {state !== "running" && <PlayIcon size={14} />}
              {state === "running" ? "Running..." : "Run"}
            </button>
            <button
              class="btn btn-ghost btn-sm gap-1"
              onClick={() => setShowSaveDialog(true)}
            >
              <SaveIcon size={13} />
              Save
            </button>
            <button
              class="btn btn-ghost btn-sm"
              onClick={() => {
                setSource(DEFAULT_CODE);
                setResult(null);
                setState("idle");
              }}
            >
              Reset
            </button>
            {result && (
              <span class="text-xs opacity-60 ml-auto">
                {Math.round(result.duration)}ms
              </span>
            )}
          </div>

          {/* Save dialog */}
          {showSaveDialog && (
            <div class="mt-3 flex gap-2 items-center">
              <input
                type="text"
                class="input input-bordered input-sm flex-1"
                placeholder="Snippet name..."
                value={saveName}
                onInput={(e) =>
                  setSaveName((e.target as HTMLInputElement).value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setShowSaveDialog(false);
                }}
                autofocus
                maxLength={100}
              />
              <button
                class="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={!saveName.trim()}
              >
                Save
              </button>
              <button
                class="btn btn-ghost btn-sm"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Output */}
          {result && <OutputPanel result={result} />}
        </>
      )}
    </div>
  );
}

// ─── Output Panel ────────────────────────────────────────

function OutputPanel({ result }: { result: ExecutionResult }) {
  const hasError = !!result.error;
  const hasStderr = !!result.stderr;
  const hasOutput = !!result.stdout;

  return (
    <div class="mt-4">
      <div class="text-xs font-bold mb-1.5 flex items-center gap-2">
        <span class={hasError ? "text-error" : "text-success"}>
          {hasError
            ? "Compile Error"
            : hasStderr
              ? "Output (with stderr)"
              : "Output"}
        </span>
      </div>
      <pre
        class={`p-3 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto ${
          hasError
            ? "bg-error/10 text-error border border-error/20"
            : "bg-base-200 border border-base-300"
        }`}
        style="min-height: 60px; max-height: 400px; overflow-y: auto;"
      >
        {hasError
          ? result.error
          : result.stdout || result.stderr || "(no output)"}
        {hasStderr && hasOutput && (
          <>
            {"\n"}
            <span class="text-warning">{result.stderr}</span>
          </>
        )}
      </pre>
    </div>
  );
}

// ─── Snippets List ───────────────────────────────────────

function SnippetsList({
  snippets,
  onLoad,
  onDelete,
}: {
  snippets: Snippet[];
  onLoad: (s: Snippet) => void;
  onDelete: (id: string) => void;
}) {
  if (snippets.length === 0) {
    return (
      <div class="text-center py-12 opacity-60">
        <CodeIcon size={32} class="mx-auto mb-3 opacity-40" />
        <p class="text-sm">保存されたスニペットはありません</p>
        <p class="text-xs mt-1">
          エディタで「Save」ボタンを押すとここに保存されます
        </p>
      </div>
    );
  }

  return (
    <div class="space-y-2">
      {snippets.map((s) => (
        <div
          key={s.id}
          class="border border-base-300 rounded-lg p-3 hover:bg-base-200 transition-colors"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-sm">{s.name}</span>
            <div class="flex gap-1">
              <button class="btn btn-ghost btn-xs" onClick={() => onLoad(s)}>
                Open
              </button>
              <button
                class="btn btn-ghost btn-xs text-error"
                onClick={() => onDelete(s.id)}
              >
                <TrashIcon size={12} />
              </button>
            </div>
          </div>
          <pre class="text-xs opacity-60 font-mono truncate">
            {s.source.split("\n").slice(0, 3).join("\n")}
          </pre>
          <span class="text-xs opacity-40">
            {new Date(s.createdAt).toLocaleDateString("ja-JP")}
          </span>
        </div>
      ))}
    </div>
  );
}
