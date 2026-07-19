/**
 * Higgins MC — Manus Agent Service
 * Activeer echte Manus AI-agents via de Manus API (task.create)
 * Elke agent in het Carpe Diem team kan een echte Manus taak krijgen
 */

const MANUS_API_BASE = "https://api.manus.ai/v2";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ManusTaskResult {
  taskId: string;
  status: "created" | "running" | "stopped" | "error";
  message: string;
}

export interface ManusTaskStatus {
  taskId: string;
  agentStatus: "running" | "stopped" | "waiting" | "error";
  lastMessage?: string;
  completedAt?: string;
}

// ─── Haal de API key op ───────────────────────────────────────────────────────
function getApiKey(): string {
  const key = process.env.MANUS_API_KEY;
  if (!key) {
    throw new Error("MANUS_API_KEY is niet geconfigureerd. Stel de omgevingsvariabele in.");
  }
  return key;
}

/**
 * Activeer een Manus agent door een nieuwe taak aan te maken
 * @param agentName - Naam van de agent (bijv. "Justitia", "Elena", "Warren")
 * @param taskDescription - Beschrijving van de taak die de agent moet uitvoeren
 * @param language - Taal voor de taakbeschrijving (nl/de/en)
 * @returns ManusTaskResult met taskId en status
 */
export async function activateAgent(
  agentName: string,
  taskDescription: string,
  language: string = "nl"
): Promise<ManusTaskResult> {
  const apiKey = getApiKey();

  // Bouw de taakinstructie op in de juiste taal
  const taskPrompts: Record<string, string> = {
    nl: `Je bent ${agentName}, een gespecialiseerde AI-agent in het team van Higgins Mission Control voor Carpe Diem GmbH en Swiss Vitality Clinics AG. Frank Verkerk, de directeur, heeft de volgende opdracht voor jou:\n\n${taskDescription}\n\nVoer deze taak professioneel en grondig uit. Rapporteer je bevindingen en resultaten duidelijk.`,
    de: `Du bist ${agentName}, ein spezialisierter KI-Agent im Team von Higgins Mission Control für Carpe Diem GmbH und Swiss Vitality Clinics AG. Frank Verkerk, der Direktor, hat folgende Aufgabe für dich:\n\n${taskDescription}\n\nFühre diese Aufgabe professionell und gründlich aus. Berichte deine Ergebnisse klar.`,
    en: `You are ${agentName}, a specialized AI agent in the Higgins Mission Control team for Carpe Diem GmbH and Swiss Vitality Clinics AG. Frank Verkerk, the director, has the following task for you:\n\n${taskDescription}\n\nExecute this task professionally and thoroughly. Report your findings and results clearly.`,
  };

  const prompt = taskPrompts[language] ?? taskPrompts.nl;

  const response = await fetch(`${MANUS_API_BASE}/task.create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-manus-api-key": apiKey,
    },
    body: JSON.stringify({
      message: {
        content: prompt,
      },
      // Gebruik een beknopte titel voor de taak
      title: `[${agentName}] ${taskDescription.substring(0, 80)}${taskDescription.length > 80 ? "..." : ""}`,
      // Verberg in de takenlijst zodat het niet rommelt
      hide_in_task_list: false,
      // Gebruik lite profiel voor snelle agent-taken
      agent_profile: "manus-1.6-lite",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Manus API fout (${response.status}): ${errorText}`);
  }

  const data = await response.json() as { task_id?: string; id?: string; error?: string };

  if (data.error) {
    throw new Error(`Manus API fout: ${data.error}`);
  }

  const taskId = data.task_id ?? data.id ?? "";
  if (!taskId) {
    throw new Error("Manus API gaf geen task_id terug");
  }

  return {
    taskId,
    status: "created",
    message: taskId,
  };
}

/**
 * Haal de status op van een actieve Manus taak
 * @param taskId - De task ID teruggegeven door activateAgent
 * @returns ManusTaskStatus met huidige status en laatste bericht
 */
export async function getTaskStatus(taskId: string): Promise<ManusTaskStatus> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${MANUS_API_BASE}/task.listMessages?task_id=${encodeURIComponent(taskId)}&order=desc&limit=5`,
    {
      headers: {
        "x-manus-api-key": apiKey,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Manus API fout (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    messages?: Array<{
      type: string;
      status_update?: { agent_status: string };
      content?: string;
      text?: string;
    }>;
  };

  // Zoek de laatste status_update
  const messages = data.messages ?? [];
  const statusUpdate = messages.find(m => m.type === "status_update");
  const agentStatus = (statusUpdate?.status_update?.agent_status ?? "running") as ManusTaskStatus["agentStatus"];

  // Zoek het laatste assistant bericht
  const assistantMsg = messages.find(m => m.type === "assistant_message");
  const lastMessage = assistantMsg?.content ?? assistantMsg?.text;

  return {
    taskId,
    agentStatus,
    lastMessage,
    completedAt: agentStatus === "stopped" ? new Date().toISOString() : undefined,
  };
}
