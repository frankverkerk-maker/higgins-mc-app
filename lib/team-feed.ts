/**
 * Team Pulse reads one canonical, same-origin Command Center directory by
 * default. A consciously configured operator URL still overrides it.
 * The MC-cloud database remains the source of truth; the server validates and
 * normalizes its read-only feed, without changing agent identities upstream.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";
import {
  getTeam,
  getDepartments,
  type DepartmentMeta,
  type Edition,
} from "@/constants/team";
import { effectiveTeamEdition, mapTeamFeedAgents, teamFeedSchema, whitelabVisible } from "@/lib/team-feed-mapper";
import type { Agent } from "@/constants/team";

export const MC_TEAM_FEED_URL_KEY = "higgins_mc_team_feed_url";
const ENV_FEED_URL = (process.env.EXPO_PUBLIC_MC_TEAM_FEED_URL ?? "").trim();
const REFRESH_INTERVAL_MS = 60_000;

export type TeamFeedSource = "live" | "stale" | "builtin";
export interface TeamFeedResult {
  team: Agent[];
  departments: DepartmentMeta[];
  edition: Edition;
  source: TeamFeedSource;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function sameOriginFeedUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { hostname, origin, protocol } = window.location;
    // Metro and API run on separate ports in preview, but on one domain in prod.
    if (/^8081-/.test(hostname)) {
      return `${protocol}//${hostname.replace(/^8081-/, "3000-")}/api/app/team-feed`;
    }
    return `${origin}/api/app/team-feed`;
  }
  return `${getApiBaseUrl()}/api/app/team-feed`;
}

export async function resolveFeedUrl(): Promise<string> {
  try {
    const stored = (await AsyncStorage.getItem(MC_TEAM_FEED_URL_KEY))?.trim();
    if (stored) return stored;
  } catch (_) { /* Settings storage is optional. */ }
  return ENV_FEED_URL || sameOriginFeedUrl();
}

export function useTeamFeed(fallbackEdition: Edition = "internal"): TeamFeedResult {
  const lastGoodAt = useRef(0);
  const latestRequest = useRef(0);
  const [state, setState] = useState<Omit<TeamFeedResult, "refresh">>(() => ({
    team: getTeam(fallbackEdition),
    departments: getDepartments(fallbackEdition),
    edition: fallbackEdition,
    source: "builtin",
    loading: true,
    error: null,
  }));

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    const url = await resolveFeedUrl();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35_000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = teamFeedSchema.parse(await response.json());
      // Neither an MC response nor an operator override may widen a local
      // whitelab session into the classified internal edition.
      const edition = effectiveTeamEdition(fallbackEdition, parsed.edition);
      const permitted = edition === "whitelab" ? parsed.agents.filter(whitelabVisible) : parsed.agents;
      const team = mapTeamFeedAgents(permitted, getTeam("internal"));
      const departments = [...getDepartments(edition)];
      const known = new Set(departments.map(department => department.name));
      // Unknown new MC departments remain visible rather than disappearing.
      for (const name of [...new Set(team.map(agent => agent.department))].sort()) {
        if (!known.has(name)) departments.push({ id: `external:${name}`, name, head: "—" });
      }
      if (request !== latestRequest.current) return;
      lastGoodAt.current = parsed.source === "stale"
        ? Date.parse(parsed.fetchedAt ?? "") || Date.now()
        : Date.now();
      setState({
        team,
        departments,
        edition,
        source: parsed.source === "stale" ? "stale" : "live",
        loading: false,
        error: null,
      });
    } catch (error: any) {
      if (request !== latestRequest.current) return;
      const message = error?.name === "AbortError" ? "timeout" : String(error?.message ?? error);
      setState(previous => {
        if (previous.source !== "builtin" && Date.now() - lastGoodAt.current < 10 * 60_000) {
          return { ...previous, source: "stale", loading: false, error: message };
        }
        // Once expired, never claim offline built-in records are live MC data.
        return {
          team: getTeam(fallbackEdition), departments: getDepartments(fallbackEdition),
          edition: fallbackEdition, source: "builtin", loading: false, error: message,
        };
      });
    } finally {
      clearTimeout(timer);
    }
  }, [fallbackEdition]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => { void load(); }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { ...state, refresh: () => { void load(); } };
}
