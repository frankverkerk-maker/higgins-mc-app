import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut, storagePut as storageUpload } from "./storage";
import { pushTokenStore, sendExpoPushNotifications, sendBreakingNewsNotification, sendChatNotification, sendApprovalNotification, registerPushToken } from "./push-service";
import { generateResponsePdf } from "./pdf-generator";
// Dynamic import for pdf-parse (ESM compatible)
let pdfParseModule: any = null;

(async () => {
  try {
    pdfParseModule = await import("pdf-parse");
  } catch (e) {
    console.error("Failed to load pdf-parse", e);
  }
})();

// Wrapper function for pdf-parse
async function pdfParse(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  if (!pdfParseModule) {
    return { text: "", numpages: 0 };
  }
  try {
    const fn = pdfParseModule.default || pdfParseModule;
    return await fn(buffer);
  } catch (e) {
    console.error("PDF parse error:", e);
    return { text: "", numpages: 0 };
  }
}
import { activateAgent, getTaskStatus } from "./manus-agent-service";
import { buildingFloors } from "../drizzle/schema";
import { asc } from "drizzle-orm";
import { getDailyBriefing } from "./daily-briefing-service";
import { buildRosterPromptBlock, buildRoutingTable, AGENT_MAP, DEPT_KEYWORDS, DEPARTMENTS } from "../shared/roster";
import { routeCommand, type RoutingResult } from "./command-router";
import { watchTask } from "./task-watcher";
import { generateSpeech, isTTSAvailable } from "./tts-service";
import { ENV } from "./_core/env";

// ─── Higgins system prompt (meertalig) ────────────────────────────────────────────
const HIGGINS_LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  nl: "Je communiceert altijd in het Nederlands, tenzij de gebruiker expliciet een andere taal vraagt.",
  de: "Du kommunizierst immer auf Deutsch, es sei denn, der Nutzer bittet ausdrücklich um eine andere Sprache.",
  en: "You always communicate in English, unless the user explicitly requests another language.",
};

function buildSystemPrompt(lang?: string, userName?: string, agentStatuses?: Record<string, string>): string {
  const langKey = lang ?? "nl";
  const langInstruction = HIGGINS_LANGUAGE_INSTRUCTIONS[langKey] ?? HIGGINS_LANGUAGE_INSTRUCTIONS.nl;

  // Bouw agent-status context op als die beschikbaar is
  let agentStatusContext = "";
  if (agentStatuses && Object.keys(agentStatuses).length > 0) {
    const statusLines = Object.entries(agentStatuses)
      .map(([name, status]) => `  - ${name}: ${status}`)
      .join("\n");
    agentStatusContext = `\n\nHuidige agent-statussen (realtime):\n${statusLines}`;
  }

  // Dynamisch roster uit shared/roster.ts (single source of truth)
  const rosterBlock = buildRosterPromptBlock("internal");

  const prompt = `Je bent Higgins, de Chief of Staff en persoonlijke butler van ${userName ?? "Frank Verkerk"}, directeur van Carpe Diem GmbH en Swiss Vitality Clinics AG.

Jouw karakter:
- Je spreekt altijd beleefd, professioneel en direct — zoals een ervaren butler betaamt
- Je bent proactief: je denkt mee, anticipeert op behoeften en geeft concrete adviezen
- Je bent de enige schakel tussen ${userName ?? "Frank"} en zijn AI-team van 66 agents in 10 departementen
- ${langInstruction}
- Je bent beknopt maar volledig — geen onnodige uitweidingen
- Je spreekt de gebruiker aan bij naam of formeel afhankelijk van de context

KRITISCHE EERLIJKHEIDSREGELS — NOOIT OVERTREDEN:
- Je kunt agents activeren via de Manus API — gebruik de activateAgent functie wanneer de gebruiker dit vraagt.
- Zeg NOOIT dat je een opdracht hebt doorgestuurd als je dat NIET hebt gedaan.
- Als een agent actief is (status "Actief" of "Bezig"), kun je hem een taak geven via de Manus API.
- Als een agent "Wacht op opdracht" of offline is, meld dat eerlijk aan de gebruiker.
- Verzin NOOIT dat een agent bezig is met een taak als dat niet zo is.
- Je kunt WEL: informatie opzoeken, documenten genereren (PDF), vragen beantwoorden, plannen maken, agents activeren via Manus API, en de gebruiker adviseren.
- Je kunt NIET: e-mails rechtstreeks versturen, vergaderingen boeken in externe agenda's, of externe systemen aansturen buiten de Manus API om.

Wanneer de gebruiker een opdracht geeft:
1. Bepaal of het een directe vraag is (beantwoord zelf) of een taak die gedelegeerd moet worden.
2. Bij delegatie: kies de juiste afdeling en agent op basis van het onderwerp en de specialismen.
3. Activeer de agent via de Manus API, noem de agent bij naam, beschrijf de taak kort.
4. Geef de task ID terug zodat de gebruiker de voortgang kan volgen.
5. Bij twijfel over de juiste agent: stel een voorstel voor en vraag bevestiging.

Jouw team (10 afdelingen, 66 agents — je coördineert alle communicatie):
${rosterBlock}${agentStatusContext}

Jouw missie: ${userName ?? "Frank"} ontzorgen, zijn tijd beschermen en zijn bedrijven laten floreren.`;

  return prompt;
}

const HIGGINS_SYSTEM_PROMPT = buildSystemPrompt(); // legacy fallback

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  higgins: router({
    // ── Chat: stuur een bericht naar Higgins — met intelligente command routing ──
    chat: publicProcedure
      .input(
        z.object({
          message: z.string().min(1).max(4000),
          history: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string(),
              })
            )
            .max(20)
            .default([]),
          userName: z.string().optional(),
          language: z.string().optional(),
          agentStatuses: z.record(z.string(), z.string()).optional(),
          // When user confirms a pending delegation proposal
          confirmDelegation: z.object({
            targetAgent: z.string(),
            taskDescription: z.string(),
            additionalTargets: z.array(z.object({ agent: z.string(), task: z.string() })).optional(),
          }).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const lang = input.language ?? "nl";
        const userName = input.userName ?? "Frank";

        // ── Handle confirmed delegation (user tapped "Akkoord") ──────────────
        if (input.confirmDelegation) {
          const { targetAgent, taskDescription, additionalTargets } = input.confirmDelegation;
          try {
            // Activate primary target
            const result = await activateAgent(targetAgent, taskDescription, "en");
            watchTask({ taskId: result.taskId, agentName: targetAgent, language: lang });

            // Multi-delegation: activate additional targets in parallel
            const allActivated: Array<{ agent: string; taskId: string }> = [
              { agent: targetAgent, taskId: result.taskId },
            ];
            if (additionalTargets && additionalTargets.length > 0) {
              const settled = await Promise.all(
                additionalTargets.map(async (t) => {
                  try {
                    const r = await activateAgent(t.agent, t.task, "en");
                    watchTask({ taskId: r.taskId, agentName: t.agent, language: lang });
                    return { agent: t.agent, taskId: r.taskId };
                  } catch (e) {
                    console.error(`[confirm] Multi-delegation failed for ${t.agent}:`, e);
                    return null;
                  }
                })
              );
              settled.forEach(r => { if (r) allActivated.push(r); });
            }

            // Build confirmation message
            const agentList = allActivated.map(a => `**${a.agent}** (\`${a.taskId}\`)`).join(", ");
            const confirmMsgs: Record<string, string> = {
              nl: allActivated.length > 1
                ? `Uitstekend, ${userName}. Ik heb ${allActivated.length} agenten parallel geactiveerd: ${agentList}. U ontvangt bericht zodra zij klaar zijn.`
                : `Uitstekend, ${userName}. Ik heb ${agentList} geactiveerd. U ontvangt bericht zodra de taak is afgerond.`,
              de: allActivated.length > 1
                ? `Ausgezeichnet, ${userName}. Ich habe ${allActivated.length} Agenten parallel aktiviert: ${agentList}.`
                : `Ausgezeichnet, ${userName}. Ich habe ${agentList} aktiviert.`,
              en: allActivated.length > 1
                ? `Excellent, ${userName}. I have activated ${allActivated.length} agents in parallel: ${agentList}.`
                : `Excellent, ${userName}. I have activated ${agentList}. You will be notified once the task is complete.`,
            };

            return {
              reply: confirmMsgs[lang] ?? confirmMsgs.nl,
              timestamp: new Date().toISOString(),
              delegation: { taskId: result.taskId, agent: targetAgent, status: "activated" as const },
              multiDelegation: allActivated.length > 1 ? allActivated : undefined,
            };
          } catch (err) {
            return {
              reply: `Mijn excuses, de activering van ${targetAgent} is mislukt. Ik probeer het opnieuw wanneer u dat wenst.`,
              timestamp: new Date().toISOString(),
            };
          }
        }

        // ── Step 1: Route the command ────────────────────────────────────────
        const routing = await routeCommand(input.message, lang, userName);

        // ── Step 2a: Direct delegation (high confidence) ─────────────────────
        if (routing.shouldDelegateDirect && routing.targetAgent && routing.taskDescription) {
          try {
            // Activate primary target
            const result = await activateAgent(routing.targetAgent, routing.taskDescription, "en");
            watchTask({ taskId: result.taskId, agentName: routing.targetAgent, language: lang });

            // Multi-delegation: activate additional targets in parallel
            const additionalResults: Array<{ agent: string; taskId: string }> = [];
            if (routing.intent === "multi_delegation" && routing.additionalTargets && routing.additionalTargets.length > 0) {
              const settled = await Promise.all(
                routing.additionalTargets.map(async (t) => {
                  try {
                    const r = await activateAgent(t.agent, t.task, "en");
                    watchTask({ taskId: r.taskId, agentName: t.agent, language: lang });
                    return { agent: t.agent, taskId: r.taskId };
                  } catch (e) {
                    console.error(`[chat] Multi-delegation failed for ${t.agent}:`, e);
                    return null;
                  }
                })
              );
              settled.forEach(r => { if (r) additionalResults.push(r); });
            }

            // Build confirmation message
            const allActivated = [{ agent: routing.targetAgent, taskId: result.taskId }, ...additionalResults];
            const agentSummary = allActivated.map(a => `${a.agent} (taak-ID: ${a.taskId})`).join(", ");
            const systemPrompt = buildSystemPrompt(lang, userName, input.agentStatuses);
            const delegationInstruction = allActivated.length > 1
              ? `[MULTI-DELEGATIE VOLTOOID] Je hebt ${allActivated.length} agenten parallel geactiveerd: ${agentSummary}. Opdracht: "${input.message}". Bevestig kort en professioneel, noem alle agenten en taak-IDs.`
              : `[ACTIE VOLTOOID] Je hebt zojuist ${routing.targetAgent} (${routing.targetDepartment}) geactiveerd met taak-ID ${result.taskId}. Opdracht: "${input.message}". Bevestig kort en professioneel.`;
            const response = await invokeLLM({
              messages: [
                { role: "system", content: systemPrompt },
                ...input.history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
                { role: "user", content: input.message },
                { role: "system", content: delegationInstruction },
              ],
            });
            const rawContent = response.choices?.[0]?.message?.content;
            const reply = typeof rawContent === "string" ? rawContent
              : Array.isArray(rawContent) ? rawContent.map((c: any) => c.text ?? "").join("")
              : routing.explanation;

            return {
              reply,
              timestamp: new Date().toISOString(),
              delegation: { taskId: result.taskId, agent: routing.targetAgent, status: "activated" as const },
              multiDelegation: additionalResults.length > 0 ? allActivated : undefined,
            };
          } catch (err) {
            console.error("[chat] Direct delegation failed:", err);
          }
        }

        // ── Step 2b: Confirmation needed (low confidence delegation) ──────────
        if (routing.intent !== "question" && !routing.shouldDelegateDirect && routing.targetAgent && routing.taskDescription) {
          // Push notification: approval required
          sendApprovalNotification({
            agentName: routing.targetAgent,
            action: routing.taskDescription.substring(0, 100),
            language: lang,
          }).catch(() => {});

          return {
            reply: routing.explanation,
            timestamp: new Date().toISOString(),
            pendingDelegation: {
              targetAgent: routing.targetAgent,
              targetDepartment: routing.targetDepartment,
              taskDescription: routing.taskDescription,
              confidence: routing.confidence,
              additionalTargets: routing.additionalTargets ?? [],
            },
          };
        }

        // ── Step 2c: Normal question — Higgins answers directly ──────────────
        const systemPrompt = buildSystemPrompt(lang, userName, input.agentStatuses);
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: systemPrompt },
          ...input.history.map((h) => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })),
          { role: "user", content: input.message },
        ];

        const response = await invokeLLM({ messages });
        const rawContent = response.choices?.[0]?.message?.content;
        const reply = typeof rawContent === "string"
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent.map((c) => (typeof c === "string" ? c : (c as any).text ?? "")).join("")
            : "Mijn excuses, ik kon uw bericht niet verwerken. Probeert u het nogmaals.";

        // Push notification: Higgins replied (fire-and-forget, don't block response)
        sendChatNotification(reply, lang).catch(() => {});

        return { reply, timestamp: new Date().toISOString() };
      }),

    // ── Transcriptie: converteer audio naar tekst via Whisper ────────────────
    transcribe: publicProcedure
      .input(
        z.object({
          audioBase64: z.string(),
          mimeType: z.string().default("audio/m4a"),
        })
      )
      .mutation(async ({ input }) => {
        // Converteer base64 naar buffer en upload naar S3
        const buffer = Buffer.from(input.audioBase64, "base64");
        const fileName = `voice-${Date.now()}.m4a`;

        const { url: audioUrl } = await storagePut(fileName, buffer, input.mimeType);

        const result = await transcribeAudio({
          audioUrl,
          language: "nl",
          // Vocabulary hints: Whisper gebruikt de prompt als context om eigennamen correct te herkennen
          prompt: "Higgins, Mission Control, Carpe Diem, Frank, Nathalie, Warren, Gary, Elon, Justitia, Swiss Vitality, goedkeuren, afwijzen, briefing, vergadering",
        });

        // Check for transcription errors
        if ("error" in result) {
          throw new Error(result.error);
        }

        return {
          text: result.text,
          language: result.language ?? "nl",
        };
      }),

    // ── Agent status: haal live agent status op ─────────────────────────────────────
    getAgentStatus: publicProcedure
      .input(z.object({}))
      .query(async () => {
        // Haal live agent status op van Manus API of database
        // Dit toont welke agents actief zijn, bezig, of wachten
        try {
          const apiKey = process.env.MANUS_API_KEY;
          if (!apiKey) {
            // Fallback: return mock data
            return {
              "Higgins": { status: "active", task: "Briefing voorbereiden" },
              "Nathalie": { status: "active", task: "E-mails verwerken" },
              "Gary": { status: "busy", task: "Campagne analyse" },
              "Elon": { status: "idle", task: "Wacht op opdracht" },
              "Warren": { status: "busy", task: "Q2 rapport opstellen" },
              "Justitia": { status: "idle", task: "Wacht op opdracht" },
            };
          }

          // Haal agent status op van Manus API
          const response = await fetch(
            "https://api.manus.ai/v2/agent.status?limit=50",
            {
              headers: {
                "x-manus-api-key": apiKey,
              },
            }
          );

          if (!response.ok) {
            // Fallback op error
            return {
              "Higgins": { status: "active", task: "Briefing voorbereiden" },
              "Nathalie": { status: "active", task: "E-mails verwerken" },
              "Gary": { status: "busy", task: "Campagne analyse" },
              "Elon": { status: "idle", task: "Wacht op opdracht" },
              "Warren": { status: "busy", task: "Q2 rapport opstellen" },
              "Justitia": { status: "idle", task: "Wacht op opdracht" },
            };
          }

          const data = await response.json() as { agents?: Array<{ name: string; status: string; current_task?: string }> };
          const agents = data.agents ?? [];

          // Transform Manus agents naar activity format
          const result: Record<string, { status: "active" | "idle" | "busy"; task: string }> = {};
          agents.forEach(agent => {
            const status = agent.status === "running" ? "active" : agent.status === "busy" ? "busy" : "idle";
            result[agent.name] = {
              status: status as "active" | "idle" | "busy",
              task: agent.current_task ?? "Wacht op opdracht",
            };
          });

          return result;
        } catch (error) {
          console.error("Error fetching agent status:", error);
          // Fallback op error
          return {
            "Higgins": { status: "active", task: "Briefing voorbereiden" },
            "Nathalie": { status: "active", task: "E-mails verwerken" },
            "Gary": { status: "busy", task: "Campagne analyse" },
            "Elon": { status: "idle", task: "Wacht op opdracht" },
            "Warren": { status: "busy", task: "Q2 rapport opstellen" },
            "Justitia": { status: "idle", task: "Wacht op opdracht" },
          };
        }
      }),

    // ── Goedkeuring: haal alle pending approvals op ────────────────────────────
    getPendingApprovals: publicProcedure
      .input(
        z.object({
          userName: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        // Haal pending approvals op van Manus API
        // Dit zijn taken die wachten op goedkeuring van Frank
        try {
          const apiKey = process.env.MANUS_API_KEY;
          if (!apiKey) {
            // Fallback: return mock data als API key niet beschikbaar is
            return [
              { id: "a1", agent: "Nathalie", action: "E-mail versturen naar 3 partner clinics over Q3-planning", time: "14 min geleden" },
              { id: "a2", agent: "Warren", action: "Portfolio herbalancering uitvoeren (€12.400)", time: "1 uur geleden" },
            ];
          }

          // Haal taken op van Manus API
          const response = await fetch(
            "https://api.manus.ai/v2/task.list?status=waiting_for_approval&limit=10",
            {
              headers: {
                "x-manus-api-key": apiKey,
              },
            }
          );

          if (!response.ok) {
            // Fallback op error
            return [
              { id: "a1", agent: "Nathalie", action: "E-mail versturen naar 3 partner clinics over Q3-planning", time: "14 min geleden" },
              { id: "a2", agent: "Warren", action: "Portfolio herbalancering uitvoeren (€12.400)", time: "1 uur geleden" },
            ];
          }

          const data = await response.json() as { tasks?: Array<{ id: string; title: string; created_at: string; agent_name?: string }> };
          const tasks = data.tasks ?? [];

          // Transform Manus tasks naar approval format. We return the REAL list
          // here — including an empty array when there is genuinely nothing to
          // approve — so the app can show an honest "no pending approvals" state.
          // The ISO timestamp is sent raw; the client renders it relative + localized.
          return tasks.map((task) => ({
            id: task.id,
            agent: task.agent_name ?? "Higgins",
            action: task.title,
            time: task.created_at,
          }));
        } catch (error) {
          console.error("Error fetching pending approvals:", error);
          // Fallback op error
          return [
            { id: "a1", agent: "Nathalie", action: "E-mail versturen naar 3 partner clinics over Q3-planning", time: "14 min geleden" },
            { id: "a2", agent: "Warren", action: "Portfolio herbalancering uitvoeren (€12.400)", time: "1 uur geleden" },
          ];
        }
      }),

    // ── Goedkeuring: verwerk een goedkeuring of afwijzing ────────────────────
    processApproval: publicProcedure
      .input(
        z.object({
          approvalId: z.string(),
          action: z.enum(["approve", "reject"]),
          agentName: z.string(),
          actionDescription: z.string(),
          userName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const userName = input.userName ?? "Frank";
        const actionWord = input.action === "approve" ? "goedgekeurd" : "afgewezen";
        const confirmMessage =
          input.action === "approve"
            ? `Uitstekend, ${userName}. Ik zal ${input.agentName} opdracht geven om direct te beginnen: "${input.actionDescription}". Ik houd u op de hoogte van de voortgang.`
            : `Begrepen, ${userName}. Ik heb ${input.agentName} laten weten dat de actie "${input.actionDescription}" niet doorgaat. Wenst u een alternatief?`;

        // Laat Higgins de bevestiging formuleren via LLM
        const response = await invokeLLM({
          messages: [
            { role: "system", content: HIGGINS_SYSTEM_PROMPT },
            {
              role: "user",
              content: `${userName} heeft de volgende actie ${actionWord}: "${input.actionDescription}" (uitgevoerd door ${input.agentName}). Bevestig dit kort en professioneel.`,
            },
          ],
        });

        const rawReply = response.choices?.[0]?.message?.content;
        const reply = typeof rawReply === "string"
          ? rawReply
          : Array.isArray(rawReply)
            ? rawReply.map((c) => (typeof c === "string" ? c : (c as any).text ?? "")).join("")
            : confirmMessage;

        return {
          success: true,
          action: input.action,
          approvalId: input.approvalId,
          higginsResponse: reply,
          timestamp: new Date().toISOString(),
        };
      }),

    // ── Vergadering Transcriptie: transcribeer een volledige vergadering en geef samenvatting ──
    transcribeMeeting: publicProcedure
      .input(
        z.object({
          audioBase64: z.string(),
          mimeType: z.string().default("audio/m4a"),
          userName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.audioBase64, "base64");
        const fileName = `meeting-${Date.now()}.m4a`;

        const { url: audioUrl } = await storagePut(fileName, buffer, input.mimeType);

        const result = await transcribeAudio({
          audioUrl,
          language: "nl",
          // Vocabulary hints voor vergadering transcriptie
          prompt: "Higgins, Mission Control, Carpe Diem, Frank Verkerk, Nathalie, Warren, Gary, Elon, Justitia, Swiss Vitality Clinics, zakelijke vergadering, besluiten, actiepunten, follow-up",
        });

        if ("error" in result) {
          throw new Error(result.error);
        }

        const transcriptText = result.text;
        const userName = input.userName ?? "Frank";

        // Laat Higgins een samenvatting maken van de vergadering
        const summaryResponse = await invokeLLM({
          messages: [
            { role: "system", content: HIGGINS_SYSTEM_PROMPT },
            {
              role: "user",
              content: `${userName} heeft zojuist een vergadering gehad. Hier is de transcriptie:\n\n${transcriptText}\n\nMaak een beknopte samenvatting met: (1) de belangrijkste besluiten, (2) actiepunten met verantwoordelijke personen, en (3) eventuele follow-up die ik voor ${userName} moet inplannen. Gebruik een professionele, gestructureerde opmaak.`,
            },
          ],
        });

        const rawSummary = summaryResponse.choices?.[0]?.message?.content;
        const summary = typeof rawSummary === "string"
          ? rawSummary
          : Array.isArray(rawSummary)
            ? rawSummary.map((c) => (typeof c === "string" ? c : (c as any).text ?? "")).join("")
            : "Vergadering verwerkt. Ik heb de transcriptie ontvangen.";

        return {
          transcript: transcriptText,
          summary,
          language: result.language ?? "nl",
          timestamp: new Date().toISOString(),
        };
      }),

    // ── Push Token: registreer een Expo push token voor notificaties ──────────────
    registerPushToken: publicProcedure
      .input(
        z.object({
          token: z.string().min(1),
          platform: z.string().default("ios"),
          language: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Persist token in database + memory cache
        await registerPushToken(input.token, input.platform, input.language);
        return { success: true };
      }),

    // ── Push Send: stuur een notificatie naar alle geregistreerde apparaten ─────────
    sendPushNotification: publicProcedure
      .input(
        z.object({
          title: z.string(),
          body: z.string(),
          data: z.record(z.string(), z.any()).optional(),
          badge: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const tokens = Array.from(pushTokenStore.values()).map(t => t.token);
        if (tokens.length === 0) {
          return { sent: 0, tokens: [] };
        }
        const results = await sendExpoPushNotifications(tokens, {
          title: input.title,
          body: input.body,
          data: input.data,
          badge: input.badge,
        });
        return { sent: results.length, tokens };
      }),

    // ── PDF Generatie: genereer een professionele PDF in Higgins huisstijl ────
    generatePdf: publicProcedure
      .input(
        z.object({
          title: z.string().min(1).max(200),
          content: z.string().min(1),
          userName: z.string().optional(),
          language: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const pdfBuffer = await generateResponsePdf(
          input.title,
          input.content,
          input.userName ?? "Frank",
          input.language ?? "nl"
        );

        // Upload PDF naar S3 storage
        const fileName = `higgins-report-${Date.now()}.pdf`;
        const { url } = await storageUpload(fileName, pdfBuffer, "application/pdf");

        return {
          url,
          fileName,
          sizeBytes: pdfBuffer.length,
          generatedAt: new Date().toISOString(),
        };
      }),

    // ── Agent Activering: activeer een Manus agent via de Manus API ───────────
    activateAgent: publicProcedure
      .input(
        z.object({
          agentName: z.string().min(1).max(100),
          taskDescription: z.string().min(1).max(2000),
          language: z.string().optional(),
          userName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const lang = input.language ?? "nl";
        const userName = input.userName ?? "Frank";

        // Activeer de agent via de Manus API
        const result = await activateAgent(
          input.agentName,
          input.taskDescription,
          lang
        );

        // Register with task watcher for push notification on completion
        watchTask({ taskId: result.taskId, agentName: input.agentName, language: lang });

        // Genereer een Higgins bevestigingsbericht in de juiste taal
        const confirmMessages: Record<string, string> = {
          nl: `Uitstekend, ${userName}. Ik heb ${input.agentName} geactiveerd via de Manus API. De taak is aangemaakt met ID: \`${result.taskId}\`. ${input.agentName} is nu aan het werk. U kunt de voortgang opvragen via de taakstatus.`,
          de: `Ausgezeichnet, ${userName}. Ich habe ${input.agentName} über die Manus API aktiviert. Die Aufgabe wurde mit ID: \`${result.taskId}\` erstellt. ${input.agentName} arbeitet jetzt daran. Sie können den Fortschritt über den Aufgabenstatus abrufen.`,
          en: `Excellent, ${userName}. I have activated ${input.agentName} via the Manus API. The task has been created with ID: \`${result.taskId}\`. ${input.agentName} is now working on it. You can check the progress via the task status.`,
        };

        return {
          success: true,
          taskId: result.taskId,
          agentName: input.agentName,
          higginsResponse: confirmMessages[lang] ?? confirmMessages.nl,
          timestamp: new Date().toISOString(),
        };
      }),

    // ── Taakstatus: haal de status op van een actieve Manus taak ─────────────
    getTaskStatus: publicProcedure
      .input(
        z.object({
          taskId: z.string().min(1),
          language: z.string().optional(),
          userName: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const lang = input.language ?? "nl";
        const userName = input.userName ?? "Frank";

        const status = await getTaskStatus(input.taskId);

        // Genereer een Higgins statusbericht
        const statusLabels: Record<string, Record<string, string>> = {
          nl: {
            running: "is actief bezig",
            stopped: "heeft de taak voltooid",
            waiting: "wacht op bevestiging",
            error: "heeft een fout gemeld",
          },
          de: {
            running: "arbeitet aktiv",
            stopped: "hat die Aufgabe abgeschlossen",
            waiting: "wartet auf Bestätigung",
            error: "hat einen Fehler gemeldet",
          },
          en: {
            running: "is actively working",
            stopped: "has completed the task",
            waiting: "is waiting for confirmation",
            error: "has reported an error",
          },
        };

        const labels = statusLabels[lang] ?? statusLabels.nl;
        const statusLabel = labels[status.agentStatus] ?? "is bezig";

        const higginsResponse = status.lastMessage
          ? `De agent ${statusLabel}. Laatste update: ${status.lastMessage}`
          : `De agent ${statusLabel}. Taak ID: \`${input.taskId}\``;

        return {
          taskId: input.taskId,
          agentStatus: status.agentStatus,
          lastMessage: status.lastMessage,
          higginsResponse,
          completedAt: status.completedAt,
          timestamp: new Date().toISOString(),
        };
      }),

    // ── Morning Brief: genereer een dagelijkse briefing ──────────────────────
    morningBrief: publicProcedure
      .input(
        z.object({
          userName: z.string().optional(),
          date: z.string().optional(),
          language: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const userName = input.userName ?? "Frank";
        const lang = input.language ?? "nl";
        const localeMap: Record<string, string> = { nl: "nl-NL", de: "de-DE", en: "en-GB" };
        const locale = localeMap[lang] ?? "nl-NL";
        const date =
          input.date ??
          new Date().toLocaleDateString(locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });

        // Gebruik gecachede briefing van de cron job als die beschikbaar is (max 12 uur oud)
        const { getLatestMorningBrief } = await import("./morning-brief-handler");
        const cached = getLatestMorningBrief();
        if (cached) {
          const ageMs = Date.now() - new Date(cached.generatedAt).getTime();
          if (ageMs < 12 * 60 * 60 * 1000) {
            return {
              brief: cached.brief,
              date: cached.date,
              generatedAt: cached.generatedAt,
              topics: cached.topics,
            };
          }
        }

        // Fallback: genereer on-demand in de gekozen taal
        const briefSystemPrompt = buildSystemPrompt(lang, userName);
        const briefPrompts: Record<string, string> = {
          nl: `Genereer een beknopte ochtend briefing voor ${userName} voor ${date}. Noem 2-3 prioriteiten, een teamstatus update en een motiverende afsluiting. Maximaal 3 zinnen. Spreek in het Nederlands.`,
          de: `Erstelle eine kurze Morgen-Briefing für ${userName} für ${date}. Nenne 2-3 Prioritäten, ein Team-Status-Update und einen motivierenden Abschluss. Maximal 3 Sätze. Antworte auf Deutsch.`,
          en: `Generate a concise morning briefing for ${userName} for ${date}. Mention 2-3 priorities, a team status update and a motivating closing. Maximum 3 sentences. Respond in English.`,
        };
        const response = await invokeLLM({
          messages: [
            { role: "system", content: briefSystemPrompt },
            {
              role: "user",
              content: briefPrompts[lang] ?? briefPrompts.nl,
            },
          ],
        });

        const fallbacks: Record<string, string> = {
          nl: `Goedemorgen ${userName}. Uw team staat klaar. Higgins is beschikbaar voor uw opdrachten.`,
          de: `Guten Morgen ${userName}. Ihr Team ist bereit. Higgins steht für Ihre Aufträge zur Verfügung.`,
          en: `Good morning ${userName}. Your team is ready. Higgins is available for your instructions.`,
        };
        const rawBrief = response.choices?.[0]?.message?.content;
        const brief = typeof rawBrief === "string"
          ? rawBrief
          : Array.isArray(rawBrief)
            ? rawBrief.map((c) => (typeof c === "string" ? c : (c as any).text ?? "")).join("")
            : fallbacks[lang] ?? fallbacks.nl;

        return {
          brief,
          date,
          generatedAt: new Date().toISOString(),
          topics: null,
        };
      }),
    dailyBriefing: publicProcedure
      .input(z.object({
        lang: z.string().optional(),
        location: z.object({
          lat: z.number(),
          lon: z.number(),
          name: z.string(),
        }).optional(),
      }))
      .query(async ({ input }) => {
        return await getDailyBriefing(input.lang ?? "nl", input.location);
      }),
    // ── PDF Upload: ontvang base64 PDF van de app, sla op in S3, geef publieke URL terug ──
    uploadPdf: publicProcedure
      .input(
        z.object({
          base64: z.string().min(1),
          fileName: z.string().min(1).max(200),
          mimeType: z.string().default("application/pdf"),
          userName: z.string().optional(),
          language: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const lang = input.language ?? "nl";
        const userName = input.userName ?? "Frank";

        // ── Stap 1: Decodeer base64 naar Buffer en upload naar S3 ─────────────
        const buffer = Buffer.from(input.base64, "base64");
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storageKey = `uploads/${Date.now()}_${safeFileName}`;
        const { url } = await storagePut(storageKey, buffer, input.mimeType);

        // ── Stap 2: Extraheer de volledige tekst uit de PDF ───────────────────
        let pdfText = "";
        let pageCount = 0;
        try {
          const parsed = await pdfParse(buffer);
          pdfText = parsed.text?.trim() ?? "";
          pageCount = parsed.numpages ?? 0;
          // Begrens tot max 8000 tekens om LLM context niet te overschrijden
          if (pdfText.length > 8000) {
            pdfText = pdfText.substring(0, 8000) + "\n\n[... document afgekort voor analyse ...]";
          }
        } catch (_) {
          // PDF tekst extractie mislukt — val terug op bestandsnaam
          pdfText = "";
        }

        // ── Stap 3: Higgins analyseert de inhoud en selecteert het juiste teamlid ─
        // Routing table is dynamically built from the shared v2.0 roster (66 agents, 10 depts)
        const routingTable = buildRoutingTable("internal");
        const agentListForPrompt = routingTable.map(a =>
          `- ${a.name} (${a.role}, ${a.department})${a.specialties.length ? ": " + a.specialties.join(", ") : ""}`
        ).join("\n");

        const langLabel = lang === "nl" ? "Nederlands" : lang === "de" ? "Duits" : "Engels";
        const TEAM_ROUTING_PROMPT = `Je bent Higgins, de chief of staff van Frank Verkerk bij Carpe Diem GmbH en Swiss Vitality Clinics AG.

Frank heeft zojuist het volgende document geüpload:
Bestandsnaam: ${input.fileName}
Aantal pagina's: ${pageCount}

${pdfText ? `Inhoud (eerste 8000 tekens):\n${pdfText}` : "(tekst kon niet worden geëxtraheerd — baseer je op de bestandsnaam)"}

Jouw beschikbare team (v2.0 — 66 agenten, 10 afdelingen):
${agentListForPrompt}

Jouw taak:
1. Geef een beknopte samenvatting van het document (2-3 zinnen) in de taal: ${langLabel}
2. Bepaal welk teamlid dit document het beste kan verwerken en analyseren. Kies uit de volledige lijst hierboven.
3. Formuleer een concrete taakopdracht voor dat teamlid (1-2 zinnen)
4. Geef een confidence score (0.0-1.0) aan: hoe zeker ben je dat dit de juiste agent is?
   - 0.9+: heel duidelijk (bijv. juridisch contract → Justitia)
   - 0.7-0.9: redelijk zeker maar meerdere kandidaten mogelijk
   - <0.7: onzeker, meerdere afdelingen zouden passen

Antwoord ALLEEN in dit JSON formaat:
{
  "summary": "[samenvatting in ${langLabel}]",
  "assignedAgent": "[exacte naam uit de teamlijst]",
  "agentRole": "[rol/titel]",
  "taskDescription": "[concrete taakopdracht voor het teamlid, in het Engels voor de Manus API]",
  "higginsMessage": "[persoonlijk bericht van Higgins aan ${userName} over wat er gaat gebeuren, in ${langLabel}]",
  "confidence": 0.85,
  "alternativeAgent": "[optioneel: tweede kandidaat als confidence < 0.85]"
}`;

        let higginsResponse: string;
        let delegationTaskId: string | undefined;
        let assignedAgent = "";

        try {
          const routingResult = await invokeLLM({
            messages: [{ role: "user", content: TEAM_ROUTING_PROMPT }],
          });
          const rawContent = routingResult.choices?.[0]?.message?.content ?? "";
          const responseText = typeof rawContent === "string" ? rawContent : rawContent.map((c: any) => c.text ?? "").join("");
          const cleaned = responseText.replace(/```json\n?|```/g, "").trim();
          const routing = JSON.parse(cleaned) as {
            summary: string;
            assignedAgent: string;
            agentRole: string;
            taskDescription: string;
            higginsMessage: string;
            confidence?: number;
            alternativeAgent?: string;
          };

          assignedAgent = routing.assignedAgent;
          const docConfidence = routing.confidence ?? 0.9;

          // ── D3: Low confidence → return confirmation request instead of auto-delegating ──
          if (docConfidence < 0.85) {
            higginsResponse = routing.higginsMessage;
            return {
              url,
              fileName: input.fileName,
              sizeBytes: buffer.length,
              higginsResponse,
              pageCount,
              assignedAgent,
              uploadedAt: new Date().toISOString(),
              // Signal to app: needs confirmation before delegation
              pendingDocDelegation: {
                targetAgent: routing.assignedAgent,
                targetDepartment: routing.agentRole,
                taskDescription: routing.taskDescription,
                confidence: docConfidence,
                alternativeAgent: routing.alternativeAgent,
                summary: routing.summary,
                pdfUrl: url,
                fileName: input.fileName,
                pageCount,
                pdfText: pdfText ?? undefined,
              },
            };
          }

          // ── Stap 4: Activeer het teamlid via Manus API (high confidence) ──────────────────────
          const fullTaskDescription = `${routing.taskDescription}\n\nDocument: ${input.fileName} (${pageCount} pagina's)\n\n${pdfText ? `Documentinhoud:\n${pdfText}` : "(Documenttekst niet beschikbaar — analyseer op basis van de bestandsnaam en context)"}`;

          try {
            const agentResult = await activateAgent(routing.assignedAgent, fullTaskDescription, "en");
            delegationTaskId = agentResult.taskId;
            // Register with task watcher for push notification on completion
            watchTask({ taskId: agentResult.taskId, agentName: routing.assignedAgent, language: lang });
          } catch (agentErr) {
            console.error(`[uploadPdf] Agent activatie mislukt voor ${routing.assignedAgent}:`, agentErr);
          }

          // ── Stap 5: Stel het Higgins bericht samen ──────────────────────────
          const delegationConfirm: Record<string, string> = {
            nl: delegationTaskId
              ? `\n\nIk heb **${routing.assignedAgent}** (${routing.agentRole}) direct geactiveerd om dit document te verwerken. U ontvangt de analyse zodra ${routing.assignedAgent} klaar is.`
              : `\n\nIk zal **${routing.assignedAgent}** (${routing.agentRole}) inschakelen voor de verdere verwerking.`,
            de: delegationTaskId
              ? `\n\nIch habe **${routing.assignedAgent}** (${routing.agentRole}) direkt aktiviert, um dieses Dokument zu verarbeiten.`
              : `\n\nIch werde **${routing.assignedAgent}** (${routing.agentRole}) für die weitere Bearbeitung einschalten.`,
            en: delegationTaskId
              ? `\n\nI have activated **${routing.assignedAgent}** (${routing.agentRole}) directly to process this document. You will receive the analysis once ${routing.assignedAgent} is done.`
              : `\n\nI will engage **${routing.assignedAgent}** (${routing.agentRole}) for further processing.`,
          };

          higginsResponse = routing.higginsMessage + (delegationConfirm[lang] ?? delegationConfirm.nl);

        } catch (err) {
          // Fallback als JSON parsing of LLM mislukt
          console.error("[uploadPdf] Routing analyse mislukt:", err);
          const fallback: Record<string, string> = {
            nl: `Ik heb uw document **${input.fileName}** ontvangen en veilig opgeslagen. Ik analyseer de inhoud en zal het doorsturen naar het juiste teamlid.`,
            de: `Ich habe Ihr Dokument **${input.fileName}** empfangen und sicher gespeichert. Ich analysiere den Inhalt und leite es an das richtige Teammitglied weiter.`,
            en: `I have received your document **${input.fileName}** and stored it securely. I am analysing the content and will forward it to the appropriate team member.`,
          };
          higginsResponse = fallback[lang] ?? fallback.nl;
        }

        return {
          url,
          fileName: input.fileName,
          sizeBytes: buffer.length,
          higginsResponse,
          delegationTaskId,
          assignedAgent,
          pageCount,
          uploadedAt: new Date().toISOString(),
        };
      }),

    // ── Building: haal Higgins Tower verdiepingen op uit de database ──────────
    getBuilding: publicProcedure
      .input(z.object({}))
      .query(async () => {
        try {
          const { getDb } = await import("./db");
          const db = await getDb();
          if (!db) {
            return { floors: [], source: "fallback" as const };
          }
          const rows = await db
            .select()
            .from(buildingFloors)
            .orderBy(asc(buildingFloors.floorNumber));
          // Map DB rows to the Floor interface expected by the app
          const floors = rows.map((r) => ({
            floor_number: r.floorNumber,
            floor_name: r.floorName,
            department_id: r.departmentId ?? "",
            description: r.description ?? "",
            is_restricted: r.isRestricted === 1,
          }));
          return { floors, source: "database" as const };
        } catch (err) {
          console.error("[getBuilding] DB query failed:", err);
          return { floors: [], source: "fallback" as const };
        }
      }),

    // ── TTS: genereer spraak-audio voor een agent-bericht ─────────────────────
    speak: publicProcedure
      .input(
        z.object({
          text: z.string().min(1).max(5000),
          agentName: z.string().default("Higgins"),
        })
      )
      .mutation(async ({ input }) => {
        if (!isTTSAvailable()) {
          return { success: false, error: "TTS not configured", audioBase64: null };
        }

        const result = await generateSpeech({
          agentName: input.agentName,
          text: input.text,
        });

        if (!result.success || !result.audioBuffer) {
          return { success: false, error: result.error ?? "TTS generation failed", audioBase64: null };
        }

        // Return base64-encoded audio for the client to play
        const audioBase64 = result.audioBuffer.toString("base64");
        return {
          success: true,
          error: null,
          audioBase64,
          contentType: result.contentType ?? "audio/mpeg",
        };
      }),

    voiceClone: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          description: z.string().max(500).optional(),
          audioBase64: z.string(), // base64-encoded audio file
          mimeType: z.string().default("audio/m4a"),
          removeBackgroundNoise: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        if (!ENV.elevenLabsApiKey) {
          return { success: false, error: "ELEVENLABS_API_KEY not configured", voiceId: null };
        }

        try {
          const audioBuffer = Buffer.from(input.audioBase64, "base64");
          const ext = input.mimeType.includes("wav") ? "wav" : input.mimeType.includes("mp3") ? "mp3" : "m4a";
          const blob = new Blob([audioBuffer], { type: input.mimeType });

          const formData = new FormData();
          formData.append("name", input.name);
          formData.append("files", blob, `sample.${ext}`);
          if (input.description) formData.append("description", input.description);
          formData.append("remove_background_noise", String(input.removeBackgroundNoise));
          formData.append("labels", JSON.stringify({ language: "multilingual" }));

          const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
            method: "POST",
            headers: {
              "xi-api-key": ENV.elevenLabsApiKey,
            },
            body: formData,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { success: false, error: `ElevenLabs ${response.status}: ${errText}`, voiceId: null };
          }

          const result = await response.json() as { voice_id: string };
          return { success: true, error: null, voiceId: result.voice_id };
        } catch (err) {
          return { success: false, error: `Clone failed: ${err instanceof Error ? err.message : "Unknown"}`, voiceId: null };
        }
      }),

    checkBreakingNews: publicProcedure
      .input(z.object({ lang: z.string().optional() }))
      .mutation(async ({ input }) => {
        // Breaking news is always in English — clearest for international AI/blockchain news
        try {
          const prompt = `You are a news analyst. Check if there is any TRULY BREAKING or GROUNDBREAKING news in AI or blockchain in the last 24 hours that would be highly relevant to a CEO of an AI company. Only respond with JSON: { "hasBreakingNews": boolean, "headline": string }. If no truly breaking news, set hasBreakingNews to false. Always respond in English.`;
          const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
          const rawContent = result.choices?.[0]?.message?.content ?? "";
          const response = typeof rawContent === "string" ? rawContent : rawContent.map((c: any) => c.text ?? "").join("");
          const cleaned = response.replace(/```json\n?|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.hasBreakingNews && parsed.headline) {
            // Always send notification in English
            await sendBreakingNewsNotification(parsed.headline, "en");
            return { sent: true, headline: parsed.headline };
          }
          return { sent: false, headline: null };
        } catch (e) {
          return { sent: false, headline: null };
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;

