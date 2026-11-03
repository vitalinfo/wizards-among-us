import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatMemoryLine, startMemoryLog, stopMemoryLog } from "../memory";

const MB = 1024 * 1024;

const usage: NodeJS.MemoryUsage = {
  rss: 412.4 * MB,
  heapTotal: 250 * MB,
  heapUsed: 201.6 * MB,
  external: 40 * MB,
  arrayBuffers: 18 * MB,
};

describe("formatMemoryLine", () => {
  it("prints every part in whole megabytes, heap and non-heap side by side", () => {
    expect(formatMemoryLine(usage)).toBe(
      "memory rss=412MB heapUsed=202MB heapTotal=250MB external=40MB arrayBuffers=18MB",
    );
  });
});

describe("startMemoryLog", () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(process, "memoryUsage").mockReturnValue(usage);
    log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    stopMemoryLog();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("logs one line per interval, starting after the first one", () => {
    startMemoryLog(60_000);
    expect(log).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(formatMemoryLine(usage));

    vi.advanceTimersByTime(120_000);
    expect(log).toHaveBeenCalledTimes(3);
  });

  it("starts only one timer when called twice", () => {
    startMemoryLog(60_000);
    startMemoryLog(60_000);

    vi.advanceTimersByTime(60_000);
    expect(log).toHaveBeenCalledTimes(1);
  });
});
