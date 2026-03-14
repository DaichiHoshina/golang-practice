import { describe, it, expect } from "vitest";
import { seededShuffle } from "./daily-challenge";

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
    const expected = seededShuffle(items, "consistency-test");
    for (let i = 0; i < 100; i++) {
      expect(seededShuffle(items, "consistency-test")).toEqual(expected);
    }
  });
});
