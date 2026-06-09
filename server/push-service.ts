/**
 * Push Notification Service — Higgins MC
 *
 * Beheert Expo push tokens en verstuurt notificaties via de Expo Push Service.
 * Tokens worden in-memory opgeslagen (overleeft herstart niet, maar dat is OK
 * voor een single-user app — token wordt bij elke app-start opnieuw geregistreerd).
 *
 * In productie: vervang door database opslag (drizzle/schema.ts uitbreiden).
 */

// ─── Token store (in-memory) ──────────────────────────────────────────────────
interface PushTokenRecord {
  token: string;
  platform: string;
  registeredAt: string;
  language?: string;
}

// ─── Push teksten per taal ────────────────────────────────────────────────────
const PUSH_STRINGS: Record<string, {
  approvalTitle: (agent: string) => string;
  morningBriefTitle: string;
  chatTitle: string;
  breakingNewsTitle: string;
}> = {
  nl: {
    approvalTitle: (agent) => `✅ Goedkeuring vereist — ${agent}`,
    morningBriefTitle: "🌅 Goedemorgen — Higgins Briefing",
    chatTitle: "💬 Higgins heeft gereageerd",
    breakingNewsTitle: "⚡ Baanbrekend nieuws — AI & Blockchain",
  },
  de: {
    approvalTitle: (agent) => `✅ Genehmigung erforderlich — ${agent}`,
    morningBriefTitle: "🌅 Guten Morgen — Higgins Briefing",
    chatTitle: "💬 Higgins hat geantwortet",
    breakingNewsTitle: "⚡ Bahnbrechende Neuigkeiten — KI & Blockchain",
  },
  en: {
    approvalTitle: (agent) => `✅ Approval required — ${agent}`,
    morningBriefTitle: "🌅 Good morning — Higgins Briefing",
    chatTitle: "💬 Higgins has responded",
    breakingNewsTitle: "⚡ Breaking news — AI & Blockchain",
  },
};

function getStrings(lang?: string) {
  return PUSH_STRINGS[lang ?? "nl"] ?? PUSH_STRINGS.nl;
}

export const pushTokenStore = new Map<string, PushTokenRecord>();

// ─── Expo Push Message type ───────────────────────────────────────────────────
interface ExpoPushMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: "default" | null;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: Record<string, any>;
}

// ─── Expo Push Service API ────────────────────────────────────────────────────
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPushNotifications(
  tokens: string[],
  payload: Omit<ExpoPushMessage, "to">
): Promise<ExpoPushTicket[]> {
  if (tokens.length === 0) return [];

  // Batch in groepen van 100 (Expo limiet)
  const batches: string[][] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    batches.push(tokens.slice(i, i + 100));
  }

  const allTickets: ExpoPushTicket[] = [];

  for (const batch of batches) {
    const messages: ExpoPushMessage[] = batch.map((token) => ({
      to: token,
      sound: "default",
      priority: "high",
      channelId: "higgins-default",
      ...payload,
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.error(`[push] Expo API fout: ${response.status} ${response.statusText}`);
        continue;
      }

      const result = await response.json() as { data: ExpoPushTicket[] };
      allTickets.push(...(result.data ?? []));

      // Log resultaten
      const ok = result.data?.filter(t => t.status === "ok").length ?? 0;
      const err = result.data?.filter(t => t.status === "error").length ?? 0;
      console.log(`[push] Batch verstuurd: ${ok} OK, ${err} fouten`);
    } catch (err) {
      console.error("[push] Netwerk fout bij Expo Push:", err);
    }
  }

  return allTickets;
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/** Stuur een approval notificatie naar alle geregistreerde apparaten */
export async function sendApprovalNotification(opts: {
  agentName: string;
  action: string;
  count?: number;
  language?: string;
}) {
  const records = Array.from(pushTokenStore.values());
  if (records.length === 0) return;

  // Stuur per taalgroep (elke gebruiker krijgt notificatie in zijn eigen taal)
  const byLang = new Map<string, string[]>();
  for (const r of records) {
    const lang = r.language ?? opts.language ?? "nl";
    if (!byLang.has(lang)) byLang.set(lang, []);
    byLang.get(lang)!.push(r.token);
  }

  for (const [lang, tokens] of byLang) {
    const str = getStrings(lang);
    await sendExpoPushNotifications(tokens, {
      title: str.approvalTitle(opts.agentName),
      body: opts.action,
      data: { type: "approval", agentName: opts.agentName },
      badge: opts.count ?? 1,
      channelId: "higgins-approvals",
    });
  }
}

/** Stuur een morning brief notificatie */
export async function sendMorningBriefNotification(briefPreview: string, language?: string) {
  const records = Array.from(pushTokenStore.values());
  if (records.length === 0) return;

  const byLang = new Map<string, string[]>();
  for (const r of records) {
    const lang = r.language ?? language ?? "nl";
    if (!byLang.has(lang)) byLang.set(lang, []);
    byLang.get(lang)!.push(r.token);
  }

  for (const [lang, tokens] of byLang) {
    const str = getStrings(lang);
    await sendExpoPushNotifications(tokens, {
      title: str.morningBriefTitle,
      body: briefPreview.substring(0, 120) + (briefPreview.length > 120 ? "..." : ""),
      data: { type: "morning_brief" },
      badge: 1,
    });
  }
}

/** Stuur een breaking news notificatie voor baanbrekend AI/blockchain nieuws */
export async function sendBreakingNewsNotification(headline: string, language?: string) {
  const records = Array.from(pushTokenStore.values());
  if (records.length === 0) return;

  const byLang = new Map<string, string[]>();
  for (const r of records) {
    const lang = r.language ?? language ?? "nl";
    if (!byLang.has(lang)) byLang.set(lang, []);
    byLang.get(lang)!.push(r.token);
  }

  for (const [lang, tokens] of byLang) {
    const str = getStrings(lang);
    await sendExpoPushNotifications(tokens, {
      title: str.breakingNewsTitle,
      body: headline.substring(0, 150) + (headline.length > 150 ? "..." : ""),
      data: { type: "breaking_news" },
      sound: "default",
      priority: "high",
    });
  }
}

/** Stuur een Higgins chat notificatie (app op achtergrond) */
export async function sendChatNotification(message: string, language?: string) {
  const records = Array.from(pushTokenStore.values());
  if (records.length === 0) return;

  const byLang = new Map<string, string[]>();
  for (const r of records) {
    const lang = r.language ?? language ?? "nl";
    if (!byLang.has(lang)) byLang.set(lang, []);
    byLang.get(lang)!.push(r.token);
  }

  for (const [lang, tokens] of byLang) {
    const str = getStrings(lang);
    await sendExpoPushNotifications(tokens, {
      title: str.chatTitle,
      body: message.substring(0, 100) + (message.length > 100 ? "..." : ""),
      data: { type: "chat" },
    });
  }
}
