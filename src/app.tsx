import { useState, useEffect, useCallback } from "hono/jsx/dom";
import { SECTIONS, TOTAL_TOPICS } from "./data";
import { Dashboard } from "./dashboard";
import { SectionView } from "./section-view";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [completed, setCompleted] = useLocalStorage<Record<string, boolean>>(
    "go-study-completed",
    {},
  );
  const [notes, setNotes] = useLocalStorage<Record<string, string>>(
    "go-study-notes",
    {},
  );

  const toggleComplete = useCallback((id: string) => {
    setCompleted((prev: Record<string, boolean>) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const updateNote = useCallback((id: string, val: string) => {
    setNotes((prev: Record<string, string>) => ({ ...prev, [id]: val }));
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
          >
            ☰
          </button>
          <span class="font-bold text-primary tracking-widest text-sm">GO</span>
          <span class="text-xs opacity-30 hidden sm:inline">
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
            <span class="text-xs opacity-40">{progressPct}%</span>
          </div>
        </div>
        <div class="navbar-end">
          <span class="text-xs opacity-30">
            {completedCount}/{TOTAL_TOPICS}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div class="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside class="w-52 shrink-0 bg-base-200 border-r border-base-300 overflow-y-auto flex flex-col">
            <ul class="menu menu-sm p-2 flex-1">
              {SECTIONS.map((s) => {
                const done = s.topicIds.filter((id) => completed[id]).length;
                const total = s.topicIds.length;
                const isActive = currentSection === s.id;
                return (
                  <li key={s.id}>
                    <a
                      class={`flex justify-between ${isActive ? "active" : ""}`}
                      onClick={() => setCurrentSection(s.id)}
                    >
                      <span class="flex items-center gap-2">
                        <span class="opacity-50 w-4 text-center text-xs">
                          {s.icon}
                        </span>
                        <span>{s.title}</span>
                      </span>
                      {total > 0 && (
                        <span
                          class={`text-xs ${
                            done === total ? "text-primary" : "opacity-40"
                          }`}
                        >
                          {done}/{total}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
            <div class="p-3 border-t border-base-300 text-center">
              <span class="text-xs opacity-20">Backend Engineer Ed.</span>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main class="flex-1 overflow-y-auto">
          <div class="max-w-3xl mx-auto px-6 py-8">
            {currentSection === "dashboard" ? (
              <Dashboard
                completed={completed}
                notes={notes}
                onNavigate={setCurrentSection}
              />
            ) : activeSection ? (
              <SectionView
                section={activeSection}
                completed={completed}
                notes={notes}
                onToggleComplete={toggleComplete}
                onNoteChange={updateNote}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
