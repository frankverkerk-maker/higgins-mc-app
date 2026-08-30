import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { DEVICE_SESSION_HEADER, getValidDeviceAccessToken } from "@/lib/device-pairing";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Resilient fetch wrapper that automatically retries on transient failures.
 *
 * WHY: The dev server (and tunnel) can briefly return 502/503 or time out
 * during restarts, hibernation wake-ups, or memory pressure. Without retry,
 * a single transient blip surfaces as a hard "HTTP 502" crash in Expo Go.
 * This wrapper retries with exponential backoff so the app self-heals.
 *
 * - Retries on: network errors, 502, 503, 504, and request timeouts.
 * - Does NOT retry on: 4xx (client errors) or successful 2xx responses.
 * - Timeout: 15s per attempt to avoid hanging forever.
 */
async function resilientFetch(
  url: RequestInfo | URL,
  options: RequestInit | undefined,
  maxRetries = 3,
): Promise<Response> {
  const TIMEOUT_MS = 15000;
  const RETRYABLE_STATUS = new Set([502, 503, 504]);

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Retry on transient server errors (gateway/unavailable/timeout)
      if (RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
        const backoff = Math.min(500 * Math.pow(2, attempt), 4000);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // Network error or timeout (AbortError) — retry with backoff
      if (attempt < maxRetries) {
        const backoff = Math.min(500 * Math.pow(2, attempt), 4000);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
    }
  }

  // All retries exhausted — throw the last error so callers can handle it
  throw lastError instanceof Error
    ? lastError
    : new Error("Network request failed after retries");
}

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const [token, deviceToken] = await Promise.all([
            Auth.getSessionToken(),
            getValidDeviceAccessToken(),
          ]);
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(deviceToken ? { [DEVICE_SESSION_HEADER]: deviceToken } : {}),
          };
        },
        // Resilient fetch: auto-retry transient 502/503/504 and network errors
        fetch(url, options) {
          return resilientFetch(url, options);
        },
      }),
    ],
  });
}
