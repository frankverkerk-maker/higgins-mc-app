/**
 * ============================================================================
 * MC-CLOUD PROXY — Vervangt de lokale higgins.* procedures
 * ============================================================================
 * Alle higgins.* tRPC calls worden doorgestuurd naar de MC-cloud backend
 * op https://higgins-dash-bbdpujw2.manus.space/api/trpc/higgins.*
 *
 * Circuit Breaker:
 * - Na 3 opeenvolgende fouten → OPEN state (30s cooldown)
 * - In OPEN state → valt terug op lokale _higgins_local_disabled router
 * - Na cooldown → HALF_OPEN state (probeert 1 request)
 * - Bij succes → CLOSED state (normaal proxyen)
 * ============================================================================
 */
import { z } from "zod";
import superjson from "superjson";
import { router, publicProcedure } from "../_core/trpc";

const MC_BASE = "https://higgins-dash-bbdpujw2.manus.space/api/trpc";

export function unwrapTrpcResponse(payload: any): any {
  const resultData = payload?.result?.data;
  if (resultData && typeof resultData === "object" && "json" in resultData) {
    return superjson.deserialize(resultData);
  }
  return payload;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL FALLBACK — calls the local _higgins_local_disabled router via internal HTTP
// ═══════════════════════════════════════════════════════════════════════════

const LOCAL_BASE = "http://127.0.0.1:" + (process.env.PORT || "3000") + "/api/trpc";

async function localFallbackQuery(procedure: string, input: any): Promise<any> {
  try {
    const encoded = encodeURIComponent(JSON.stringify({ json: input || {} }));
    const url = `${LOCAL_BASE}/_higgins_local_disabled.${procedure}?input=${encoded}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      console.error(`[MC-Proxy] Local fallback query ${procedure} failed (${resp.status})`);
      throw new Error(`Local fallback error: ${resp.status}`);
    }
    const data = await resp.json();
    return unwrapTrpcResponse(data);
  } catch (err: any) {
    console.error(`[MC-Proxy] Local fallback query ${procedure} error:`, err.message);
    throw new Error(`Both MC-cloud and local fallback unavailable for ${procedure}`);
  }
}

async function localFallbackMutation(procedure: string, input: any): Promise<any> {
  try {
    const url = `${LOCAL_BASE}/_higgins_local_disabled.${procedure}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: input }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!resp.ok) {
      console.error(`[MC-Proxy] Local fallback mutation ${procedure} failed (${resp.status})`);
      throw new Error(`Local fallback error: ${resp.status}`);
    }
    const data = await resp.json();
    return unwrapTrpcResponse(data);
  } catch (err: any) {
    console.error(`[MC-Proxy] Local fallback mutation ${procedure} error:`, err.message);
    throw new Error(`Both MC-cloud and local fallback unavailable for ${procedure}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER STATE
// ═══════════════════════════════════════════════════════════════════════════

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

const circuitBreaker = {
  state: "CLOSED" as CircuitState,
  failureCount: 0,
  lastFailureTime: 0,
  successCount: 0,
  // Configuration
  failureThreshold: 3,       // Open after 3 consecutive failures
  cooldownMs: 30_000,        // 30 seconds before trying again
  halfOpenSuccessThreshold: 2, // 2 successes in HALF_OPEN → CLOSED
};

function shouldProxy(): boolean {
  const now = Date.now();

  if (circuitBreaker.state === "CLOSED") return true;

  if (circuitBreaker.state === "OPEN") {
    // Check if cooldown has passed
    if (now - circuitBreaker.lastFailureTime >= circuitBreaker.cooldownMs) {
      circuitBreaker.state = "HALF_OPEN";
      circuitBreaker.successCount = 0;
      console.log("[MC-Proxy] Circuit breaker → HALF_OPEN (cooldown expired)");
      return true;
    }
    return false; // Still in cooldown
  }

  // HALF_OPEN — allow requests through
  return true;
}

function recordSuccess(): void {
  if (circuitBreaker.state === "HALF_OPEN") {
    circuitBreaker.successCount++;
    if (circuitBreaker.successCount >= circuitBreaker.halfOpenSuccessThreshold) {
      circuitBreaker.state = "CLOSED";
      circuitBreaker.failureCount = 0;
      console.log("[MC-Proxy] Circuit breaker → CLOSED (recovered)");
      notifyCircuitBreakerRecovered();
    }
  } else if (circuitBreaker.state === "CLOSED") {
    circuitBreaker.failureCount = 0; // Reset on success
  }
}

function recordFailure(): void {
  circuitBreaker.failureCount++;
  circuitBreaker.lastFailureTime = Date.now();
  const wasOpen = circuitBreaker.state === "OPEN";

  if (circuitBreaker.state === "HALF_OPEN") {
    circuitBreaker.state = "OPEN";
    console.log("[MC-Proxy] Circuit breaker → OPEN (half-open request failed)");
    if (!wasOpen) notifyCircuitBreakerOpen();
  } else if (circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
    circuitBreaker.state = "OPEN";
    console.log(`[MC-Proxy] Circuit breaker → OPEN (${circuitBreaker.failureCount} consecutive failures)`);
    if (!wasOpen) notifyCircuitBreakerOpen();
  }
}

// Push notification when circuit breaker opens
async function notifyCircuitBreakerOpen(): Promise<void> {
  try {
    // Dynamic import to avoid circular dependency
    const { pushTokenStore, sendExpoPushNotifications } = await import("../push-service");
    const tokens = Array.from(pushTokenStore.values()).map(r => r.token);
    if (tokens.length === 0) return;
    await sendExpoPushNotifications(tokens, {
      title: "⚠️ MC-Cloud Onbereikbaar",
      body: `Circuit breaker OPEN — ${circuitBreaker.failureCount} opeenvolgende fouten. Lokale fallback actief.`,
      data: { type: "circuit_breaker", state: "OPEN" },
      channelId: "higgins-system",
    });
    console.log("[MC-Proxy] Push notification sent: circuit breaker OPEN");
  } catch (err: any) {
    console.error("[MC-Proxy] Failed to send circuit breaker push:", err.message);
  }
}

// Push notification when circuit breaker recovers
async function notifyCircuitBreakerRecovered(): Promise<void> {
  try {
    const { pushTokenStore, sendExpoPushNotifications } = await import("../push-service");
    const tokens = Array.from(pushTokenStore.values()).map(r => r.token);
    if (tokens.length === 0) return;
    await sendExpoPushNotifications(tokens, {
      title: "✅ MC-Cloud Hersteld",
      body: "Circuit breaker CLOSED — verbinding met MC-cloud is hersteld. Proxy werkt weer normaal.",
      data: { type: "circuit_breaker", state: "CLOSED" },
      channelId: "higgins-system",
    });
    console.log("[MC-Proxy] Push notification sent: circuit breaker RECOVERED");
  } catch (err: any) {
    console.error("[MC-Proxy] Failed to send circuit breaker recovery push:", err.message);
  }
}

export function getCircuitBreakerStatus() {
  return {
    state: circuitBreaker.state,
    failureCount: circuitBreaker.failureCount,
    lastFailureTime: circuitBreaker.lastFailureTime,
    cooldownMs: circuitBreaker.cooldownMs,
    mcCloudUrl: MC_BASE,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROXY HELPERS (with circuit breaker)
// ═══════════════════════════════════════════════════════════════════════════

async function proxyQuery(procedure: string, input: any): Promise<any> {
  if (!shouldProxy()) {
    console.log(`[MC-Proxy] Circuit breaker OPEN — falling back to local for query: ${procedure}`);
    return localFallbackQuery(procedure, input);
  }

  try {
    const encoded = encodeURIComponent(JSON.stringify({ json: input || {} }));
    const url = `${MC_BASE}/higgins.${procedure}?input=${encoded}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000), // 15s timeout
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[MC-Proxy] Query higgins.${procedure} failed (${resp.status}):`, text.slice(0, 200));
      recordFailure();
      throw new Error(`MC proxy error: ${resp.status}`);
    }
    const data = await resp.json();
    recordSuccess();
    return unwrapTrpcResponse(data);
  } catch (err: any) {
    if (err.message?.includes("MC proxy error")) throw err;
    console.error(`[MC-Proxy] Query higgins.${procedure} network error:`, err.message);
    recordFailure();
    throw new Error(`MC-cloud unreachable: ${err.message}`);
  }
}

async function proxyMutation(procedure: string, input: any): Promise<any> {
  if (!shouldProxy()) {
    console.log(`[MC-Proxy] Circuit breaker OPEN — falling back to local for mutation: ${procedure}`);
    return localFallbackMutation(procedure, input);
  }

  try {
    const url = `${MC_BASE}/higgins.${procedure}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: input }),
      signal: AbortSignal.timeout(60_000), // 60s timeout for mutations (LLM calls can be slow)
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[MC-Proxy] Mutation higgins.${procedure} failed (${resp.status}):`, text.slice(0, 200));
      recordFailure();
      throw new Error(`MC proxy error: ${resp.status}`);
    }
    const data = await resp.json();
    recordSuccess();
    return unwrapTrpcResponse(data);
  } catch (err: any) {
    if (err.message?.includes("MC proxy error")) throw err;
    console.error(`[MC-Proxy] Mutation higgins.${procedure} network error:`, err.message);
    recordFailure();
    throw new Error(`MC-cloud unreachable: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK — pings MC-cloud and returns circuit breaker status
// ═══════════════════════════════════════════════════════════════════════════

export async function checkMcCloudHealth(): Promise<{
  mcCloudReachable: boolean;
  responseTimeMs: number;
  circuitBreaker: ReturnType<typeof getCircuitBreakerStatus>;
  timestamp: number;
}> {
  const start = Date.now();
  let reachable = false;

  try {
    const resp = await fetch(`https://higgins-dash-bbdpujw2.manus.space/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });
    reachable = resp.ok;
    if (reachable) recordSuccess();
  } catch {
    reachable = false;
  }

  return {
    mcCloudReachable: reachable,
    responseTimeMs: Date.now() - start,
    circuitBreaker: getCircuitBreakerStatus(),
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

export const mcProxyRouter = router({
  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES — doorgestuurd naar MC-cloud
  // ═══════════════════════════════════════════════════════════════════════════

  getBuilding: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("getBuilding", input)),

  getAgentStatus: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("getAgentStatus", input)),

  morningBrief: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("morningBrief", input)),

  dailyBriefing: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("dailyBriefing", input)),

  getPendingApprovals: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("getPendingApprovals", input)),

  getTaskStatus: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("getTaskStatus", input)),

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATIONS — doorgestuurd naar MC-cloud
  // ═══════════════════════════════════════════════════════════════════════════

  chat: publicProcedure
    .input(z.object({
      message: z.string(),
      history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
      userName: z.string().optional(),
      language: z.string().optional(),
      audioTranscript: z.string().optional(),
      confirmDelegation: z.object({
        targetAgent: z.string(),
        taskDescription: z.string(),
        audioTranscript: z.string().optional(),
        additionalTargets: z.array(z.object({
          agent: z.string(),
          task: z.string().optional(),
        })).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("chat", input)),

  speak: publicProcedure
    .input(z.object({
      text: z.string(),
      voiceId: z.string().optional(),
      language: z.string().optional(),
      agentName: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("speak", input)),

  transcribe: publicProcedure
    .input(z.object({
      audioBase64: z.string(),
      language: z.string().optional(),
      mimeType: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("transcribe", input)),

  transcribeMeeting: publicProcedure
    .input(z.object({
      audioBase64: z.string(),
      language: z.string().optional(),
      duration: z.number().optional(),
      mimeType: z.string().optional(),
      userName: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("transcribeMeeting", input)),

  voiceClone: publicProcedure
    .input(z.object({
      audioBase64: z.string(),
      name: z.string().optional(),
      mimeType: z.string().optional(),
      removeBackgroundNoise: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("voiceClone", input)),

  uploadPdf: publicProcedure
    .input(z.object({
      base64: z.string().optional(),
      url: z.string().optional(),
      fileName: z.string().optional(),
      instruction: z.string().optional(),
      language: z.string().optional(),
      mimeType: z.string().optional(),
      userName: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("uploadPdf", input)),

  generatePdf: publicProcedure
    .input(z.object({
      content: z.string().optional(),
      title: z.string().optional(),
      language: z.string().optional(),
      userName: z.string().optional(),
      messages: z.array(z.any()).optional(),
    }).passthrough())
    .mutation(async ({ input }) => proxyMutation("generatePdf", input)),

  exportChat: publicProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.string(),
        content: z.string(),
        timestamp: z.any().optional(),
        type: z.string().optional(),
        assignedAgent: z.string().optional(),
        audioAttached: z.boolean().optional(),
      })),
      userName: z.string().optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("exportChat", input)),

  activateAgent: publicProcedure
    .input(z.object({
      agentName: z.string(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("activateAgent", input)),

  processApproval: publicProcedure
    .input(z.object({
      approvalId: z.string(),
      action: z.enum(["approve", "reject"]),
      agentName: z.string().optional(),
      actionDescription: z.string().optional(),
      userName: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("processApproval", input)),

  confirmDelegation: publicProcedure
    .input(z.object({
      targetAgent: z.string(),
      taskDescription: z.string(),
      audioTranscript: z.string().optional(),
      userName: z.string().optional(),
      additionalTargets: z.array(z.object({
        agent: z.string(),
        task: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("confirmDelegation", input)),

  checkBreakingNews: publicProcedure
    .input(z.object({ lang: z.string().optional() }))
    .mutation(async ({ input }) => proxyMutation("checkBreakingNews", input)),

  registerPushToken: publicProcedure
    .input(z.object({
      token: z.string(),
      platform: z.string().optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("registerPushToken", input)),
});
