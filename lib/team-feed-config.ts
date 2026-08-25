export const TEAM_FEED_SETTINGS_TIMEOUT_MS = 1_500;

export function selectTeamFeedUrl(
  platform: string,
  envUrl: string,
  storedUrl?: string | null,
): string {
  const env = envUrl.trim();
  const stored = storedUrl?.trim() ?? "";

  // The public Home Screen client has one audited cloud endpoint. Resolve it
  // synchronously so an AsyncStorage/web hydration issue can never strand the
  // screen on its built-in fallback.
  if (platform === "web" && env) return env;

  // Native operator settings remain supported, with the build-time cloud URL
  // as the safe fallback.
  return stored || env;
}
