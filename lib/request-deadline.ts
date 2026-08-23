export class RequestDeadlineError extends Error {
  readonly timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`${label} exceeded ${timeoutMs}ms`);
    this.name = "RequestDeadlineError";
    this.timeoutMs = timeoutMs;
  }
}

export async function withDeadline<T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RequestDeadlineError(label, timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([operation, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isStaleRequest(
  startedAt: number | null,
  now = Date.now(),
  staleAfterMs = 25_000,
): boolean {
  return startedAt !== null && now - startedAt >= staleAfterMs;
}
