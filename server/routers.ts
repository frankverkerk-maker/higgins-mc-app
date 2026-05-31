import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { pushTokenStore, sendExpoPushNotifications } from "./push-service";

// ─── Higgins system prompt (meertalig) ────────────────────────────────────────────
const HIGGINS_LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  nl: "Je communiceert altijd in het Nederlands, tenzij de gebruiker expliciet een andere taal vraagt.",
  de: "Du kommunizierst immer auf Deutsch, es sei denn, der Nutzer bittet ausdrücklich um eine andere Sprache.",
  en: "You always communicate in English, unless the user explicitly requests another language.",
};

function buildSystemPrompt(lang?: string, userName?: string): string {
  const langKey = lang ?? "nl";
  const langInstruction = HIGGINS_LANGUAGE_INSTRUCTIONS[langKey] ?? HIGGINS_LANGUAGE_INSTRUCTIONS.nl;
  let prompt = `Je bent Higgins, de Chief of Staff en persoonlijke butler van ${userName ?? "Frank Verkerk"}, directeur van Carpe Diem GmbH en Swiss Vitality Clinics AG.

Jouw karakter:
- Je spreekt altijd beleefd, professioneel en direct — zoals een ervaren butler betaamt
- Je bent proactief: je denkt mee, anticipeert op behoeften en geeft concrete adviezen
- Je bent de enige schakel tussen ${userName ?? "Frank"} en zijn AI-team van 36 agents in 7 departementen
- ${langInstruction}
- Je bent beknopt maar volledig — geen onnodige uitweidingen
- Je spreekt de gebruiker aan bij naam of formeel afhankelijk van de context
- Je bent altijd op de hoogte van de status van het team en rapporteert proactief

Jouw team (je coördineert alle communicatie):
- Orchestrators: Elena (Office Manager)
- Marketing Command: Gary (CMO), Bard, Picasso, Echo, Anna, Larry, Flash
- Team Elon IT: Elon (CTO), Oracle, Nano, Pixel, Shield, Sentinel
- Revenue: Warren (CFO), Abacus, Closer, Carson, Strategos, Fortuna
- Specialists: Catharina, Victoria, Barbara, Vera, Rosi
- Justitia Legal Council (Add-On): Justitia (CLO), Adrian, Isabelle, Matteo, Elena V., Dr. Nadia
- Functional Medicine Center (Add-On): Nano Therapy, Peptide & IV, EpiGenalytics, TCM, B2B Advisory
- Enterprise: Hugo (HR), Atlas, Max, Oscar, Felix, Herald + 8 custom slots

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
    // ── Chat: stuur een bericht naar Higgins en ontvang een AI antwoord ──────
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
        })
      )
      .mutation(async ({ input }) => {
        const systemPrompt = buildSystemPrompt(input.language, input.userName);

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
          prompt: "Higgins, Mission Control, Carpe Diem, Frank, Elena, Warren, Gary, Elon, Justitia, Swiss Vitality, goedkeuren, afwijzen, briefing, vergadering",
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
          prompt: "Higgins, Mission Control, Carpe Diem, Frank Verkerk, Elena, Warren, Gary, Elon, Justitia, Swiss Vitality Clinics, zakelijke vergadering, besluiten, actiepunten, follow-up",
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
        // Sla token op in geheugen (in productie: database)
        pushTokenStore.set(input.token, {
          token: input.token,
          platform: input.platform,
          registeredAt: new Date().toISOString(),
          language: input.language ?? "nl",
        });
        console.log(`[push] Token geregistreerd voor ${input.platform} (${input.language ?? "nl"}): ${input.token.substring(0, 30)}...`);
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
  }),
});

export type AppRouter = typeof appRouter;
