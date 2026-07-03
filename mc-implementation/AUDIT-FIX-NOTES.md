# Audit Fix Implementation Notes

## R1: Delegation Result Tracker

**Problem:** When a text-command triggers delegation via the command router, the chat shows
"Agent geactiveerd" but never polls for the result. Polling only exists inside `PdfCard`.

**Solution:** Create a reusable `DelegationTracker` component that:
1. Accepts a `taskId` and `agentName`
2. Polls `getTaskStatus` every 5s (same pattern as PdfCard lines 684-706)
3. Shows inline status (running → completed/error) with the agent's last message
4. Persists the final result into the chat message (updates AsyncStorage)
5. Stops polling when status is "stopped" or "error"

**Where to integrate:**
- In `chat.tsx` renderMessage: when a message has `delegationTaskId` AND `type === "text"`,
  render the DelegationTracker below the bubble text.
- The Message type already has optional `delegationTaskId` and `assignedAgent` fields.
- When the command router returns `delegation: { taskId, agent, status }`, store those
  on the assistant message object.

**Key files:**
- `app/(tabs)/chat.tsx` — Message type (line ~70), renderMessage (line ~783), sendMessage delegation handling (line ~482-493)
- `server/routers.ts` — getTaskStatus query (lines 610-662)
- `constants/oauth.ts` — getApiBaseUrl() for absolute fetch URL

**Current Message type (approx line 70-90 in chat.tsx):**
```ts
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type: "text" | "pdf";
  pdfUrl?: string;
  pdfFileName?: string;
  pdfSizeBytes?: number;
  pageCount?: number;
  delegationTaskId?: string;
  assignedAgent?: string;
}
```

## D1: PDF Router Fix

**Problem:** `uploadPdf` in routers.ts (lines 789-815) uses a hardcoded 6-agent routing prompt
instead of the shared roster.

**Solution:** Replace the TEAM_ROUTING_PROMPT with one that uses `buildRoutingTable("internal")`
from `shared/roster.ts`. Same pattern as the command router prompt but for documents.

## P2: Push Token Registration Fix

**Problem:** `use-push-notifications.ts` line 75 uses `fetch("/api/trpc/...")` — relative URL
that fails on native (iOS/Android). Should use `getApiBaseUrl()` from `constants/oauth.ts`.

**Fix:** Import `getApiBaseUrl` and change to:
```ts
await fetch(`${getApiBaseUrl()}/api/trpc/higgins.registerPushToken`, { ... });
```

## D2: Docs Tab Sync Key

**Problem:** `docs.tsx` line 106 reads `higgins_chat_messages` but chat.tsx stores as
`higgins_chat_history_v2` (line 88: `CHAT_STORAGE_KEY = "higgins_chat_history_v2"`).

**Fix:** Change docs.tsx line 106 to read from `"higgins_chat_history_v2"`.

## T1: Agent Context Separation

**Problem:** `chat.tsx` line 459 appends agent status text to the user message string.
The command router receives this as part of the "command" and may misinterpret it.

**Fix:** Add an `agentStatuses` field to the chat mutation input (already exists in schema!)
and pass it there instead of concatenating to the message. Then in the server, inject it
into the system prompt context rather than the user message.

## Key Storage Keys:
- Chat messages: `higgins_chat_history_v2`
- Docs library: `higgins_docs_library` (DOCS_STORAGE_KEY in docs.tsx)
- Push token: `higgins_push_token`
- User name: `higgins_user_name`
- Language: `higgins_language`
