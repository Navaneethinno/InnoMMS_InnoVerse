import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startVisiblePoll } from "./useVisiblePoll";

describe("startVisiblePoll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { visibilityState: "visible" });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reads on each tick and stops when told", async () => {
    const read = vi.fn(() => Promise.resolve());
    const stop = startVisiblePoll(read, 1000);
    await vi.advanceTimersByTimeAsync(2000);
    expect(read).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(2000);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("skips a hidden tab", async () => {
    document.visibilityState = "hidden";
    const read = vi.fn(() => Promise.resolve());
    const stop = startVisiblePoll(read, 1000);
    await vi.advanceTimersByTimeAsync(3000);
    expect(read).not.toHaveBeenCalled();
    stop();
  });

  it("never overlaps a call still waiting", async () => {
    let finish;
    const read = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    const stop = startVisiblePoll(read, 1000);
    await vi.advanceTimersByTimeAsync(3000);
    expect(read).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(1000);
    expect(read).toHaveBeenCalledTimes(2);
    stop();
  });
});
