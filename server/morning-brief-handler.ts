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

function getSystemPrompt(lang: string): string {
  const prompts: Record<string, string> = {
    nl: `Je bent Higgins, de persoonlijke AI-assistent van Frank van Carpe Diem GmbH. 
Je spreekt altijd in het Nederlands. Je toon is professioneel, direct en motiverend.
Je bent op de hoogte van de laatste ontwikkelingen in AI, crypto en business.
Houd antwoorden beknopt maar informatief. Geen onnodige opsmuk.`,
    de: `Du bist Higgins, der persönliche KI-Assistent von Frank von Carpe Diem GmbH.
Du sprichst immer auf Deutsch. Dein Ton ist professionell, direkt und motivierend.
Du bist über die neuesten Entwicklungen in KI, Krypto und Geschäft informiert.
Halte Antworten prägnant, aber informativ. Keine unnötige Verzierung.`,
    en: `You are Higgins, the personal AI assistant of Frank of Carpe Diem GmbH.
You always speak in English. Your tone is professional, direct and motivating.
You are aware of the latest developments in AI, crypto and business.
Keep answers concise but informative. No unnecessary embellishment.`,
  };
  return prompts[lang] ?? prompts.nl;
}

export async function morningBriefScheduledHandler(req: Request, res: Response, lang?: string) {
  const finalLang: string = lang ?? ((req.body?.lang || req.query?.lang || "nl") as string);
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
    const localeMap: Record<string, string> = { nl: "nl-NL", de: "de-DE", en: "en-GB" };
    const locale = localeMap[finalLang] ?? "nl-NL";
    const date = now.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Genereer alle briefing secties parallel
    const systemPrompt = getSystemPrompt(finalLang);
    const [aiNewsRes, cryptoRes, prioritiesRes] = await Promise.allSettled([
      invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: finalLang === "de"
              ? `Geben Sie 1-2 Sätze über die relevanteste KI- und Innovationsentwicklung der letzten 24 Stunden für einen Unternehmer. Keine Wiederholung, wenn es keine Neuigkeiten gibt. Datum: ${date}.`
              : finalLang === "en"
              ? `Give 1-2 sentences about the most relevant AI & innovation development of the last 24 hours for an entrepreneur. No repetition if there's no news. Date: ${date}.`
              : `Geef 1-2 zinnen over de meest relevante AI & innovatie ontwikkeling van de afgelopen 24 uur voor een ondernemer. Geen herhaling als er niets nieuws is. Datum: ${date}.`,
          },
        ],
      }),
      invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: finalLang === "de" 
              ? `Geben Sie 1-2 Sätze zur aktuellen Krypto- und DeFi-Marktsituation (Bitcoin, Ethereum, allgemeiner Trend). Datum: ${date}. Keine Wiederholung, wenn es keine Neuigkeiten gibt.`
              : finalLang === "en"
              ? `Give 1-2 sentences about the current crypto & DeFi market situation (Bitcoin, Ethereum, general trend). Date: ${date}. No repetition if there's no news.`
              : `Geef 1-2 zinnen over de actuele crypto & DeFi markt situatie (Bitcoin, Ethereum, algemene trend). Datum: ${date}. Geen herhaling als er niets nieuws is.`,
          },
        ],
      }),
      invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: finalLang === "de"
              ? `Generieren Sie 3 konkrete geschäftliche Prioritäten für Frank von Carpe Diem GmbH für ${date}. Jede Priorität max 10 Wörter. Format: JSON-Array von Strings.`
              : finalLang === "en"
              ? `Generate 3 concrete business priorities for Frank of Carpe Diem GmbH for ${date}. Each priority max 10 words. Format: JSON array of strings.`
              : `Genereer 3 concrete zakelijke prioriteiten voor Frank van Carpe Diem GmbH voor ${date}. Elke prioriteit max 10 woorden. Formaat: JSON array van strings.`,
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

    const fallbacks: Record<string, { aiNews: string; crypto: string }> = {
      nl: { aiNews: "Geen nieuwe AI-ontwikkelingen vandaag.", crypto: "Cryptomarkt stabiel." },
      de: { aiNews: "Keine neuen KI-Entwicklungen heute.", crypto: "Kryptomarkt stabil." },
      en: { aiNews: "No new AI developments today.", crypto: "Crypto market stable." },
    };
    const langFallbacks = fallbacks[finalLang] ?? fallbacks.nl;
    const aiNews = extractText(aiNewsRes) || langFallbacks.aiNews;
    const cryptoUpdate = extractText(cryptoRes) || langFallbacks.crypto;

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
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: finalLang === "de"
            ? `Schreiben Sie eine kurze Morgen-Briefing für Frank für ${date}.
          
Kontext:
- KI-Nachrichten: ${aiNews}
- Krypto: ${cryptoUpdate}
- Prioritäten: ${priorities.join(", ")}
- Team: Nathalie (E-Mails), Warren (Portfolio), Gary (Kampagnen), Justitia (Recht) sind verfügbar.

Schreiben Sie max 3 Sätze als persönliche Briefing. Professionell, direkt, motivierend.`
            : finalLang === "en"
            ? `Write a concise morning briefing for Frank for ${date}.
          
Context:
- AI news: ${aiNews}
- Crypto: ${cryptoUpdate}
- Priorities: ${priorities.join(", ")}
- Team: Nathalie (emails), Warren (portfolio), Gary (campaigns), Justitia (legal) are available.

Write max 3 sentences as a personal briefing. Professional, direct, motivating.`
            : `Schrijf een beknopte ochtend briefing voor Frank voor ${date}.
          
Context:
- AI nieuws: ${aiNews}
- Crypto: ${cryptoUpdate}
- Prioriteiten: ${priorities.join(", ")}
- Team: Nathalie (e-mails), Warren (portfolio), Gary (campagnes), Justitia (juridisch) zijn beschikbaar.

Schrijf max 3 zinnen als persoonlijke briefing. Professioneel, direct, motiverend.`,
        },
      ],
    });

    const briefFallbacks: Record<string, string> = {
      nl: `Goedemorgen Frank. Uw team staat klaar voor ${date}. Higgins heeft uw prioriteiten voorbereid.`,
      de: `Guten Morgen Frank. Ihr Team ist bereit für ${date}. Higgins hat Ihre Prioritäten vorbereitet.`,
      en: `Good morning Frank. Your team is ready for ${date}. Higgins has prepared your priorities.`,
    };
    const brief = extractText({ status: "fulfilled", value: briefRes }) ||
      (briefFallbacks[finalLang] ?? briefFallbacks.nl);

    // Cache de briefing
    cachedBrief = {
      brief,
      date,
      generatedAt: now.toISOString(),
      topics: {
        ai: aiNews,
        crypto: cryptoUpdate,
        priorities,
        teamStatus: finalLang === "de" 
          ? "Nathalie, Warren, Gary und Justitia sind verfügbar."
          : finalLang === "en"
          ? "Nathalie, Warren, Gary and Justitia are available."
          : "Nathalie, Warren, Gary en Justitia zijn beschikbaar.",
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
