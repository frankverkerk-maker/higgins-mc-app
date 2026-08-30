/**
 * Team Feed — Higgins MC
 *
 * MC is the source of truth. A validated MC snapshot can bridge a transient
 * iOS Home Screen cold start, but embedded data is never labelled as live.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getTeam,
  getDepartments,
  type Agent,
  type DepartmentMeta,
  type Edition,
} from "@/constants/team";
import { selectTeamFeedUrl, TEAM_FEED_SETTINGS_TIMEOUT_MS } from "@/lib/team-feed-config";
import {
  fetchValidatedJson,
  isTeamFeedPayload,
  TeamFeedRequestError,
  type TeamFeedFailureCode,
} from "@/lib/team-feed-request";
import { mapPayload, type FeedResponse } from "@/lib/team-feed-map";

export const MC_TEAM_FEED_URL_KEY = "higgins_mc_team_feed_url";

const ENV_FEED_URL = (process.env.EXPO_PUBLIC_MC_TEAM_FEED_URL ?? "").trim();
const TEAM_FEED_CACHE_KEY = "higgins_mc_team_feed_snapshot_v2";
const TEAM_FEED_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type CachedFeed = {
  savedAt: number;
  payload: FeedResponse;
};

export type TeamFeedSource = "live" | "cached" | "builtin" | "loading";
export type TeamFeedActivity = "initial" | "refreshing" | "retrying" | "idle" | "cached" | "fallback";
export type TeamFeedDiagnostic = TeamFeedFailureCode | "missing_url" | null;

export interface TeamFeedResult {
  team: Agent[];
  departments: DepartmentMeta[];
  edition: Edition;
  source: TeamFeedSource;
  loading: boolean;
  activity: TeamFeedActivity;
  error: TeamFeedDiagnostic;
  refresh: () => void;
}

export async function resolveFeedUrl(): Promise<string> {
  const directWebUrl = selectTeamFeedUrl(Platform.OS, ENV_FEED_URL);
  if (directWebUrl) return directWebUrl;

  try {
    const stored = await Promise.race([
      AsyncStorage.getItem(MC_TEAM_FEED_URL_KEY),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TEAM_FEED_SETTINGS_TIMEOUT_MS)),
    ]);
    return selectTeamFeedUrl(Platform.OS, ENV_FEED_URL, stored);
  } catch {
    return ENV_FEED_URL;
  }
}

async function readCachedFeed(): Promise<CachedFeed | null> {
  try {
    const raw =
      Platform.OS === "web" && typeof localStorage !== "undefined"
        ? localStorage.getItem(TEAM_FEED_CACHE_KEY)
        : await AsyncStorage.getItem(TEAM_FEED_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const cached = parsed as Partial<CachedFeed>;
    if (
      typeof cached.savedAt !== "number" ||
      Date.now() - cached.savedAt > TEAM_FEED_CACHE_MAX_AGE_MS ||
      !isTeamFeedPayload(cached.payload)
    ) {
      return null;
    }
    return cached as CachedFeed;
  } catch {
    return null;
  }
}

async function writeCachedFeed(payload: FeedResponse): Promise<void> {
  const raw = JSON.stringify({ savedAt: Date.now(), payload } satisfies CachedFeed);
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(TEAM_FEED_CACHE_KEY, raw);
    } else {
      await AsyncStorage.setItem(TEAM_FEED_CACHE_KEY, raw);
    }
  } catch {
    // A storage failure must never hide an otherwise valid MC response.
  }
}

export function useTeamFeed(fallbackEdition: Edition = "internal"): TeamFeedResult {
  const [state, setState] = useState<{
    team: Agent[];
    departments: DepartmentMeta[];
    edition: Edition;
    source: TeamFeedSource;
    loading: boolean;
    activity: TeamFeedActivity;
    error: TeamFeedDiagnostic;
  }>(() => ({
    team: getTeam(fallbackEdition),
    departments: getDepartments(fallbackEdition),
    edition: fallbackEdition,
    source: "loading",
    loading: true,
    activity: "initial",
    error: null,
  }));
  const generationRef = useRef(0);

  const load = useCallback(async (force = false) => {
    const generation = ++generationRef.current;
    let cachedApplied = false;
    setState((previous) => ({
      ...previous,
      source: previous.source === "builtin" ? "loading" : previous.source,
      loading: true,
      activity: previous.source === "loading" ? "initial" : "refreshing",
      error: null,
    }));

    if (!force) {
      const cached = await readCachedFeed();
      if (generation !== generationRef.current) return;
      if (cached) {
        cachedApplied = true;
        setState({
          ...mapPayload(cached.payload),
          source: "cached",
          loading: true,
          activity: "refreshing",
          error: null,
        });
      }
    }

    const url = await resolveFeedUrl();
    if (generation !== generationRef.current) return;
    if (!url) {
      setState((previous) =>
        previous.source === "cached"
          ? { ...previous, loading: false, activity: "cached", error: "missing_url" }
          : {
              team: getTeam(fallbackEdition),
              departments: getDepartments(fallbackEdition),
              edition: fallbackEdition,
              source: "builtin",
              loading: false,
              activity: "fallback",
              error: "missing_url",
            },
      );
      return;
    }

    try {
      const payload = (await fetchValidatedJson({
        url,
        validate: isTeamFeedPayload,
        attempts: 2,
        timeoutMs: 8_000,
        onAttempt: (attempt) => {
          if (attempt > 1 && generation === generationRef.current) {
            setState((previous) => ({ ...previous, activity: "retrying" }));
          }
        },
      })) as FeedResponse;
      if (generation !== generationRef.current) return;
      setState({ ...mapPayload(payload), source: "live", loading: false, activity: "idle", error: null });
      await writeCachedFeed(payload);
    } catch (error) {
      if (generation !== generationRef.current) return;
      const diagnostic = error instanceof TeamFeedRequestError ? error.code : "network_error";
      if (cachedApplied) {
        setState((previous) => ({ ...previous, source: "cached", loading: false, activity: "cached", error: diagnostic }));
      } else {
        setState({
          team: getTeam(fallbackEdition),
          departments: getDepartments(fallbackEdition),
          edition: fallbackEdition,
          source: "builtin",
          loading: false,
          activity: "fallback",
          error: diagnostic,
        });
      }
    }
  }, [fallbackEdition]);

  useEffect(() => {
    void load(false);
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void load(true);
    });
    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void load(true);
      }
    };
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    return () => {
      generationRef.current += 1;
      appStateSubscription.remove();
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [load]);

  return { ...state, refresh: () => void load(true) };
}
