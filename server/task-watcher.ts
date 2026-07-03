/**
 * TaskWatcher — Server-side background poller for delegated Manus tasks.
 *
 * When the app delegates a task to an agent (via command router or PDF upload),
 * the task ID is registered here. The watcher polls the Manus API every 10s and
 * sends a push notification when the task reaches a terminal state (stopped/error).
 *
 * This ensures the user gets notified even when the app is closed or in background.
 *
 * Design decisions:
 * - In-memory store (single-user app, tasks are short-lived)
 * - Max 50 concurrent watched tasks (safety)
 * - Auto-removes tasks after terminal state or 60 min timeout
 * - Uses the same getTaskStatus logic as the tRPC procedure
 */

import { sendTaskCompletionNotification } from "./push-service";

const POLL_INTERVAL_MS = 10_000; // 10 seconds
const MAX_WATCHED_TASKS = 50;
const TASK_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

interface WatchedTask {
  taskId: string;
  agentName: string;
  language: string;
  registeredAt: number;
  pollCount: number;
}

// ─── In-memory store ─────────────────────────────────────────────────────────
const watchedTasks = new Map<string, WatchedTask>();
let pollerInterval: ReturnType<typeof setInterval> | null = null;

// ─── Manus SDK reference (injected at init) ─────────────────────────────────
let getTaskStatusFn: ((taskId: string) => Promise<{ agentStatus: string; lastMessage?: string }>) | null = null;

/**
 * Initialize the task watcher with the Manus SDK getTaskStatus function.
 * Call this once at server startup.
 */
export function initTaskWatcher(
  getTaskStatus: (taskId: string) => Promise<{ agentStatus: string; lastMessage?: string }>
) {
  getTaskStatusFn = getTaskStatus;

  // Start the background poller if not already running
  if (!pollerInterval) {
    pollerInterval = setInterval(pollAllTasks, POLL_INTERVAL_MS);
    console.log("[task-watcher] Background poller gestart (elke 10s)");
  }
}

/**
 * Register a new task to be watched for completion.
 */
export function watchTask(opts: {
  taskId: string;
  agentName: string;
  language?: string;
}) {
  if (watchedTasks.size >= MAX_WATCHED_TASKS) {
    // Remove oldest task to make room
    const oldest = [...watchedTasks.entries()].sort(
      (a, b) => a[1].registeredAt - b[1].registeredAt
    )[0];
    if (oldest) watchedTasks.delete(oldest[0]);
  }

  watchedTasks.set(opts.taskId, {
    taskId: opts.taskId,
    agentName: opts.agentName,
    language: opts.language ?? "nl",
    registeredAt: Date.now(),
    pollCount: 0,
  });

  console.log(`[task-watcher] Taak geregistreerd: ${opts.agentName} (${opts.taskId.substring(0, 8)}…)`);
}

/**
 * Get the number of currently watched tasks (for diagnostics).
 */
export function getWatchedTaskCount(): number {
  return watchedTasks.size;
}

// ─── Internal poller ─────────────────────────────────────────────────────────
async function pollAllTasks() {
  if (!getTaskStatusFn || watchedTasks.size === 0) return;

  const now = Date.now();
  const tasksToRemove: string[] = [];

  for (const [taskId, task] of watchedTasks) {
    // Timeout check
    if (now - task.registeredAt > TASK_TIMEOUT_MS) {
      console.log(`[task-watcher] Timeout voor ${task.agentName} (${taskId.substring(0, 8)}…)`);
      tasksToRemove.push(taskId);
      // Send timeout notification
      await sendTaskCompletionNotification({
        agentName: task.agentName,
        taskId,
        status: "error",
        resultPreview: "Taak timeout — geen resultaat ontvangen binnen 60 minuten.",
        language: task.language,
      }).catch(() => {});
      continue;
    }

    // Poll the task
    task.pollCount++;
    try {
      const result = await getTaskStatusFn(taskId);

      if (result.agentStatus === "stopped" || result.agentStatus === "error") {
        console.log(`[task-watcher] ${task.agentName} ${result.agentStatus}: ${taskId.substring(0, 8)}…`);
        tasksToRemove.push(taskId);

        // Send push notification
        await sendTaskCompletionNotification({
          agentName: task.agentName,
          taskId,
          status: result.agentStatus as "stopped" | "error",
          resultPreview: result.lastMessage ?? undefined,
          language: task.language,
        }).catch((err) => {
          console.error("[task-watcher] Push notificatie mislukt:", err);
        });
      }
    } catch (_) {
      // Transient error — retry next cycle (don't remove)
    }
  }

  // Clean up completed/timed-out tasks
  for (const id of tasksToRemove) {
    watchedTasks.delete(id);
  }
}

/**
 * Stop the background poller (for graceful shutdown).
 */
export function stopTaskWatcher() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    console.log("[task-watcher] Background poller gestopt");
  }
}
