// ─── SM-2 Spaced Repetition Algorithm ─────────────────────

export interface SRSCard {
  ease: number; // Easiness factor (min 1.3, default 2.5)
  interval: number; // Days until next review
  repetitions: number; // Consecutive correct answers
  nextReview: string; // ISO date string (YYYY-MM-DD)
}

export type SRSStore = Record<string, SRSCard>;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Returns true if the card is due for review (today or overdue) */
export function isDue(card: SRSCard): boolean {
  return card.nextReview <= todayStr();
}

/** Count cards due for review */
export function countDue(store: SRSStore): number {
  return Object.values(store).filter(isDue).length;
}

/** Get quiz keys sorted by review priority (most overdue first) */
export function getDueKeys(store: SRSStore): string[] {
  const today = todayStr();
  return Object.entries(store)
    .filter(([, card]) => card.nextReview <= today)
    .sort(([, a], [, b]) => a.nextReview.localeCompare(b.nextReview))
    .map(([key]) => key);
}

/**
 * Process a quiz result and return updated SRS card.
 * Uses simplified SM-2: correct = quality 4, wrong = quality 1
 */
export function processResult(
  card: SRSCard | undefined,
  result: "correct" | "wrong",
): SRSCard {
  const today = todayStr();
  const prev: SRSCard = card ?? {
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: today,
  };

  if (result === "correct") {
    const quality = 4;
    let newInterval: number;
    const newReps = prev.repetitions + 1;

    if (newReps === 1) {
      newInterval = 1;
    } else if (newReps === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(prev.interval * prev.ease);
    }

    // SM-2 ease update: EF' = EF + (0.1 - (5-q)*(0.08+(5-q)*0.02))
    const newEase = Math.max(
      1.3,
      prev.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    );

    return {
      ease: newEase,
      interval: newInterval,
      repetitions: newReps,
      nextReview: addDays(today, newInterval),
    };
  }

  // Wrong: reset repetitions, review tomorrow
  return {
    ease: Math.max(1.3, prev.ease - 0.2),
    interval: 1,
    repetitions: 0,
    nextReview: addDays(today, 1),
  };
}

// ─── Study Log ─────────────────────────────────────────────

export interface DayLog {
  quizzes: number;
  correct: number;
}

export type StudyLog = Record<string, DayLog>;

/** Record a quiz answer in the study log */
export function recordActivity(
  log: StudyLog,
  result: "correct" | "wrong",
): StudyLog {
  const today = todayStr();
  const prev = log[today] ?? { quizzes: 0, correct: 0 };
  return {
    ...log,
    [today]: {
      quizzes: prev.quizzes + 1,
      correct: prev.correct + (result === "correct" ? 1 : 0),
    },
  };
}

/** Calculate study streak (consecutive days with activity) */
export function getStreak(log: StudyLog): number {
  const today = new Date();
  let streak = 0;
  const d = new Date(today);

  // Check today first
  const todayKey = d.toISOString().slice(0, 10);
  if (!log[todayKey]) {
    // If no activity today, start from yesterday
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (log[key] && log[key].quizzes > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/** Get last N days of activity data for calendar */
export function getCalendarData(
  log: StudyLog,
  days: number,
): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  const d = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(d);
    date.setDate(d.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    result.push({ date: key, count: log[key]?.quizzes ?? 0 });
  }
  return result;
}
