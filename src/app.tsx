import { useState, useEffect, useCallback, useRef } from "hono/jsx/dom";
import { SECTIONS, TOPICS, TOTAL_TOPICS } from "./data";
import { SECTION_GROUP_LABELS } from "./types";
import type { SectionGroup } from "./types";
import { Dashboard } from "./dashboard";
import { SectionView } from "./section-view";
import { RandomQuiz } from "./random-quiz";
import type { QuizScores } from "./random-quiz";
import { SearchModal } from "./search";
import {
  SearchIcon,
  BookmarkIcon,
} from "./icons";
import { DailyChallenge } from "./daily-challenge";
import { Playground } from "./playground";
// TechLeadInterview is dynamically imported for code-splitting (separate chunk)
import type { SRSStore, StudyLog } from "./srs";
import { processResult, recordActivity } from "./srs";
import { SyncButton } from "./sync-ui";
import { pushSync, API_URL } from "./sync";

// Lazy loader for TL Interview page (code-split into separate chunk)
function LazyTLInterview() {
  const compRef = useRef<Function | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!compRef.current && !error) {
      import("./tech-lead-interview")
        .then((mod) => {
          compRef.current = mod.TechLeadInterview;
          setReady(true);
        })
        .catch(() => setError(true));
    }
  }, [error]);

  if (error) {
    return (
      <div class="text-center py-20">
        <p class="text-sm text-error mb-2">読み込みに失敗しました</p>
        <button class="btn btn-ghost btn-sm" onClick={() => setError(false)}>
          再試行
        </button>
      </div>
    );
  }

  if (!ready || !compRef.current) {
    return (
      <div class="flex items-center justify-center py-20">
        <span class="loading loading-spinner loading-md" />
      </div>
    );
  }
  const C = compRef.current;
  return <C />;
}

function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [value]);

  return [value, setValue];
}

export function App() {
  const [currentSection, setCurrentSection] = useState("dashboard");
  const [playgroundCode, setPlaygroundCode] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completed, setCompleted] = useLocalStorage<Record<string, boolean>>(
    "go-study-completed",
    {},
  );
  const [notes, setNotes] = useLocalStorage<Record<string, string>>(
    "go-study-notes",
    {},
  );
  const [quizScores, setQuizScores] = useLocalStorage<QuizScores>(
    "go-study-quiz-scores",
    {},
  );
  const [bookmarks, setBookmarks] = useLocalStorage<Record<string, boolean>>(
    "go-study-bookmarks",
    {},
  );
  const [highlights, setHighlights] = useLocalStorage<
    Record<string, boolean>
  >("go-study-highlights", {});
  const [srsData, setSrsData] = useLocalStorage<SRSStore>("go-study-srs", {});
  const [studyLog, setStudyLog] = useLocalStorage<StudyLog>("go-study-log", {});
  const [searchOpen, setSearchOpen] = useState(false);
  const [fontSize, setFontSize] = useLocalStorage<number>("go-study-font-size", 100);
  const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-sync: push to cloud 3s after any data change
  const scheduleAutoSync = useCallback(() => {
    if (!API_URL) return;
    if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current = setTimeout(() => {
      pushSync().catch((e) => console.warn("auto-sync failed:", e));
    }, 3_000);
  }, []);

  useEffect(() => {
    return () => {
      if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
    };
  }, []);


  // Desktop: default sidebar open
  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true);
  }, []);

  // Cmd+K / Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setCompleted((prev: Record<string, boolean>) => ({
      ...prev,
      [id]: !prev[id],
    }));
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const updateNote = useCallback((id: string, val: string) => {
    setNotes((prev: Record<string, string>) => ({ ...prev, [id]: val }));
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const updateQuizScore = useCallback(
    (key: string, result: "correct" | "wrong") => {
      setQuizScores((prev: QuizScores) => ({ ...prev, [key]: result }));
      setSrsData((prev: SRSStore) => ({
        ...prev,
        [key]: processResult(prev[key], result),
      }));
      setStudyLog((prev: StudyLog) => recordActivity(prev, result));
      scheduleAutoSync();
    },
    [scheduleAutoSync],
  );

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev: Record<string, boolean>) => ({
      ...prev,
      [id]: !prev[id],
    }));
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const toggleHighlight = useCallback((key: string) => {
    setHighlights((prev: Record<string, boolean>) => ({
      ...prev,
      [key]: !prev[key],
    }));
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const navigate = useCallback((id: string) => {
    setCurrentSection(id);
    if (id !== "playground") setPlaygroundCode(undefined);
    // Scroll main content to top on navigation
    document.querySelector("main")?.scrollTo(0, 0);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const openPlayground = useCallback((code: string) => {
    setPlaygroundCode(code);
    setCurrentSection("playground");
    document.querySelector("main")?.scrollTo(0, 0);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const completedCount = Object.values(completed).filter(Boolean).length;
  const activeSection = SECTIONS.find((s) => s.id === currentSection);

  return (
    <div class="h-screen flex flex-col bg-base-100 overflow-hidden">
      {/* ── Header (Duolingo-style) ── */}
      <div class="navbar bg-primary text-primary-content px-4 min-h-14 shadow-md">
        <div class="navbar-start gap-2">
          <button
            class="btn btn-ghost btn-sm text-primary-content"
            style="min-width:44px;min-height:44px;"
            onClick={() => setSidebarOpen((o: boolean) => !o)}
            aria-label="サイドバーを切り替え"
            aria-expanded={sidebarOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span class="text-lg font-black tracking-wider">🐹 GoStudy</span>
        </div>
        <div class="navbar-center hidden sm:flex">
          <div class="flex items-center gap-4">
            {/* Streak */}
            <div class="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1" title="学習ストリーク">
              <span class="text-lg">🔥</span>
              <span class="font-bold text-sm">{(() => {
                const today = new Date().toISOString().slice(0, 10);
                let s = 0;
                for (let i = 0; i < 30; i++) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const key = d.toISOString().slice(0, 10);
                  if (key === today && i === 0) {
                    if (studyLog[key]) s++;
                    else continue;
                  } else if (studyLog[key]) {
                    s++;
                  } else break;
                }
                return s;
              })()}</span>
            </div>
            {/* XP */}
            <div class="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1" title="獲得XP（正解数）">
              <span class="text-lg">⚡</span>
              <span class="font-bold text-sm">{Object.values(quizScores).filter(v => v === "correct").length} XP</span>
            </div>
            {/* Progress */}
            <div class="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1" title="進捗">
              <span class="text-lg">👑</span>
              <span class="font-bold text-sm">{completedCount}/{TOTAL_TOPICS}</span>
            </div>
          </div>
        </div>
        <div class="navbar-end gap-1">
          <SyncButton onPullComplete={() => {}} />
          <div class="flex items-center gap-0.5">
            <button
              class="btn btn-ghost btn-xs px-1 text-primary-content"
              onClick={() => setFontSize((p: number) => Math.max(75, p - 10))}
              disabled={fontSize <= 75}
              aria-label="文字を小さく"
              title="文字を小さく"
            >
              <span class="text-[10px] font-bold">A-</span>
            </button>
            <span class="text-[10px] opacity-70 w-7 text-center">{fontSize}%</span>
            <button
              class="btn btn-ghost btn-xs px-1 text-primary-content"
              onClick={() => setFontSize((p: number) => Math.min(150, p + 10))}
              disabled={fontSize >= 150}
              aria-label="文字を大きく"
              title="文字を大きく"
            >
              <span class="text-xs font-bold">A+</span>
            </button>
          </div>
          <button
            class="btn btn-ghost btn-sm btn-square text-primary-content"
            onClick={() => setSearchOpen(true)}
            aria-label="検索 (Cmd+K)"
            title="検索 (Cmd+K)"
          >
            <SearchIcon size={15} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div class="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            class="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar (Duolingo skill-tree style) */}
        {sidebarOpen && (
          <aside class="w-56 shrink-0 bg-base-100 border-r border-base-200 overflow-y-auto flex flex-col fixed md:static inset-y-0 left-0 z-40 mt-14 md:mt-0">
            <div class="p-3 flex-1">
              {/* ── Quick actions ── */}
              <div class="grid grid-cols-2 gap-1.5 mb-4">
                {[
                  { id: "dashboard", icon: "🏠", label: "ホーム" },
                  { id: "random-quiz", icon: "🎲", label: "クイズ" },
                  { id: "daily-challenge", icon: "📅", label: "今日の挑戦" },
                  { id: "playground", icon: "💻", label: "Playground" },
                ].map((item) => (
                  <button
                    key={item.id}
                    class={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs font-semibold transition-all ${currentSection === item.id ? "bg-primary/10 text-primary border-2 border-primary" : "bg-base-200 hover:bg-base-300 border-2 border-transparent"}`}
                    onClick={() => navigate(item.id)}
                  >
                    <span class="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* ── Mobile stats ── */}
              <div class="flex gap-2 mb-4 sm:hidden">
                <div class="flex items-center gap-1 bg-warning/10 rounded-lg px-2 py-1 text-xs font-bold">
                  🔥 {(() => {
                    let s = 0;
                    for (let i = 0; i < 30; i++) {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      if (studyLog[d.toISOString().slice(0, 10)]) s++;
                      else if (i > 0) break;
                    }
                    return s;
                  })()}
                </div>
                <div class="flex items-center gap-1 bg-info/10 rounded-lg px-2 py-1 text-xs font-bold">
                  ⚡ {Object.values(quizScores).filter(v => v === "correct").length} XP
                </div>
              </div>

              {/* ── Bookmarks ── */}
              {Object.keys(bookmarks).some((id) => bookmarks[id]) && (
                <div class="mb-3">
                  <div class="text-[0.65rem] font-bold uppercase tracking-wider opacity-50 mb-1.5 flex items-center gap-1">
                    <BookmarkIcon size={9} class="text-warning" />
                    ブックマーク
                  </div>
                  <div class="space-y-0.5">
                    {Object.keys(bookmarks)
                      .filter((id) => bookmarks[id])
                      .map((id) => {
                        const topic = TOPICS[id];
                        if (!topic) return null;
                        return (
                          <button
                            key={id}
                            class="w-full text-left text-xs px-2 py-1 rounded-lg hover:bg-base-200 truncate"
                            onClick={() => navigate(topic.section)}
                          >
                            {topic.title}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ── Skill tree sections ── */}
              {(["basics", "skills", "advanced", "interview"] as SectionGroup[]).map((group) => {
                const groupSections = SECTIONS.filter(
                  (s) => s.id !== "dashboard" && s.group === group,
                );
                if (groupSections.length === 0) return null;
                const groupColors: Record<SectionGroup, string> = {
                  basics: "from-primary/20 to-primary/5",
                  skills: "from-info/20 to-info/5",
                  advanced: "from-secondary/20 to-secondary/5",
                  interview: "from-warning/20 to-warning/5",
                };
                return (
                  <div key={`g-${group}`} class="mb-3">
                    <div class={`text-[0.65rem] font-bold uppercase tracking-wider opacity-50 mb-2`}>
                      {SECTION_GROUP_LABELS[group]}
                    </div>
                    <div class="space-y-1">
                      {groupSections.map((s) => {
                        const done = s.topicIds.filter((id) => completed[id]).length;
                        const total = s.topicIds.length;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                        const isActive = currentSection === s.id;
                        const isComplete = done === total && total > 0;
                        return (
                          <button
                            key={s.id}
                            class={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all ${isActive ? "bg-gradient-to-r " + groupColors[group as SectionGroup] + " ring-2 ring-primary shadow-sm" : "hover:bg-base-200"}`}
                            onClick={() => navigate(s.id)}
                          >
                            {/* Skill node circle */}
                            <div class={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 ${isComplete ? "bg-primary text-primary-content border-primary" : isActive ? "bg-primary/15 border-primary text-primary" : "bg-base-200 border-base-300"}`}>
                              {isComplete ? "✓" : s.icon}
                            </div>
                            <div class="flex-1 min-w-0 text-left">
                              <div class="text-xs font-semibold truncate">{s.title}</div>
                              {total > 0 && (
                                <div class="flex items-center gap-1.5 mt-0.5">
                                  <progress
                                    class={`progress h-1.5 flex-1 ${isComplete ? "progress-primary" : "progress-info"}`}
                                    value={pct}
                                    max={100}
                                  />
                                  <span class={`text-[0.6rem] font-medium ${isComplete ? "text-primary" : "opacity-60"}`}>
                                    {done}/{total}
                                  </span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div class="p-3 border-t border-base-200 text-center">
              <span class="text-[0.65rem] opacity-50 font-medium">Backend Engineer Edition 🐹</span>
            </div>
          </aside>
        )}

        {/* Search Modal */}
        {searchOpen && (
          <SearchModal
            onClose={() => setSearchOpen(false)}
            onNavigate={navigate}
          />
        )}

        {/* Main Content */}
        <main class="flex-1 overflow-y-auto" style={`zoom: ${fontSize / 100}`}>
          <div
            key={currentSection}
            class="page-enter max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
          >
            {currentSection === "dashboard" ? (
              <Dashboard
                completed={completed}
                notes={notes}
                quizScores={quizScores}
                studyLog={studyLog}
                srsData={srsData}
                onNavigate={navigate}
              />
            ) : currentSection === "random-quiz" ? (
              <RandomQuiz
                scores={quizScores}
                srsData={srsData}
                onScore={updateQuizScore}
              />
            ) : currentSection === "daily-challenge" ? (
              <DailyChallenge
                onComplete={(correct, total) => {
                  // Record daily challenge activity in study log
                  for (let i = 0; i < total; i++) {
                    setStudyLog((prev: StudyLog) =>
                      recordActivity(prev, i < correct ? "correct" : "wrong"),
                    );
                  }
                }}
              />
            ) : currentSection === "tl-interview" ? (
              <LazyTLInterview />
            ) : currentSection === "playground" ? (
              <Playground initialCode={playgroundCode} />
            ) : activeSection ? (
              <SectionView
                section={activeSection}
                completed={completed}
                notes={notes}
                bookmarks={bookmarks}
                highlights={highlights}
                onToggleComplete={toggleComplete}
                onNoteChange={updateNote}
                onToggleBookmark={toggleBookmark}
                onToggleHighlight={toggleHighlight}
                onNavigate={navigate}
                onOpenPlayground={openPlayground}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
