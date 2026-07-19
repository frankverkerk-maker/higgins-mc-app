/**
 * useOfflineQueue — Hook that manages offline message buffering and auto-retry
 *
 * Usage in Chat:
 *   const { queueSize, sendOrQueue, flushQueue } = useOfflineQueue(sendFn);
 *
 * When offline: message is queued in AsyncStorage
 * When online again: flushQueue() sends all buffered messages
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, Platform } from "react-native";
import {
  enqueueMessage,
  dequeueMessage,
  getQueue,
  isOnline,
  type QueuedMessage,
} from "@/lib/offline-queue";

const MAX_RETRIES = 3;
const FLUSH_INTERVAL_MS = 10_000; // Check every 10 seconds

interface UseOfflineQueueOptions {
  /** Function to actually send a message (the tRPC mutation or equivalent) */
  sendFn: (text: string) => Promise<boolean>;
  /** Called when a queued message is successfully sent */
  onFlushed?: (msg: QueuedMessage) => void;
  /** Called when a queued message permanently fails */
  onFailed?: (msg: QueuedMessage) => void;
}

export function useOfflineQueue({ sendFn, onFlushed, onFailed }: UseOfflineQueueOptions) {
  const [queueSize, setQueueSize] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load initial queue size
  useEffect(() => {
    getQueue().then((q) => setQueueSize(q.length));
  }, []);

  // Flush queue when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        flushQueue();
      }
    });
    return () => subscription.remove();
  }, []);

  // Periodic flush attempt
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (queueSize > 0) {
        flushQueue();
      }
    }, FLUSH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [queueSize]);

  /**
   * Try to send immediately; if offline, queue the message
   * Returns: "sent" | "queued"
   */
  const sendOrQueue = useCallback(
    async (text: string): Promise<"sent" | "queued"> => {
      const online = await isOnline();
      if (online) {
        try {
          const success = await sendFn(text);
          if (success) return "sent";
        } catch {
          // Fall through to queue
        }
      }

      // Offline or send failed — queue it
      await enqueueMessage(text);
      const q = await getQueue();
      setQueueSize(q.length);
      return "queued";
    },
    [sendFn]
  );

  /**
   * Attempt to flush all queued messages
   */
  const flushQueue = useCallback(async () => {
    if (isFlushing) return;

    const online = await isOnline();
    if (!online) return;

    const queue = await getQueue();
    if (queue.length === 0) return;

    setIsFlushing(true);

    for (const msg of queue) {
      if (msg.retryCount >= MAX_RETRIES) {
        await dequeueMessage(msg.id);
        onFailed?.(msg);
        continue;
      }

      try {
        const success = await sendFn(msg.text);
        if (success) {
          await dequeueMessage(msg.id);
          onFlushed?.(msg);
        } else {
          // Will retry next cycle
          break;
        }
      } catch {
        // Will retry next cycle
        break;
      }
    }

    const remaining = await getQueue();
    setQueueSize(remaining.length);
    setIsFlushing(false);
  }, [isFlushing, sendFn, onFlushed, onFailed]);

  return {
    queueSize,
    isFlushing,
    sendOrQueue,
    flushQueue,
  };
}
