export type McCloudActivityState = "initial" | "refreshing" | "retrying" | "cached" | "fallback" | "idle";

const LABELS: Record<Exclude<McCloudActivityState, "idle">, string> = {
  initial: "MC-cloud verbinden",
  refreshing: "MC-cloud verversen",
  retrying: "Opnieuw verbinden",
  cached: "Gecachte gegevens",
  fallback: "Offline gegevens",
};

export function getMcCloudActivityPresentation(state: McCloudActivityState, reduceMotion: boolean) {
  const busy = state === "initial" || state === "refreshing" || state === "retrying";
  return {
    visible: state !== "idle",
    busy,
    animated: busy && !reduceMotion,
    label: state === "idle" ? "" : LABELS[state],
    tone: state === "cached" ? "cached" as const : state === "fallback" ? "fallback" as const : "live" as const,
  };
}
