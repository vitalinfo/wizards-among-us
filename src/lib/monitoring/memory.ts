// One log line a minute splitting the process's memory into the JS heap and
// everything outside it. Heroku's chart shows only the total, and R14 only
// fires above quota, so neither says WHICH part grows. That split decides the
// fix: a heap that fills up is ours to find, while RSS growing ahead of the
// heap is native memory (sharp, tesseract's wasm, the allocator), which
// NODE_OPTIONS cannot cap. See README → Deploying → Memory.
//
// Numbers only: no request, no user, nothing about a child.

const MB = 1024 * 1024;
const DEFAULT_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | undefined;

export function formatMemoryLine(usage: NodeJS.MemoryUsage): string {
  const mb = (bytes: number) => `${Math.round(bytes / MB)}MB`;
  return [
    "memory",
    `rss=${mb(usage.rss)}`,
    `heapUsed=${mb(usage.heapUsed)}`,
    `heapTotal=${mb(usage.heapTotal)}`,
    `external=${mb(usage.external)}`,
    `arrayBuffers=${mb(usage.arrayBuffers)}`,
  ].join(" ");
}

// Safe to call more than once; only the first call starts the timer. The timer
// is unref'd so it never keeps the process alive on shutdown.
export function startMemoryLog(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (timer) {
    return;
  }
  timer = setInterval(() => {
    console.log(formatMemoryLine(process.memoryUsage()));
  }, intervalMs);
  timer.unref();
}

export function stopMemoryLog(): void {
  clearInterval(timer);
  timer = undefined;
}
