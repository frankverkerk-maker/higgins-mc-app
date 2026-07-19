/**
 * Higgins MC — Command Router
 *
 * Intelligent server-side routing of user commands to the correct agent/department.
 * Uses the LLM to classify intent and assign confidence.
 *
 * Flow:
 *  1. User sends a message via Chat.
 *  2. Server calls `routeCommand(message, lang)`.
 *  3. LLM returns: intent (question | delegation), confidence, target agent, task description.
 *  4. If confidence ≥ 0.85 → direct delegation (activateAgent).
 *     If confidence < 0.85 → return proposal to app for user confirmation.
 *     If intent = question → return to normal chat flow (no delegation).
 */

import { invokeLLM } from "./_core/llm";
import { buildRoutingTable, AGENT_MAP, DEPARTMENTS } from "../shared/roster";
import type { Agent } from "../shared/roster";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommandIntent = "question" | "delegation" | "multi_delegation";

export interface RoutingResult {
  /** What kind of message this is */
  intent: CommandIntent;
  /** Confidence in the routing decision (0.0 – 1.0) */
  confidence: number;
  /** Whether to delegate directly (confidence ≥ threshold) */
  shouldDelegateDirect: boolean;
  /** Primary target agent name */
  targetAgent: string | null;
  /** Target department name */
  targetDepartment: string | null;
  /** Reformulated task description for the agent (in English for Manus API) */
  taskDescription: string | null;
  /** Short explanation for the user (in their language) */
  explanation: string;
  /** For multi-delegation: additional targets */
  additionalTargets?: Array<{ agent: string; department: string; task: string }>;
}

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.85;

// ─── Router ───────────────────────────────────────────────────────────────────

/**
 * Route a user command to the correct agent/department using LLM classification.
 */
export async function routeCommand(
  message: string,
  language: string = "nl",
  userName: string = "Frank",
): Promise<RoutingResult> {
  const routingTable = buildRoutingTable("internal");

  // Compact routing table for the prompt (name + role + dept + specialties)
  const tableStr = routingTable
    .map(a => `${a.name} | ${a.role} | ${a.department} | ${a.specialties.join(", ")}`)
    .join("\n");

  const langLabels: Record<string, string> = {
    nl: "Nederlands",
    de: "Deutsch",
    en: "English",
  };
  const targetLang = langLabels[language] ?? "Nederlands";

  const routerPrompt = `You are the command router for Higgins Mission Control. Your job is to analyze a user command and determine:
1. Is this a QUESTION (user wants information/advice from Higgins) or a DELEGATION (user wants a task executed by a specific agent)?
2. If delegation: which agent is best suited, and what is the task?

USER COMMAND (from ${userName}, language: ${targetLang}):
"${message}"

AVAILABLE AGENTS (Name | Role | Department | Specialties):
${tableStr}

ROUTING RULES:
- If the user explicitly names an agent → use that agent (high confidence).
- If the user describes a task without naming an agent → match by department keywords and specialties.
- If the task spans multiple departments → set intent to "multi_delegation" and list all targets.
- If the user is asking a question, requesting information, or chatting → intent = "question".
- Confidence scale: 1.0 = perfect match (explicit agent name + clear task), 0.5 = reasonable guess, 0.3 = very uncertain.

Respond ONLY in this exact JSON format (no markdown, no explanation):
{
  "intent": "question" | "delegation" | "multi_delegation",
  "confidence": <number 0.0-1.0>,
  "targetAgent": "<agent name or null>",
  "targetDepartment": "<department name or null>",
  "taskDescription": "<task in English for the Manus API, or null if question>",
  "explanation": "<1-2 sentence explanation for the user in ${targetLang}>",
  "additionalTargets": [{"agent": "<name>", "department": "<dept>", "task": "<task in English>"}] or []
}`;

  // ── Retry logic: up to 3 attempts with exponential backoff ──────────────────
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await invokeLLM({
        messages: [{ role: "user", content: routerPrompt }],
      });

      const rawContent = result.choices?.[0]?.message?.content ?? "";
      const responseText = typeof rawContent === "string"
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent.map((c: any) => c.text ?? "").join("")
          : "";

      // Clean markdown fences if present
      const cleaned = responseText.replace(/```json\n?|```/g, "").trim();

      if (!cleaned) {
        throw new Error("LLM returned empty response");
      }

      const parsed = JSON.parse(cleaned) as {
        intent: string;
        confidence: number;
        targetAgent: string | null;
        targetDepartment: string | null;
        taskDescription: string | null;
        explanation: string;
        additionalTargets?: Array<{ agent: string; department: string; task: string }>;
      };

    // Validate the target agent exists in our roster
    let validatedAgent = parsed.targetAgent;
    if (validatedAgent && !AGENT_MAP[validatedAgent]) {
      // Try case-insensitive match
      const found = Object.keys(AGENT_MAP).find(
        n => n.toLowerCase() === validatedAgent!.toLowerCase()
      );
      validatedAgent = found ?? null;
    }

    // Validate department
    let validatedDept = parsed.targetDepartment;
    if (validatedDept) {
      const deptExists = DEPARTMENTS.some(d => d.name === validatedDept);
      if (!deptExists) {
        // Try to find by agent's department
        if (validatedAgent && AGENT_MAP[validatedAgent]) {
          validatedDept = AGENT_MAP[validatedAgent].department;
        }
      }
    } else if (validatedAgent && AGENT_MAP[validatedAgent]) {
      validatedDept = AGENT_MAP[validatedAgent].department;
    }

    const intent = (["question", "delegation", "multi_delegation"].includes(parsed.intent)
      ? parsed.intent
      : "question") as CommandIntent;

    const confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0));

      return {
        intent,
        confidence,
        shouldDelegateDirect: intent !== "question" && confidence >= CONFIDENCE_THRESHOLD,
        targetAgent: validatedAgent,
        targetDepartment: validatedDept,
        taskDescription: parsed.taskDescription ?? null,
        explanation: parsed.explanation ?? "",
        additionalTargets: parsed.additionalTargets ?? [],
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[command-router] Poging ${attempt}/${MAX_RETRIES} mislukt: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 500ms, 1500ms
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
      }
    }
  }

  // All retries exhausted — return a clear error message to the user
  console.error("[command-router] Alle pogingen mislukt:", lastError);
  const errorMessages: Record<string, string> = {
    nl: "Mijn excuses, ik kon uw opdracht niet verwerken door een tijdelijk technisch probleem. Probeert u het nogmaals.",
    de: "Entschuldigung, ich konnte Ihren Befehl aufgrund eines vorübergehenden technischen Problems nicht verarbeiten. Bitte versuchen Sie es erneut.",
    en: "My apologies, I could not process your command due to a temporary technical issue. Please try again.",
  };
  return {
    intent: "question" as CommandIntent,
    confidence: 0,
    shouldDelegateDirect: false,
    targetAgent: null,
    targetDepartment: null,
    taskDescription: null,
    explanation: errorMessages[language] ?? errorMessages.nl,
    additionalTargets: [],
  };
}
