import { formatTime, nextIndex, prevIndex, shuffleAround } from "./queue";

describe("nextIndex", () => {
  it("moves forward and stops at the end without repeat", () => {
    expect(nextIndex(3, 0, "off", true)).toBe(1);
    expect(nextIndex(3, 2, "off", true)).toBeNull();
  });
  it("wraps with repeat all", () => {
    expect(nextIndex(3, 2, "all", false)).toBe(0);
  });
  it("replays on auto-advance with repeat one, but next still skips", () => {
    expect(nextIndex(3, 1, "one", true)).toBe(1);
    expect(nextIndex(3, 1, "one", false)).toBe(2);
  });
  it("handles an empty queue", () => {
    expect(nextIndex(0, -1, "all", true)).toBeNull();
  });
});

describe("prevIndex", () => {
  it("goes back, wrapping only with repeat all", () => {
    expect(prevIndex(3, 2, "off")).toBe(1);
    expect(prevIndex(3, 0, "off")).toBe(0);
    expect(prevIndex(3, 0, "all")).toBe(2);
  });
});

describe("shuffleAround", () => {
  it("keeps the current item first and every item once", () => {
    const items = ["a", "b", "c", "d", "e"];
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const out = shuffleAround(items, 2, rand);
    expect(out[0]).toBe("c");
    expect([...out].sort()).toEqual([...items].sort());
  });
});

it("formats times", () => {
  expect(formatTime(0)).toBe("0:00");
  expect(formatTime(65.9)).toBe("1:05");
  expect(formatTime(NaN)).toBe("0:00");
});
