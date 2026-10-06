import type { Request, Response } from "express";
import {
  canonicalizeFeedAgents,
  teamFeedSchema,
  whitelabVisible,
  type TeamFeed,
} from "../lib/team-feed-mapper";

/** Command Center's one authoritative directory source (not its own DB). */
export const MC_TEAM_FEED_URL =
  "https://higgins-dash-bbdpujw2.manus.space/api/app/team-feed";

const FRESH_MS = 30_000;
const STALE_MS = 10 * 60_000;
const UPSTREAM_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 1_000_000;

type DirectoryResult = TeamFeed & {
  count: number;
  source: "live" | "stale";
  fetchedAt: string;
  contractVersion: 2;
};

export class TeamDirectoryService {
  private cached: DirectoryResult | null = null;
  private pending: Promise<DirectoryResult> | null = null;
  private retryAfter = 0;

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly clock: () => number = Date.now,
    private readonly url = MC_TEAM_FEED_URL,
  ) {}

  private async refresh(): Promise<DirectoryResult> {
    if (this.pending) return this.pending;
    this.pending = (async () => {
      const response = await this.fetcher(this.url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`upstream_http_${response.status}`);
      if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
        throw new Error("upstream_content_type");
      }
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > MAX_RESPONSE_BYTES) throw new Error("upstream_too_large");
      const text = await response.text();
      if (text.length > MAX_RESPONSE_BYTES) throw new Error("upstream_too_large");
      const raw: unknown = JSON.parse(text);
      const parsed = teamFeedSchema.parse(raw);
      const agents = canonicalizeFeedAgents(parsed.agents).filter(
        agent => parsed.edition !== "whitelab" || whitelabVisible(agent),
      );
      const result: DirectoryResult = {
        ...parsed,
        agents,
        count: agents.length,
        source: "live",
        fetchedAt: new Date(this.clock()).toISOString(),
        contractVersion: 2,
      };
      this.cached = result;
      this.retryAfter = 0;
      return result;
    })().catch(error => {
      this.retryAfter = this.clock() + 30_000;
      throw error;
    }).finally(() => { this.pending = null; });
    return this.pending;
  }

  async get(): Promise<DirectoryResult> {
    const previous = this.cached;
    const age = previous ? this.clock() - new Date(previous.fetchedAt).getTime() : Infinity;
    if (previous && age < FRESH_MS) return previous;
    if (previous && age < STALE_MS) {
      // Keep the UI responsive; refresh once in the background. Stale is never
      // labelled live and it expires rather than persisting inaccurate statuses.
      if (this.clock() >= this.retryAfter) {
        void this.refresh().catch(error => {
          console.warn("[TeamDirectory] refresh failed:", error instanceof Error ? error.message : "unknown");
        });
      }
      return { ...previous, source: "stale" };
    }
    if (this.clock() < this.retryAfter) throw new Error("upstream_retry_later");
    return this.refresh();
  }
}

export const teamDirectory = new TeamDirectoryService();

export async function teamDirectoryHandler(_req: Request, res: Response) {
  res.set("Cache-Control", "no-store");
  try {
    res.json(await teamDirectory.get());
  } catch (error) {
    console.error("[TeamDirectory] source unavailable:", error instanceof Error ? error.message : "unknown");
    res.status(503).json({ error: "team_directory_unavailable" });
  }
}
