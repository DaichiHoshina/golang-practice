import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isDue,
  countDue,
  getDueKeys,
  processResult,
  recordActivity,
  getStreak,
  getCalendarData,
  type SRSCard,
  type SRSStore,
  type StudyLog,
} from "./srs";

// Helper to mock today's date
function mockDate(dateStr: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${dateStr}T12:00:00Z`));
}

afterEach(() => {
  vi.useRealTimers();
});

// ─── SM-2 processResult ─────────────────────────────────

describe("processResult", () => {
  it("creates a new card with interval=1 on first correct", () => {
    mockDate("2026-03-13");
    const card = processResult(undefined, "correct");
    expect(card.repetitions).toBe(1);
    expect(card.interval).toBe(1);
    expect(card.nextReview).toBe("2026-03-14");
    expect(card.ease).toBe(2.5); // quality 4: EF stays at 2.5
  });

  it("sets interval=6 on second consecutive correct", () => {
    mockDate("2026-03-13");
    const first = processResult(undefined, "correct");
    mockDate("2026-03-14");
    const second = processResult(first, "correct");
    expect(second.repetitions).toBe(2);
    expect(second.interval).toBe(6);
    expect(second.nextReview).toBe("2026-03-20");
  });

  it("uses ease factor on third+ correct", () => {
    mockDate("2026-03-13");
    const c1 = processResult(undefined, "correct");
    mockDate("2026-03-14");
    const c2 = processResult(c1, "correct");
    mockDate("2026-03-20");
    const c3 = processResult(c2, "correct");
    expect(c3.repetitions).toBe(3);
    expect(c3.interval).toBe(Math.round(c2.interval * c2.ease));
  });

  it("resets on wrong answer", () => {
    mockDate("2026-03-13");
    const c1 = processResult(undefined, "correct");
    mockDate("2026-03-14");
    const wrong = processResult(c1, "wrong");
    expect(wrong.repetitions).toBe(0);
    expect(wrong.interval).toBe(1);
    expect(wrong.nextReview).toBe("2026-03-15");
    expect(wrong.ease).toBe(Math.max(1.3, c1.ease - 0.2));
  });

  it("never lets ease drop below 1.3", () => {
    mockDate("2026-03-13");
    let card: SRSCard = {
      ease: 1.4,
      interval: 1,
      repetitions: 1,
      nextReview: "2026-03-13",
    };
    // Multiple wrong answers
    for (let i = 0; i < 10; i++) {
      card = processResult(card, "wrong");
    }
    expect(card.ease).toBe(1.3);
  });
});

// ─── isDue / countDue / getDueKeys ──────────────────────

describe("isDue", () => {
  it("returns true when nextReview is today", () => {
    mockDate("2026-03-13");
    expect(
      isDue({
        ease: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: "2026-03-13",
      }),
    ).toBe(true);
  });

  it("returns true when overdue", () => {
    mockDate("2026-03-15");
    expect(
      isDue({
        ease: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: "2026-03-13",
      }),
    ).toBe(true);
  });

  it("returns false when not yet due", () => {
    mockDate("2026-03-13");
    expect(
      isDue({
        ease: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: "2026-03-14",
      }),
    ).toBe(false);
  });
});

describe("countDue", () => {
  it("counts due cards", () => {
    mockDate("2026-03-13");
    const store: SRSStore = {
      a: { ease: 2.5, interval: 1, repetitions: 1, nextReview: "2026-03-13" },
      b: { ease: 2.5, interval: 1, repetitions: 1, nextReview: "2026-03-14" },
      c: { ease: 2.5, interval: 1, repetitions: 1, nextReview: "2026-03-10" },
    };
    expect(countDue(store)).toBe(2); // a (today) and c (overdue)
  });
});

describe("getDueKeys", () => {
  it("returns keys sorted by most overdue first", () => {
    mockDate("2026-03-15");
    const store: SRSStore = {
      recent: {
        ease: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: "2026-03-15",
      },
      old: { ease: 2.5, interval: 1, repetitions: 1, nextReview: "2026-03-10" },
      future: {
        ease: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: "2026-03-20",
      },
    };
    const keys = getDueKeys(store);
    expect(keys).toEqual(["old", "recent"]);
  });
});

// ─── Study Log ──────────────────────────────────────────

describe("recordActivity", () => {
  it("increments quizzes and correct count", () => {
    mockDate("2026-03-13");
    let log: StudyLog = {};
    log = recordActivity(log, "correct");
    log = recordActivity(log, "wrong");
    log = recordActivity(log, "correct");
    expect(log["2026-03-13"]).toEqual({ quizzes: 3, correct: 2 });
  });
});

describe("getStreak", () => {
  it("returns 0 for empty log", () => {
    mockDate("2026-03-13");
    expect(getStreak({})).toBe(0);
  });

  it("counts consecutive days", () => {
    mockDate("2026-03-15");
    const log: StudyLog = {
      "2026-03-15": { quizzes: 3, correct: 2 },
      "2026-03-14": { quizzes: 5, correct: 3 },
      "2026-03-13": { quizzes: 2, correct: 1 },
      "2026-03-11": { quizzes: 1, correct: 1 }, // gap on 3/12
    };
    expect(getStreak(log)).toBe(3);
  });

  it("starts from yesterday if no activity today", () => {
    mockDate("2026-03-15");
    const log: StudyLog = {
      "2026-03-14": { quizzes: 5, correct: 3 },
      "2026-03-13": { quizzes: 2, correct: 1 },
    };
    expect(getStreak(log)).toBe(2);
  });
});

describe("getCalendarData", () => {
  it("returns correct number of days", () => {
    mockDate("2026-03-13");
    const data = getCalendarData({}, 7);
    expect(data).toHaveLength(7);
    expect(data[6].date).toBe("2026-03-13");
    expect(data[0].date).toBe("2026-03-07");
  });

  it("includes activity counts", () => {
    mockDate("2026-03-13");
    const log: StudyLog = {
      "2026-03-13": { quizzes: 5, correct: 3 },
      "2026-03-10": { quizzes: 2, correct: 1 },
    };
    const data = getCalendarData(log, 7);
    expect(data[6].count).toBe(5); // today
    expect(data[3].count).toBe(2); // 3 days ago
    expect(data[5].count).toBe(0); // no activity
  });
});
