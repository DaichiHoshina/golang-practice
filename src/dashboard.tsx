import { SECTIONS, TOPICS, TOTAL_TOPICS, RECOMMENDED } from "./data";
import { SECTION_GROUP_LABELS } from "./types";
import type { SectionGroup } from "./types";
import { DataManager } from "./data-manager";
import {
  StarIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  TrophyIcon,
  FileTextIcon,
  CircleDotIcon,
} from "./icons";
import type { QuizScores } from "./random-quiz";
import type { StudyLog, SRSStore } from "./srs";
import { getStreak, getCalendarData, countDue } from "./srs";

interface Props {
  completed: Record<string, boolean>;
  notes: Record<string, string>;
  quizScores: QuizScores;
  studyLog: StudyLog;
  srsData: SRSStore;
  onNavigate: (id: string) => void;
}

function getGreeting(): { emoji: string; text: string } {
  const h = new Date().getHours();
  if (h < 6) return { emoji: "🌙", text: "夜更かし勉強、お疲れ様!" };
  if (h < 10) return { emoji: "☀️", text: "おはよう! 朝の学習は最高!" };
  if (h < 14) return { emoji: "🚀", text: "お昼もバリバリいこう!" };
  if (h < 18) return { emoji: "☕", text: "午後もコーヒー片手に頑張ろう!" };
  return { emoji: "🌆", text: "夜の集中タイム!" };
}

function getMilestoneMsg(pct: number): { emoji: string; msg: string } {
  if (pct === 0) return { emoji: "🌱", msg: "最初の一歩を踏み出そう!" };
  if (pct < 25) return { emoji: "🏃", msg: "いいスタート! その調子!" };
  if (pct < 50) return { emoji: "⚡", msg: "4分の1クリア! 波に乗ってる!" };
  if (pct < 75) return { emoji: "🔥", msg: "半分突破! すごい!" };
  if (pct < 100) return { emoji: "🌟", msg: "もうすぐ制覇! ラストスパート!" };
  return { emoji: "🏆", msg: "全トピック制覇! マスターだ!" };
}

export function Dashboard({
  completed,
  notes,
  quizScores,
  studyLog,
  srsData,
  onNavigate,
}: Props) {
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressPct = Math.round((completedCount / TOTAL_TOPICS) * 100);
  const notesCount = Object.values(notes).filter((n) => n?.trim()).length;
  const streak = getStreak(studyLog);
  const calData = getCalendarData(studyLog, 84); // 12 weeks

  // ── Quiz accuracy by section ──
  const scoreEntries = Object.entries(quizScores);
  const sectionAccuracy = SECTIONS.filter((s) => s.id !== "dashboard")
    .map((s) => {
      const sectionTopicIds = new Set(s.topicIds);
      const sectionScores = scoreEntries.filter(([k]) =>
        sectionTopicIds.has(k.split("_")[0]),
      );
      const correct = sectionScores.filter(([, r]) => r === "correct").length;
      const total = sectionScores.length;
      return {
        ...s,
        correct,
        total,
        pct: total > 0 ? Math.round((correct / total) * 100) : -1,
      };
    })
    .filter((s) => s.total > 0);

  // ── Weak topics (lowest accuracy) ──
  const topicAccMap = new Map<string, { correct: number; total: number }>();
  for (const [key, result] of scoreEntries) {
    const topicId = key.split("_")[0];
    const prev = topicAccMap.get(topicId) ?? { correct: 0, total: 0 };
    topicAccMap.set(topicId, {
      correct: prev.correct + (result === "correct" ? 1 : 0),
      total: prev.total + 1,
    });
  }
  const weakTopics = [...topicAccMap.entries()]
    .map(([id, stats]) => ({
      topic: TOPICS[id],
      pct: Math.round((stats.correct / stats.total) * 100),
      total: stats.total,
    }))
    .filter((w) => w.topic && w.pct < 80)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  const dueCount = countDue(srsData);

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

  const greeting = getGreeting();
  const milestone = getMilestoneMsg(progressPct);
  const completedSections = sectionStats.filter(
    (s) => s.done === s.total && s.total > 0,
  ).length;

  return (
    <div class="space-y-6">
      {/* Greeting + Title */}
      <div>
        <div class="text-2xl mb-1">{greeting.emoji}</div>
        <h1 class="text-2xl font-bold">Go 実務学習ガイド</h1>
        <p class="text-sm opacity-90 mt-1">{greeting.text}</p>
      </div>

      {/* ── Next Actions ── Quick summary of what to do */}
      <div class="space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-widest opacity-60">
          {dueCount > 0 ? "今すぐやること" : "今日のおすすめ"}
        </h2>

        {/* SRS Review Card — most urgent action */}
        {dueCount > 0 && (
          <button
            class="card bg-warning/10 border border-warning/30 w-full text-left hover:bg-warning/15 transition-colors cursor-pointer"
            onClick={() => onNavigate("random-quiz")}
          >
            <div class="card-body p-4 flex-row items-center gap-4">
              <div class="text-3xl">🔄</div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-warning">
                  復習 {dueCount} 問が期限切れ
                </p>
                <p class="text-xs opacity-70 mt-0.5">
                  SRSスケジュールに基づく復習。忘れる前にやろう
                </p>
              </div>
              <ChevronRightIcon size={16} class="opacity-40 shrink-0" />
            </div>
          </button>
        )}

        {/* Today's Recommendation — only if topic/section data is valid */}
        {recTopic && recSection && (
          <button
            class="card bg-primary/10 border border-primary/20 w-full text-left hover:bg-primary/15 transition-colors cursor-pointer"
            onClick={() => onNavigate(recSection.id)}
          >
            <div class="card-body p-4 flex-row items-center gap-4">
              <StarIcon size={24} class="text-primary shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold">{recTopic.title}</p>
                <p class="text-xs opacity-70 mt-0.5">
                  {todayRec.reason} — {recSection.title}
                </p>
              </div>
              <ChevronRightIcon size={16} class="opacity-40 shrink-0" />
            </div>
          </button>
        )}
      </div>

      {/* ── Overall Progress ── */}
      <div>
        <h2 class="text-xs font-bold uppercase tracking-widest opacity-60 mb-3">
          学習の進み具合
        </h2>
        <div
          class={`card bg-base-200 ${progressPct === 100 ? "milestone-card" : ""}`}
        >
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
            <div class="flex items-center gap-2 mt-2">
              <span class="text-base">{milestone.emoji}</span>
              <span class="text-xs font-semibold text-primary/80">
                {milestone.msg}
              </span>
              <span class="text-xs opacity-85 ml-auto">{progressPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section Grid (grouped) ── */}
      <div class="space-y-5">
        <h2 class="text-xs font-bold uppercase tracking-widest opacity-60">
          セクション別進捗
        </h2>
        {(["basics", "skills", "advanced", "interview"] as SectionGroup[]).map(
          (group) => {
            const groupStats = sectionStats.filter((s) => s.group === group);
            if (groupStats.length === 0) return null;
            return (
              <div key={group}>
                <p class="text-[0.65rem] font-bold opacity-50 mb-2">
                  {SECTION_GROUP_LABELS[group]}
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groupStats.map((s) => (
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
                          {s.done === s.total && s.total > 0 ? (
                            <span class="badge badge-success badge-xs gap-1">
                              ✓ 制覇
                            </span>
                          ) : (
                            <span class="text-xs opacity-80">
                              {s.done}/{s.total}
                            </span>
                          )}
                        </div>
                        <progress
                          class="progress progress-primary progress-sm w-full h-1"
                          value={s.total > 0 ? (s.done / s.total) * 100 : 0}
                          max={100}
                        />
                        <p class="text-xs opacity-90 mt-2 truncate">
                          {s.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* ── Activity ── */}
      <div class="space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-widest opacity-60">
          学習アクティビティ
        </h2>

        {/* Study Calendar */}
        <div class="card bg-base-200">
          <div class="card-body p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold">学習カレンダー</span>
              {streak > 0 && (
                <span class="badge badge-warning badge-sm gap-1">
                  {streak}日連続
                </span>
              )}
            </div>
            <div class="flex gap-[3px] flex-wrap">
              {calData.map((d) => {
                const level =
                  d.count === 0 ? 0 : d.count <= 3 ? 1 : d.count <= 8 ? 2 : 3;
                const colors = [
                  "bg-base-300",
                  "bg-primary/30",
                  "bg-primary/60",
                  "bg-primary",
                ];
                return (
                  <div
                    key={d.date}
                    class={`w-3 h-3 rounded-sm ${colors[level]}`}
                    title={`${d.date}: ${d.count}問`}
                  />
                );
              })}
            </div>
            <div class="flex justify-between mt-2 text-[0.6rem] text-base-content/40">
              <span>12週間前</span>
              <span>今日</span>
            </div>
          </div>
        </div>

        {/* 7-Day Activity Trend */}
        {(() => {
          const last7 = calData.slice(-7);
          const maxCount = Math.max(...last7.map((d) => d.count), 1);
          const totalLast7 = last7.reduce((s, d) => s + d.count, 0);
          const avgPerDay = totalLast7 / 7;
          const remaining = TOTAL_TOPICS - completedCount;
          const estDays =
            avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : null;
          return (
            <div class="card bg-base-200">
              <div class="card-body p-5">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-semibold">過去7日間の学習量</span>
                  <span class="text-xs opacity-80">
                    合計 {totalLast7} 問 (平均 {avgPerDay.toFixed(1)}/日)
                  </span>
                </div>
                <div class="flex items-end gap-1 h-16">
                  {last7.map((d) => (
                    <div
                      key={d.date}
                      class="flex-1 flex flex-col items-center gap-1"
                    >
                      <span class="text-[0.55rem] opacity-60">
                        {d.count || ""}
                      </span>
                      <div
                        class="w-full bg-primary/70 rounded-t-sm transition-all"
                        style={`height: ${d.count > 0 ? Math.max((d.count / maxCount) * 100, 8) : 4}%; ${d.count === 0 ? "opacity: 0.2" : ""}`}
                      />
                    </div>
                  ))}
                </div>
                <div class="flex justify-between mt-1 text-[0.55rem] text-base-content/40">
                  {last7.map((d) => (
                    <span key={d.date} class="flex-1 text-center">
                      {new Date(d.date).toLocaleDateString("ja-JP", {
                        weekday: "narrow",
                      })}
                    </span>
                  ))}
                </div>
                {remaining > 0 && estDays !== null && (
                  <div class="mt-3 pt-3 border-t border-base-300">
                    <p class="text-xs opacity-80">
                      このペースなら{" "}
                      <span class="font-bold text-primary">
                        あと約{estDays}日
                      </span>{" "}
                      で全トピック修了
                    </p>
                  </div>
                )}
                {remaining > 0 && estDays === null && (
                  <div class="mt-3 pt-3 border-t border-base-300">
                    <p class="text-xs opacity-60">
                      学習を始めると修了予測が表示されます
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Accuracy & Weak Points ── */}
      {(sectionAccuracy.length > 0 || weakTopics.length > 0) && (
        <div class="space-y-3">
          <h2 class="text-xs font-bold uppercase tracking-widest opacity-60">
            正答率と弱点
          </h2>

          {/* Section Accuracy */}
          {sectionAccuracy.length > 0 && (
            <div class="card bg-base-200">
              <div class="card-body p-5">
                <span class="text-xs font-semibold mb-3">
                  セクション別正答率
                </span>
                <div class="space-y-2">
                  {sectionAccuracy.map((s) => (
                    <div key={s.id} class="flex items-center gap-2">
                      <span class="text-xs w-24 truncate">
                        {s.icon} {s.title}
                      </span>
                      <progress
                        class={`progress flex-1 h-2 ${
                          s.pct >= 80
                            ? "progress-success"
                            : s.pct >= 50
                              ? "progress-warning"
                              : "progress-error"
                        }`}
                        value={s.pct}
                        max={100}
                      />
                      <span class="text-xs font-bold w-10 text-right">
                        {s.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Weak Topics */}
          {weakTopics.length > 0 && (
            <div class="card bg-error/5 border border-error/20">
              <div class="card-body p-5">
                <span class="text-xs font-semibold text-error mb-2">
                  苦手トピック（正答率80%未満）
                </span>
                <div class="space-y-1.5">
                  {weakTopics.map((w) => (
                    <button
                      key={w.topic.id}
                      class="flex items-center justify-between w-full text-left hover:bg-base-200 rounded px-2 py-1 transition-colors"
                      onClick={() => onNavigate(w.topic.section)}
                    >
                      <span class="text-xs truncate flex-1">
                        {w.topic.title}
                      </span>
                      <span
                        class={`text-xs font-bold ${w.pct < 50 ? "text-error" : "text-warning"}`}
                      >
                        {w.pct}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Manager */}
      <DataManager />

      {/* Stats */}
      <div class="stats stats-horizontal bg-base-200 w-full">
        <div class="stat place-items-center">
          <div class="stat-value text-2xl text-primary">{completedCount}</div>
          <div class="stat-desc flex items-center gap-1">
            <CheckCircleIcon size={10} class="text-primary opacity-60" />
            完了トピック
          </div>
        </div>
        <div class="stat place-items-center">
          <div class="stat-value text-2xl text-success">
            {completedSections}
          </div>
          <div class="stat-desc flex items-center gap-1">
            <TrophyIcon size={10} class="text-success opacity-60" />
            制覇セクション
          </div>
        </div>
        <div class="stat place-items-center">
          <div class="stat-value text-2xl">{notesCount}</div>
          <div class="stat-desc flex items-center gap-1">
            <FileTextIcon size={10} class="opacity-50" />
            メモあり
          </div>
        </div>
        <div class="stat place-items-center">
          <div class="stat-value text-2xl">{TOTAL_TOPICS - completedCount}</div>
          <div class="stat-desc flex items-center gap-1">
            <CircleDotIcon size={10} class="opacity-50" />
            残り
          </div>
        </div>
      </div>
    </div>
  );
}
