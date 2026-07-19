/**
 * Push Notification Service — Higgins MC
 *
 * Beheert Expo push tokens en verstuurt notificaties via de Expo Push Service.
 * Tokens worden in-memory opgeslagen (overleeft herstart niet, maar dat is OK
 * voor een single-user app — token wordt bij elke app-start opnieuw geregistreerd).
 *
 * In productie: vervang door database opslag (drizzle/schema.ts uitbreiden).
 */

import { getDb } from "./db";
import { pushTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Token store (database-backed, survives restarts) ────────────────────────
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
  agentCompleteTitle: (agent: string) => string;
  agentErrorTitle: (agent: string) => string;
}> = {
  nl: {
    approvalTitle: (agent) => `✅ Goedkeuring vereist — ${agent}`,
    morningBriefTitle: "🌅 Goedemorgen — Higgins Briefing",
    chatTitle: "💬 Higgins heeft gereageerd",
    breakingNewsTitle: "⚡ Baanbrekend nieuws — AI & Blockchain",
    agentCompleteTitle: (agent) => `✅ ${agent} — Opdracht voltooid`,
    agentErrorTitle: (agent) => `⚠️ ${agent} — Fout gemeld`,
  },
  de: {
    approvalTitle: (agent) => `✅ Genehmigung erforderlich — ${agent}`,
    morningBriefTitle: "🌅 Guten Morgen — Higgins Briefing",
    chatTitle: "💬 Higgins hat geantwortet",
    breakingNewsTitle: "⚡ Bahnbrechende Neuigkeiten — KI & Blockchain",
    agentCompleteTitle: (agent) => `✅ ${agent} — Aufgabe abgeschlossen`,
    agentErrorTitle: (agent) => `⚠️ ${agent} — Fehler gemeldet`,
  },
  en: {
    approvalTitle: (agent) => `✅ Approval required — ${agent}`,
    morningBriefTitle: "🌅 Good morning — Higgins Briefing",
    chatTitle: "💬 Higgins has responded",
    breakingNewsTitle: "⚡ Breaking news — AI & Blockchain",
    agentCompleteTitle: (agent) => `✅ ${agent} — Task completed`,
    agentErrorTitle: (agent) => `⚠️ ${agent} — Error reported`,
  },
};

function getStrings(lang?: string) {
  return PUSH_STRINGS[lang ?? "nl"] ?? PUSH_STRINGS.nl;
}

// Memory cache (populated from DB at startup, updated on register/remove)
export const pushTokenStore = new Map<string, PushTokenRecord>();

/** Register or update a push token in the database + memory cache */
export async function registerPushToken(token: string, platform: string, language?: string) {
  const lang = language ?? "nl";
  try {
    const db = await getDb();
    if (db) {
      await db.insert(pushTokens).values({
        token,
        platform,
        language: lang,
      }).onDuplicateKeyUpdate({
        set: { platform, language: lang },
      });
    }
  } catch (err) {
    console.error("[push] DB upsert mislukt, valt terug op memory:", err);
  }
  pushTokenStore.set(token, { token, platform, registeredAt: new Date().toISOString(), language: lang });
  console.log(`[push] Token geregistreerd (${platform}, ${lang})`);
}

/** Load all tokens from DB into memory cache (call at startup) */
export async function loadPushTokensFromDb() {
  try {
    const db = await getDb();
    if (!db) { console.warn("[push] Geen DB beschikbaar, tokens alleen in memory"); return; }
    const rows = await db.select().from(pushTokens);
    for (const row of rows) {
      pushTokenStore.set(row.token, {
        token: row.token,
        platform: row.platform,
        registeredAt: row.createdAt.toISOString(),
        language: row.language ?? "nl",
      });
    }
    console.log(`[push] ${rows.length} token(s) geladen uit database`);
  } catch (err) {
    console.error("[push] Kon tokens niet uit DB laden:", err);
  }
}

/** Remove a token from DB + cache (e.g. on Expo "DeviceNotRegistered" error) */
export async function removePushToken(token: string) {
  pushTokenStore.delete(token);
  try {
    const db = await getDb();
    if (db) await db.delete(pushTokens).where(eq(pushTokens.token, token));
  } catch (_) {}
}

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

/** Stuur een notificatie wanneer een gedelegeerde agent-taak is voltooid of mislukt */
export async function sendTaskCompletionNotification(opts: {
  agentName: string;
  taskId: string;
  status: "stopped" | "error";
  resultPreview?: string;
  language?: string;
}) {
  const records = Array.from(pushTokenStore.values());
  if (records.length === 0) return;

  const byLang = new Map<string, string[]>();
  for (const r of records) {
    const lang = r.language ?? opts.language ?? "nl";
    if (!byLang.has(lang)) byLang.set(lang, []);
    byLang.get(lang)!.push(r.token);
  }

  for (const [lang, tokens] of byLang) {
    const str = getStrings(lang);
    const title = opts.status === "stopped"
      ? str.agentCompleteTitle(opts.agentName)
      : str.agentErrorTitle(opts.agentName);
    const body = opts.resultPreview
      ? opts.resultPreview.substring(0, 120) + (opts.resultPreview.length > 120 ? "..." : "")
      : (opts.status === "stopped" ? "Open de app voor het volledige resultaat." : "Open de app voor details.");

    await sendExpoPushNotifications(tokens, {
      title,
      body,
      data: { type: "agent_update", taskId: opts.taskId, agentName: opts.agentName, status: opts.status },
      badge: 1,
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
