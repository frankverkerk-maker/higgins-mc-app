/**
 * DelegationTracker — Polls a Manus task and shows live status inline.
 *
 * Used inside chat bubbles for text-delegations (and can replace the
 * PdfCard polling logic in the future). Provides the "return path"
 * so that results from delegated agents come back into the conversation.
 *
 * Lifecycle:
 *   1. Mount with taskId + agentName
 *   2. Poll getTaskStatus every 5s
 *   3. Show running → completed/error with result text
 *   4. On completion: call onComplete callback so parent can persist
 */

import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 360; // 30 min max (360 × 5s)

type TaskStatus = "running" | "stopped" | "error" | "waiting";

interface DelegationTrackerProps {
  taskId: string;
  agentName: string;
  language?: string;
  userName?: string;
  /** Called when the task reaches a terminal state with the result text */
  onComplete?: (status: TaskStatus, resultText: string | null) => void;
}

export function DelegationTracker({
  taskId,
  agentName,
  language = "nl",
  userName,
  onComplete,
}: DelegationTrackerProps) {
  const [status, setStatus] = useState<TaskStatus>("running");
  const [resultText, setResultText] = useState<string | null>(null);
  const pollCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!taskId) return;

    const poll = async () => {
      if (completedRef.current) return;
      pollCount.current += 1;

      // Safety: stop after MAX_POLLS to avoid infinite polling
      if (pollCount.current > MAX_POLLS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setStatus("error");
        setResultText("Timeout: geen reactie ontvangen binnen 30 minuten.");
        completedRef.current = true;
        onComplete?.("error", "Timeout: geen reactie ontvangen binnen 30 minuten.");
        return;
      }

      try {
        const input = JSON.stringify({
          json: { taskId, language, userName: userName ?? undefined },
        });
        const url = `${getApiBaseUrl()}/api/trpc/higgins.getTaskStatus?input=${encodeURIComponent(input)}`;
        const res = await fetch(url);
        if (!res.ok) return; // transient error, retry next cycle

        const data = (await res.json()) as {
          result?: {
            data?: {
              json?: {
                agentStatus: string;
                lastMessage?: string;
                higginsResponse?: string;
              };
            };
          };
        };

        const agentStatus = data?.result?.data?.json?.agentStatus as TaskStatus | undefined;
        const lastMsg = data?.result?.data?.json?.lastMessage;
        const higginsResp = data?.result?.data?.json?.higginsResponse;

        if (agentStatus === "stopped" || agentStatus === "error") {
          setStatus(agentStatus);
          const result = lastMsg || higginsResp || null;
          setResultText(result);
          completedRef.current = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete?.(agentStatus, result);
        } else if (agentStatus === "waiting") {
          setStatus("waiting");
        }
      } catch (_) {
        // Transient network error — will retry next cycle
      }
    };

    // Initial poll immediately
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (status === "running") {
    return (
      <View style={styles.container}>
        <View style={styles.runningBadge}>
          <ActivityIndicator size="small" color="#00D4D4" style={{ marginRight: 6 }} />
          <Text style={styles.runningText}>
            {agentName} werkt aan uw opdracht…
          </Text>
        </View>
      </View>
    );
  }

  if (status === "waiting") {
    return (
      <View style={styles.container}>
        <View style={styles.waitingBadge}>
          <Text style={styles.waitingIcon}>⏳</Text>
          <Text style={styles.waitingText}>
            {agentName} wacht op bevestiging
          </Text>
        </View>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.container}>
        <View style={styles.errorBadge}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>
            {agentName} heeft een fout gemeld
          </Text>
        </View>
        {resultText && (
          <Text style={styles.resultText} numberOfLines={6}>{resultText}</Text>
        )}
      </View>
    );
  }

  // status === "stopped" (completed)
  return (
    <View style={styles.container}>
      <View style={styles.completedBadge}>
        <Text style={styles.completedIcon}>✅</Text>
        <Text style={styles.completedText}>
          {agentName} heeft de opdracht voltooid
        </Text>
      </View>
      {resultText && (
        <Text style={styles.resultText} numberOfLines={8}>{resultText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  runningBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,212,212,0.08)",
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(0,212,212,0.3)",
    alignSelf: "flex-start",
  },
  runningText: {
    fontSize: 12,
    color: "#00D4D4",
    fontWeight: "600",
  },
  waitingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(245,166,35,0.1)",
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(245,166,35,0.3)",
    alignSelf: "flex-start",
    gap: 6,
  },
  waitingIcon: { fontSize: 12 },
  waitingText: {
    fontSize: 12,
    color: "#F5A623",
    fontWeight: "600",
  },
  errorBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,77,106,0.1)",
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(255,77,106,0.3)",
    alignSelf: "flex-start",
    gap: 6,
  },
  errorIcon: { fontSize: 12 },
  errorText: {
    fontSize: 12,
    color: "#FF4D6A",
    fontWeight: "600",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(52,211,153,0.1)",
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(52,211,153,0.3)",
    alignSelf: "flex-start",
    gap: 6,
  },
  completedIcon: { fontSize: 12 },
  completedText: {
    fontSize: 12,
    color: "#34D399",
    fontWeight: "600",
  },
  resultText: {
    fontSize: 12,
    color: "rgba(232,237,242,0.85)",
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
});
