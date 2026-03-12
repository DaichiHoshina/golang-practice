import { SECTIONS, TOPICS, TOTAL_TOPICS, RECOMMENDED } from "./data";

interface Props {
  completed: Record<string, boolean>;
  notes: Record<string, string>;
  onNavigate: (id: string) => void;
}

export function Dashboard({ completed, notes, onNavigate }: Props) {
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressPct = Math.round((completedCount / TOTAL_TOPICS) * 100);
  const notesCount = Object.values(notes).filter((n) => n?.trim()).length;

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000,
  );
  const todayRec = RECOMMENDED[dayOfYear % RECOMMENDED.length];
  const recTopic = TOPICS[todayRec.id];
  const recSection = SECTIONS.find((s) => s.topicIds.includes(todayRec.id));

  const sectionStats = SECTIONS.filter((s) => s.id !== "dashboard").map(
    (s) => ({
      ...s,
      total: s.topicIds.length,
      done: s.topicIds.filter((id) => completed[id]).length,
    }),
  );

  return (
    <div class="space-y-6">
      {/* Title */}
      <div>
        <h1 class="text-2xl font-bold">Go 実務学習ガイド</h1>
        <p class="text-sm opacity-50 mt-1">
          バックエンドエンジニア向け — 中級者の学び直し
        </p>
      </div>

      {/* Overall Progress */}
      <div class="card bg-base-200">
        <div class="card-body p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold">全体進捗</span>
            <span class="text-sm font-bold text-primary">
              {completedCount} / {TOTAL_TOPICS} トピック
            </span>
          </div>
          <progress
            class="progress progress-primary w-full"
            value={progressPct}
            max={100}
          />
          <p class="text-xs opacity-40 mt-2">{progressPct}% 完了</p>
        </div>
      </div>

      {/* Today's Recommendation */}
      <div class="card bg-primary/5 border border-primary/20">
        <div class="card-body p-5">
          <div class="text-xs font-bold text-primary mb-2">
            ★ 今日のおすすめ学習
          </div>
          <h3 class="text-sm font-semibold">{recTopic?.title}</h3>
          <p class="text-xs opacity-50 mt-1">{todayRec.reason}</p>
          <p class="text-xs opacity-30 mt-0.5">
            セクション: {recSection?.title}
          </p>
          <div class="card-actions mt-3">
            <button
              class="btn btn-primary btn-sm btn-outline"
              onClick={() => recSection && onNavigate(recSection.id)}
            >
              学習を始める →
            </button>
          </div>
        </div>
      </div>

      {/* Section Grid */}
      <div>
        <h2 class="text-xs font-semibold opacity-50 uppercase tracking-widest mb-3">
          セクション別進捗
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sectionStats.map((s) => (
            <button
              key={s.id}
              class="card bg-base-200 hover:bg-base-300 transition-colors text-left cursor-pointer"
              onClick={() => onNavigate(s.id)}
            >
              <div class="card-body p-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-semibold">
                    {s.icon} {s.title}
                  </span>
                  <span
                    class={`text-xs ${
                      s.done === s.total && s.total > 0
                        ? "text-primary"
                        : "opacity-40"
                    }`}
                  >
                    {s.done}/{s.total}
                  </span>
                </div>
                <progress
                  class="progress progress-primary progress-sm w-full h-1"
                  value={s.total > 0 ? (s.done / s.total) * 100 : 0}
                  max={100}
                />
                <p class="text-xs opacity-40 mt-2 truncate">{s.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div class="stats stats-horizontal bg-base-200 w-full">
        <div class="stat place-items-center">
          <div class="stat-value text-2xl text-primary">{completedCount}</div>
          <div class="stat-desc">完了トピック</div>
        </div>
        <div class="stat place-items-center">
          <div class="stat-value text-2xl">{notesCount}</div>
          <div class="stat-desc">メモあり</div>
        </div>
        <div class="stat place-items-center">
          <div class="stat-value text-2xl">{TOTAL_TOPICS - completedCount}</div>
          <div class="stat-desc">残り</div>
        </div>
      </div>
    </div>
  );
}
