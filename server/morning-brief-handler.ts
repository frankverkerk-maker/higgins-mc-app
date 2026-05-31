/**
 * Morning Brief — Scheduled Handler
 *
 * Endpoint: POST /api/scheduled/morning-brief
 * Trigger:  Heartbeat cron, dagelijks 07:00 CET (06:00 UTC) — "0 0 6 * * *"
 *
 * Genereert een uitgebreide ochtend briefing met:
 * - Datum & dag
 * - AI & Innovatie nieuws (1-2 items)
 * - Crypto & DeFi update
 * - Prioriteiten van de dag (uit agent context)
 * - Team status
 * - Motiverende afsluiting
 *
 * Slaat de briefing op in AsyncStorage-compatibele cache via een in-memory store
 * zodat de app hem kan ophalen via tRPC zonder opnieuw te genereren.
 */

import type { Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
import { sdk } from "./_core/sdk";

// In-memory cache voor de laatste briefing (overleeft herstart niet, maar dat is OK voor een dagelijkse cron)
let cachedBrief: {
  brief: string;
  date: string;
  generatedAt: string;
  topics: {
    ai: string;
    crypto: string;
    priorities: string[];
    teamStatus: string;
  };
} | null = null;

export function getLatestMorningBrief() {
  return cachedBrief;
}

const HIGGINS_SYSTEM_PROMPT = `Je bent Higgins, de persoonlijke AI-assistent van Frank van Carpe Diem GmbH. 
Je spreekt altijd in het Nederlands. Je toon is professioneel, direct en motiverend.
Je bent op de hoogte van de laatste ontwikkelingen in AI, crypto en business.
Houd antwoorden beknopt maar informatief. Geen onnodige opsmuk.`;

export async function morningBriefScheduledHandler(req: Request, res: Response) {
  try {
    // Authenticeer als cron job
    let isCron = false;
    try {
      const user = await sdk.authenticateRequest(req);
      isCron = user.isCron === true;
    } catch (_) {
      // In dev: ook toestaan zonder auth
      if (process.env.NODE_ENV !== "development") {
        return res.status(403).json({ error: "cron-only endpoint" });
      }
      isCron = true;
    }

    if (!isCron && process.env.NODE_ENV !== "development") {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const now = new Date();
    const date = now.toLocaleDateString("nl-NL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Genereer alle briefing secties parallel
    const [aiNewsRes, cryptoRes, prioritiesRes] = await Promise.allSettled([
      invokeLLM({
        messages: [
          { role: "system", content: HIGGINS_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Geef 1-2 zinnen over de meest relevante AI & innovatie ontwikkeling van de afgelopen 24 uur voor een ondernemer. Geen herhaling als er niets nieuws is. Datum: ${date}.`,
          },
        ],
      }),
      invokeLLM({
        messages: [
          { role: "system", content: HIGGINS_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Geef 1-2 zinnen over de actuele crypto & DeFi markt situatie (Bitcoin, Ethereum, algemene trend). Datum: ${date}. Geen herhaling als er niets nieuws is.`,
          },
        ],
      }),
      invokeLLM({
        messages: [
          { role: "system", content: HIGGINS_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Genereer 3 concrete zakelijke prioriteiten voor Frank van Carpe Diem GmbH voor ${date}. Elke prioriteit max 10 woorden. Formaat: JSON array van strings.`,
          },
        ],
      }),
    ]);

    const extractText = (result: PromiseSettledResult<any>): string => {
      if (result.status === "rejected") return "";
      const raw = result.value?.choices?.[0]?.message?.content;
      if (typeof raw === "string") return raw.trim();
      if (Array.isArray(raw)) return raw.map((c: any) => typeof c === "string" ? c : c?.text ?? "").join("").trim();
      return "";
    };

    const aiNews = extractText(aiNewsRes) || "Geen nieuwe AI-ontwikkelingen vandaag.";
    const cryptoUpdate = extractText(cryptoRes) || "Cryptomarkt stabiel.";

    // Parse prioriteiten (JSON of fallback)
    let priorities: string[] = ["Q2 rapport reviewen", "Team briefing voorbereiden", "Partnervoorstel beoordelen"];
    const prioritiesRaw = extractText(prioritiesRes);
    if (prioritiesRaw) {
      try {
        const jsonMatch = prioritiesRaw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            priorities = parsed.slice(0, 3).map(String);
          }
        }
      } catch (_) {}
    }

    // Genereer de volledige briefing tekst
    const briefRes = await invokeLLM({
      messages: [
        { role: "system", content: HIGGINS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Schrijf een beknopte ochtend briefing voor Frank voor ${date}.
          
Context:
- AI nieuws: ${aiNews}
- Crypto: ${cryptoUpdate}
- Prioriteiten: ${priorities.join(", ")}
- Team: Elena (e-mails), Warren (portfolio), Gary (campagnes), Justitia (juridisch) zijn beschikbaar.

Schrijf max 3 zinnen als persoonlijke briefing. Professioneel, direct, motiverend.`,
        },
      ],
    });

    const brief = extractText({ status: "fulfilled", value: briefRes }) ||
      `Goedemorgen Frank. Uw team staat klaar voor ${date}. Higgins heeft uw prioriteiten voorbereid.`;

    // Cache de briefing
    cachedBrief = {
      brief,
      date,
      generatedAt: now.toISOString(),
      topics: {
        ai: aiNews,
        crypto: cryptoUpdate,
        priorities,
        teamStatus: "Elena, Warren, Gary en Justitia zijn beschikbaar.",
      },
    };

    console.log(`[morning-brief] Briefing gegenereerd voor ${date}`);
    return res.json({ ok: true, generatedAt: now.toISOString(), brief });
  } catch (err: any) {
    console.error("[morning-brief] Fout:", err);
    return res.status(500).json({
      error: err?.message ?? "Onbekende fout",
      stack: err?.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
