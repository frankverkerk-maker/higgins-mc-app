/**
 * Team Feed — Higgins MC
 *
 * Leest de live agent-/editie-feed van de Mission Control runtime
 * (Mac Mini agent-edition server, endpoint GET /api/app/team-feed).
 *
 * Bron van waarheid = MC. De app stuurt NIET; agent on/off en editie
 * worden alleen in de MC dashboard beheerd. Lukt de feed niet, dan valt
 * Team Pulse terug op de ingebouwde lijst in constants/team.ts, zodat er
 * nooit een leeg scherm verschijnt.
 *
 * Config (in volgorde van voorrang):
 *   1. operator-veld in Settings  → AsyncStorage key MC_TEAM_FEED_URL_KEY
 *   2. EXPO_PUBLIC_MC_TEAM_FEED_URL (build-time env)
 *   3. leeg → altijd ingebouwde lijst
 */

import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getTeam,
  getDepartments,
  type DepartmentMeta,
  type Edition,
} from "@/constants/team";
import { mapTeamFeedAgents, type FeedAgent } from "@/lib/team-feed-mapper";
import type { Agent } from "@/constants/team";

export const MC_TEAM_FEED_URL_KEY = "higgins_mc_team_feed_url";

const ENV_FEED_URL = (process.env.EXPO_PUBLIC_MC_TEAM_FEED_URL ?? "").trim();

type FeedResponse = {
  edition: Edition;
  count: number;
  agents: FeedAgent[];
};

export type TeamFeedSource = "live" | "builtin";

export interface TeamFeedResult {
  /** Agents zoals getoond in Team Pulse (live indien beschikbaar). */
  team: Agent[];
  /** Afdelingen, editie-gefilterd. */
  departments: DepartmentMeta[];
  /** Actieve editie (van de feed indien live, anders meegegeven default). */
  edition: Edition;
  /** Waar de data vandaan komt. */
  source: TeamFeedSource;
  loading: boolean;
  /** Foutmelding wanneer de live-feed niet bereikbaar was (informatief). */
  error: string | null;
  /** Handmatig opnieuw ophalen. */
  refresh: () => void;
}

/** Resolve de te gebruiken feed-URL (Settings > env). */
export async function resolveFeedUrl(): Promise<string> {
  try {
    const stored = (await AsyncStorage.getItem(MC_TEAM_FEED_URL_KEY)) ?? "";
    const trimmed = stored.trim();
    if (trimmed) return trimmed;
  } catch (_) {
    /* ignore */
  }
  return ENV_FEED_URL;
}

/**
 * Hook: lever de live (of fallback) team-set voor een gegeven editie-default.
 * De live-feed bepaalt zelf de editie; de meegegeven `fallbackEdition`
 * geldt alleen wanneer er geen live data is.
 */
export function useTeamFeed(fallbackEdition: Edition = "internal"): TeamFeedResult {
  const [state, setState] = useState<{
    team: Agent[];
    departments: DepartmentMeta[];
    edition: Edition;
    source: TeamFeedSource;
    loading: boolean;
    error: string | null;
  }>(() => ({
    team: getTeam(fallbackEdition),
    departments: getDepartments(fallbackEdition),
    edition: fallbackEdition,
    source: "builtin",
    loading: true,
    error: null,
  }));

  const load = useCallback(async () => {
    const url = await resolveFeedUrl();

    // Geen feed geconfigureerd → blijf op ingebouwde lijst
    if (!url) {
      setState({
        team: getTeam(fallbackEdition),
        departments: getDepartments(fallbackEdition),
        edition: fallbackEdition,
        source: "builtin",
        loading: false,
        error: null,
      });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FeedResponse = await res.json();
      if (!data || !Array.isArray(data.agents)) throw new Error("invalid_feed");

      const edition: Edition = data.edition === "whitelab" ? "whitelab" : "internal";
      const builtinTeam = getTeam("internal");
      const liveTeam = mapTeamFeedAgents(data.agents, builtinTeam);

      // Afdelingen blijven uit het ingebouwde schema (voor kleuren/volgorde),
      // editie-gefilterd zodat classified afdelingen in whitelab verdwijnen.
      const departments = getDepartments(edition).filter((d) =>
        liveTeam.some((a) => a.department === d.name) || d.head !== "—"
      );

      setState({
        team: liveTeam,
        departments: getDepartments(edition),
        edition,
        source: "live",
        loading: false,
        error: null,
      });
    } catch (e: any) {
      // Stille, nette fallback naar ingebouwde lijst
      setState({
        team: getTeam(fallbackEdition),
        departments: getDepartments(fallbackEdition),
        edition: fallbackEdition,
        source: "builtin",
        loading: false,
        error: e?.name === "AbortError" ? "timeout" : String(e?.message ?? e),
      });
    } finally {
      clearTimeout(timer);
    }
  }, [fallbackEdition]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
