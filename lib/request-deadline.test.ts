import { describe, expect, it, vi } from "vitest";
import { isStaleRequest, RequestDeadlineError, withDeadline } from "./request-deadline";

describe("Native chat request deadline", () => {
  it("returns a response that settles before the deadline", async () => {
    await expect(withDeadline(Promise.resolve("ok"), 100, "chat")).resolves.toBe("ok");
  });

  it("releases callers when the underlying request never settles", async () => {
    vi.useFakeTimers();
    const pending = withDeadline(new Promise<string>(() => {}), 500, "chat");
    const expectation = expect(pending).rejects.toBeInstanceOf(RequestDeadlineError);
    await vi.advanceTimersByTimeAsync(500);
    await expectation;
    vi.useRealTimers();
  });

  it("ignores a late resolution after the deadline has fired", async () => {
    vi.useFakeTimers();
    let resolveLate!: (value: string) => void;
    const operation = new Promise<string>((resolve) => { resolveLate = resolve; });
    const pending = withDeadline(operation, 200, "chat");
    const expectation = expect(pending).rejects.toBeInstanceOf(RequestDeadlineError);
    await vi.advanceTimersByTimeAsync(200);
    await expectation;
    resolveLate("late");
    vi.useRealTimers();
  });

  it("classifies only elapsed active requests as stale", () => {
    expect(isStaleRequest(null, 50_000, 25_000)).toBe(false);
    expect(isStaleRequest(30_000, 50_000, 25_000)).toBe(false);
    expect(isStaleRequest(25_000, 50_000, 25_000)).toBe(true);
  });
});
