import { useState, useEffect, useCallback } from "hono/jsx/dom";
import { SECTIONS, TOTAL_TOPICS } from "./data";
import { Dashboard } from "./dashboard";
import { SectionView } from "./section-view";
import { RandomQuiz } from "./random-quiz";
import type { QuizScores } from "./random-quiz";

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

  // Desktop: default sidebar open
  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true);
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setCompleted((prev: Record<string, boolean>) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const updateNote = useCallback((id: string, val: string) => {
    setNotes((prev: Record<string, string>) => ({ ...prev, [id]: val }));
  }, []);

  const updateQuizScore = useCallback(
    (key: string, result: "correct" | "wrong") => {
      setQuizScores((prev: QuizScores) => ({ ...prev, [key]: result }));
    },
    [],
  );

  const navigate = useCallback((id: string) => {
    setCurrentSection(id);
    // Scroll main content to top on navigation
    document.querySelector("main")?.scrollTo(0, 0);
    // Close sidebar on mobile after navigation
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
            class="btn btn-ghost btn-sm btn-square"
            onClick={() => setSidebarOpen((o: boolean) => !o)}
            aria-label="サイドバーを切り替え"
          >
            ☰
          </button>
          <span class="font-bold text-primary tracking-widest text-sm">GO</span>
          <span class="text-xs opacity-70 hidden sm:inline">
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
            <span class="text-xs opacity-70">{progressPct}%</span>
          </div>
        </div>
        <div class="navbar-end">
          <span class="text-xs opacity-70">
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
              {/* Dashboard */}
              <li>
                <button
                  class={`flex justify-between w-full ${currentSection === "dashboard" ? "active" : ""}`}
                  onClick={() => navigate("dashboard")}
                >
                  <span class="flex items-center gap-2">
                    <span class="opacity-70 w-4 text-center text-xs">~</span>
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
                    <span class="opacity-70 w-4 text-center text-xs">?</span>
                    <span>ランダム出題</span>
                  </span>
                </button>
              </li>
              {/* Divider */}
              <li class="menu-title mt-1 mb-0">
                <span class="text-[0.6rem] opacity-55">セクション</span>
              </li>
              {/* Section items */}
              {SECTIONS.filter((s) => s.id !== "dashboard").map((s) => {
                const done = s.topicIds.filter((id) => completed[id]).length;
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
                            done === total ? "text-primary" : "opacity-60"
                          }`}
                        >
                          {done}/{total}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div class="p-3 border-t border-base-300 text-center">
              <span class="text-xs opacity-50">Backend Engineer Ed.</span>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main class="flex-1 overflow-y-auto">
          <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {currentSection === "dashboard" ? (
              <Dashboard
                completed={completed}
                notes={notes}
                onNavigate={navigate}
              />
            ) : currentSection === "random-quiz" ? (
              <RandomQuiz scores={quizScores} onScore={updateQuizScore} />
            ) : activeSection ? (
              <SectionView
                section={activeSection}
                completed={completed}
                notes={notes}
                onToggleComplete={toggleComplete}
                onNoteChange={updateNote}
                onNavigate={navigate}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
