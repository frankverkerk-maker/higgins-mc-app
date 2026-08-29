export type TeamFeedFailureCode =
  | "timeout"
  | "http_error"
  | "invalid_payload"
  | "network_error";

export class TeamFeedRequestError extends Error {
  readonly code: TeamFeedFailureCode;
  readonly status?: number;

  constructor(code: TeamFeedFailureCode, message: string, status?: number) {
    super(message);
    this.name = "TeamFeedRequestError";
    this.code = code;
    this.status = status;
  }
}

type FetchLike = typeof fetch;

type FetchValidatedJsonOptions<T> = {
  url: string;
  validate: (value: unknown) => value is T;
  attempts?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
  fetchImpl?: FetchLike;
};

export type ValidatedTeamFeedPayload = {
  edition: "internal" | "whitelab";
  count: number;
  agents: Array<{
    name: string;
    role: string;
    department: string;
    [key: string]: unknown;
  }>;
};

export function isTeamFeedPayload(value: unknown): value is ValidatedTeamFeedPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ValidatedTeamFeedPayload>;
  return (
    (candidate.edition === "internal" || candidate.edition === "whitelab") &&
    typeof candidate.count === "number" &&
    Number.isFinite(candidate.count) &&
    Array.isArray(candidate.agents) &&
    candidate.agents.every((agent) =>
      Boolean(
        agent &&
          typeof agent === "object" &&
          typeof agent.name === "string" &&
          typeof agent.role === "string" &&
          typeof agent.department === "string",
      ),
    )
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFailure(error: unknown, timedOut: boolean): TeamFeedRequestError {
  if (timedOut) {
    return new TeamFeedRequestError("timeout", "Mission Control team feed timed out");
  }
  if (error instanceof TeamFeedRequestError) return error;
  return new TeamFeedRequestError(
    "network_error",
    error instanceof Error ? error.message : "Mission Control team feed request failed",
  );
}

export async function fetchValidatedJson<T>({
  url,
  validate,
  attempts = 2,
  timeoutMs = 8_000,
  retryDelayMs = 350,
  fetchImpl = fetch,
}: FetchValidatedJsonOptions<T>): Promise<T> {
  const safeAttempts = Math.max(1, Math.min(attempts, 3));
  let lastFailure = new TeamFeedRequestError("network_error", "Team feed request failed");

  for (let attempt = 1; attempt <= safeAttempts; attempt += 1) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
        credentials: "omit",
        mode: "cors",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new TeamFeedRequestError(
          "http_error",
          `Mission Control team feed returned HTTP ${response.status}`,
          response.status,
        );
      }
      const payload: unknown = await response.json();
      if (!validate(payload)) {
        throw new TeamFeedRequestError("invalid_payload", "Mission Control team feed payload is invalid");
      }
      return payload;
    } catch (error) {
      lastFailure = normalizeFailure(error, timedOut);
    } finally {
      clearTimeout(timer);
    }

    if (attempt < safeAttempts) await wait(retryDelayMs);
  }

  throw lastFailure;
}
