/**
 * Offline Message Queue
 *
 * Buffers messages when network is unavailable and automatically
 * resends them when connectivity is restored.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const QUEUE_KEY = "@higgins_offline_queue";

export interface QueuedMessage {
  id: string;
  text: string;
  timestamp: number;
  retryCount: number;
}

/**
 * Add a message to the offline queue
 */
export async function enqueueMessage(text: string): Promise<QueuedMessage> {
  const msg: QueuedMessage = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text,
    timestamp: Date.now(),
    retryCount: 0,
  };

  const queue = await getQueue();
  queue.push(msg);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return msg;
}

/**
 * Get all queued messages
 */
export async function getQueue(): Promise<QueuedMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a message from the queue (after successful send)
 */
export async function dequeueMessage(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((m) => m.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

/**
 * Increment retry count for a message
 */
export async function incrementRetry(id: string): Promise<void> {
  const queue = await getQueue();
  const msg = queue.find((m) => m.id === id);
  if (msg) {
    msg.retryCount += 1;
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

/**
 * Clear the entire queue
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Check if the device is online (basic connectivity check)
 */
export async function isOnline(): Promise<boolean> {
  if (Platform.OS === "web") {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }
  // On native, try a lightweight fetch to the API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("https://clients3.google.com/generate_204", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Get queue size (for badge display)
 */
export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
