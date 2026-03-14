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
  HomeIcon,
  DiceIcon,
  SearchIcon,
  BookmarkIcon,
  CalendarIcon,
  TerminalIcon,
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
      pushSync().catch(() => {});
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
  const progressPct = Math.round((completedCount / TOTAL_TOPICS) * 100);
  const activeSection = SECTIONS.find((s) => s.id === currentSection);

  return (
    <div class="h-screen flex flex-col bg-base-100 overflow-hidden">
      {/* ── Header ── */}
      <div class="navbar bg-base-200 border-b border-base-300 px-4 min-h-12">
        <div class="navbar-start gap-3">
          <button
            class="btn btn-ghost btn-sm"
            style="min-width:44px;min-height:44px;"
            onClick={() => setSidebarOpen((o: boolean) => !o)}
            aria-label="サイドバーを切り替え"
            aria-expanded={sidebarOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span class="font-bold text-primary tracking-widest text-sm">GO</span>
          <span class="text-xs opacity-80 hidden sm:inline">
            実務学習ガイド
          </span>
        </div>
        <div class="navbar-center">
          <div class="flex items-center gap-2 w-48">
            <progress
              class="progress progress-primary h-1.5 flex-1"
              value={progressPct}
              max={100}
            />
            <span class="text-xs opacity-80">{progressPct}%</span>
          </div>
        </div>
        <div class="navbar-end gap-1">
          <SyncButton onPullComplete={() => {}} />
          <div class="flex items-center gap-0.5">
            <button
              class="btn btn-ghost btn-xs px-1"
              onClick={() => setFontSize((p: number) => Math.max(75, p - 10))}
              disabled={fontSize <= 75}
              aria-label="文字を小さく"
              title="文字を小さく"
            >
              <span class="text-[10px] font-bold">A-</span>
            </button>
            <span class="text-[10px] opacity-60 w-7 text-center">{fontSize}%</span>
            <button
              class="btn btn-ghost btn-xs px-1"
              onClick={() => setFontSize((p: number) => Math.min(150, p + 10))}
              disabled={fontSize >= 150}
              aria-label="文字を大きく"
              title="文字を大きく"
            >
              <span class="text-xs font-bold">A+</span>
            </button>
          </div>
          <button
            class="btn btn-ghost btn-sm btn-square"
            onClick={() => setSearchOpen(true)}
            aria-label="検索 (Cmd+K)"
            title="検索 (Cmd+K)"
          >
            <SearchIcon size={15} />
          </button>
          <span class="text-xs opacity-80 ml-1">
            {completedCount}/{TOTAL_TOPICS}
          </span>
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

        {/* Sidebar */}
        {sidebarOpen && (
          <aside class="w-52 shrink-0 bg-base-200 border-r border-base-300 overflow-y-auto flex flex-col fixed md:static inset-y-0 left-0 z-40 mt-12 md:mt-0">
            <ul class="menu menu-sm p-2 flex-1">
              {/* ── Tools ── */}
              <li class="menu-title mt-0 mb-0">
                <span class="text-[0.6rem] opacity-80">ツール</span>
              </li>
              {/* Dashboard */}
              <li>
                <button
                  class={`flex justify-between w-full ${currentSection === "dashboard" ? "active" : ""}`}
                  onClick={() => navigate("dashboard")}
                >
                  <span class="flex items-center gap-2">
                    <HomeIcon size={13} class="opacity-70 shrink-0" />
                    <span>Dashboard</span>
                  </span>
                </button>
              </li>
              {/* Random Quiz */}
              <li>
                <button
                  class={`flex justify-between w-full ${currentSection === "random-quiz" ? "active" : ""}`}
                  onClick={() => navigate("random-quiz")}
                >
                  <span class="flex items-center gap-2">
                    <DiceIcon size={13} class="opacity-70 shrink-0" />
                    <span>ランダム出題</span>
                  </span>
                </button>
              </li>
              {/* Daily Challenge */}
              <li>
                <button
                  class={`flex justify-between w-full ${currentSection === "daily-challenge" ? "active" : ""}`}
                  onClick={() => navigate("daily-challenge")}
                >
                  <span class="flex items-center gap-2">
                    <CalendarIcon size={13} class="opacity-70 shrink-0" />
                    <span>今日のチャレンジ</span>
                  </span>
                </button>
              </li>
              {/* Playground */}
              <li>
                <button
                  class={`flex justify-between w-full ${currentSection === "playground" ? "active" : ""}`}
                  onClick={() => navigate("playground")}
                >
                  <span class="flex items-center gap-2">
                    <TerminalIcon size={13} class="opacity-70 shrink-0" />
                    <span>Playground</span>
                  </span>
                </button>
              </li>
              {/* Bookmarks */}
              {Object.keys(bookmarks).some((id) => bookmarks[id]) && (
                <>
                  <li class="menu-title mt-1 mb-0">
                    <span class="text-[0.6rem] opacity-80 flex items-center gap-1">
                      <BookmarkIcon size={9} class="text-warning" />
                      ブックマーク
                    </span>
                  </li>
                  {Object.keys(bookmarks)
                    .filter((id) => bookmarks[id])
                    .map((id) => {
                      const topic = TOPICS[id];
                      if (!topic) return null;
                      return (
                        <li key={id}>
                          <button
                            class="flex w-full text-left"
                            onClick={() => navigate(topic.section)}
                          >
                            <span class="truncate text-xs">{topic.title}</span>
                          </button>
                        </li>
                      );
                    })}
                </>
              )}
              {/* Section items grouped by category */}
              {(["basics", "skills", "advanced", "interview"] as SectionGroup[]).map((group) => {
                const groupSections = SECTIONS.filter(
                  (s) => s.id !== "dashboard" && s.group === group,
                );
                if (groupSections.length === 0) return null;
                return (
                  <>
                    <li class="menu-title mt-1 mb-0" key={`g-${group}`}>
                      <span class="text-[0.6rem] opacity-80">
                        {SECTION_GROUP_LABELS[group]}
                      </span>
                    </li>
                    {groupSections.map((s) => {
                      const done = s.topicIds.filter(
                        (id) => completed[id],
                      ).length;
                      const total = s.topicIds.length;
                      const isActive = currentSection === s.id;
                      return (
                        <li key={s.id}>
                          <button
                            class={`flex justify-between w-full ${isActive ? "active" : ""}`}
                            onClick={() => navigate(s.id)}
                          >
                            <span class="flex items-center gap-2">
                              <span class="opacity-70 w-4 text-center text-xs">
                                {s.icon}
                              </span>
                              <span>{s.title}</span>
                            </span>
                            {total > 0 && (
                              <span
                                class={`text-xs ${
                                  done === total
                                    ? "text-primary"
                                    : "opacity-80"
                                }`}
                              >
                                {done}/{total}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </>
                );
              })}
            </ul>
            <div class="p-3 border-t border-base-300 text-center">
              <span class="text-xs opacity-80">Backend Engineer Ed.</span>
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
        <main class="flex-1 overflow-y-auto" style={`font-size: ${fontSize}%`}>
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
