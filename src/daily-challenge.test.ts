import { describe, it, expect } from "vitest";

// Re-implement seededShuffle from daily-challenge.tsx for testing
// (the function is not exported, so we test the algorithm directly)
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
    h |= 0;
  }
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 17), 0x9e3779b9);
    h = Math.imul(h ^ (h >>> 5), 0x6c62272e);
    h ^= h >>> 13;
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe("seededShuffle", () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it("is deterministic for the same seed", () => {
    const a = seededShuffle(items, "2026-03-13");
    const b = seededShuffle(items, "2026-03-13");
    expect(a).toEqual(b);
  });

  it("produces different results for different seeds", () => {
    const a = seededShuffle(items, "2026-03-13");
    const b = seededShuffle(items, "2026-03-14");
    expect(a).not.toEqual(b);
  });

  it("does not modify the original array", () => {
    const original = [...items];
    seededShuffle(items, "test");
    expect(items).toEqual(original);
  });

  it("preserves all elements (no duplicates, no missing)", () => {
    const result = seededShuffle(items, "2026-01-01");
    expect(result.sort((a, b) => a - b)).toEqual(items);
  });

  it("produces consistent results across multiple runs", () => {
    // Run 100 times with same seed - should always produce same result
    const expected = seededShuffle(items, "consistency-test");
    for (let i = 0; i < 100; i++) {
      expect(seededShuffle(items, "consistency-test")).toEqual(expected);
    }
  });
});
