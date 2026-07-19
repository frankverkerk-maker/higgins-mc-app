/**
 * Manus API Service voor Higgins MC
 *
 * Verbindt de app met de Manus API om berichten te sturen naar en
 * ontvangen van de Higgins agent (en andere agents in het team).
 *
 * Documentatie: https://open.manus.ai/docs/v2/task.sendMessage
 */

const MANUS_API_BASE = "https://api.manus.ai";

export type ManusMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp?: string;
};

export type SendMessageOptions = {
  taskId?: string;
  content: string;
  apiKey: string;
};

export type SendMessageResult = {
  taskId: string;
  response: string;
  ok: boolean;
  error?: string;
};

/**
 * Stuur een bericht naar de Higgins agent via de Manus API.
 * Als er geen taskId is, wordt een nieuwe taak aangemaakt.
 * Als er al een taskId is, wordt het bericht toegevoegd aan de bestaande conversatie.
 */
export async function sendMessageToHiggins(
  options: SendMessageOptions
): Promise<SendMessageResult> {
  const { content, apiKey, taskId } = options;

  try {
    if (taskId) {
      // Vervolg bestaande conversatie
      const res = await fetch(`${MANUS_API_BASE}/v2/task.sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-manus-api-key": apiKey,
        },
        body: JSON.stringify({
          task_id: taskId,
          message: { role: "user", content },
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        return { taskId, response: "", ok: false, error: data.error?.message };
      }

      // Wacht op het antwoord via polling
      return await pollForResponse(taskId, apiKey);
    } else {
      // Nieuwe taak aanmaken
      const res = await fetch(`${MANUS_API_BASE}/v2/task.create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-manus-api-key": apiKey,
        },
        body: JSON.stringify({
          message: {
            role: "user",
            content: `Je bent Higgins, de Chief AI Officer van Higgins MC, een AI-multiagent corporate management systeem van Carpe Diem GmbH. Je bent professioneel, proactief en beknopt. Eerste bericht: ${content}`,
          },
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        return { taskId: "", response: "", ok: false, error: data.error?.message };
      }

      const newTaskId = data.data?.task_id;
      return await pollForResponse(newTaskId, apiKey);
    }
  } catch (err) {
    return {
      taskId: taskId ?? "",
      response: "",
      ok: false,
      error: err instanceof Error ? err.message : "Onbekende fout",
    };
  }
}

/**
 * Poll de Manus API totdat de agent klaar is met antwoorden.
 */
async function pollForResponse(
  taskId: string,
  apiKey: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<SendMessageResult> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(`${MANUS_API_BASE}/v2/task.listMessages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-manus-api-key": apiKey,
      },
      body: JSON.stringify({ task_id: taskId }),
    });

    const data = await res.json();
    if (!data.ok) continue;

    const messages: ManusMessage[] = data.data?.messages ?? [];
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");

    if (lastAssistant) {
      return { taskId, response: lastAssistant.content, ok: true };
    }
  }

  return {
    taskId,
    response: "Higgins reageert momenteel niet. Probeer het later opnieuw.",
    ok: false,
    error: "Timeout",
  };
}
