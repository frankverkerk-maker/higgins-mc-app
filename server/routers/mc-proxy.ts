/**
 * ============================================================================
 * MC-CLOUD PROXY — Vervangt de lokale higgins.* procedures
 * ============================================================================
 * Alle higgins.* tRPC calls worden doorgestuurd naar de MC-cloud backend
 * op https://higgins-dash-bbdpujw2.manus.space/api/trpc/higgins.*
 *
 * Dit zorgt ervoor dat:
 * - De echte Higgins engine (met 66 agents, delegatie, tools) antwoordt
 * - Geen Manus sandbox spawning meer nodig per delegatie
 * - Voice, PDF, transcriptie etc. allemaal via MC-cloud lopen
 * ============================================================================
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";

const MC_BASE = "https://higgins-dash-bbdpujw2.manus.space/api/trpc";

// Generic proxy helper for queries
async function proxyQuery(procedure: string, input: any): Promise<any> {
  const encoded = encodeURIComponent(JSON.stringify({ json: input || {} }));
  const url = `${MC_BASE}/higgins.${procedure}?input=${encoded}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`[MC-Proxy] Query higgins.${procedure} failed (${resp.status}):`, text.slice(0, 200));
    throw new Error(`MC proxy error: ${resp.status}`);
  }
  const data = await resp.json();
  // tRPC wraps in { result: { data: { json: ... } } }
  return data?.result?.data?.json ?? data;
}

// Generic proxy helper for mutations
async function proxyMutation(procedure: string, input: any): Promise<any> {
  const url = `${MC_BASE}/higgins.${procedure}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`[MC-Proxy] Mutation higgins.${procedure} failed (${resp.status}):`, text.slice(0, 200));
    throw new Error(`MC proxy error: ${resp.status}`);
  }
  const data = await resp.json();
  return data?.result?.data?.json ?? data;
}

export const mcProxyRouter = router({
  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES — doorgestuurd naar MC-cloud
  // ═══════════════════════════════════════════════════════════════════════════

  getBuilding: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("getBuilding", input)),

  getAgentStatus: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("getAgentStatus", input)),

  morningBrief: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("morningBrief", input)),

  dailyBriefing: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("dailyBriefing", input)),

  getPendingApprovals: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("getPendingApprovals", input)),

  getTaskStatus: publicProcedure
    .input(z.any().optional())
    .query(async ({ input }) => proxyQuery("getTaskStatus", input)),

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATIONS — doorgestuurd naar MC-cloud
  // ═══════════════════════════════════════════════════════════════════════════

  chat: publicProcedure
    .input(z.object({
      message: z.string(),
      history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
      userName: z.string().optional(),
      language: z.string().optional(),
      audioTranscript: z.string().optional(),
      confirmDelegation: z.object({
        targetAgent: z.string(),
        taskDescription: z.string(),
        audioTranscript: z.string().optional(),
        additionalTargets: z.array(z.object({
          agent: z.string(),
          task: z.string().optional(),
        })).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("chat", input)),

  speak: publicProcedure
    .input(z.object({
      text: z.string(),
      voiceId: z.string().optional(),
      language: z.string().optional(),
      agentName: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("speak", input)),

  transcribe: publicProcedure
    .input(z.object({
      audioBase64: z.string(),
      language: z.string().optional(),
      mimeType: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("transcribe", input)),

  transcribeMeeting: publicProcedure
    .input(z.object({
      audioBase64: z.string(),
      language: z.string().optional(),
      duration: z.number().optional(),
      mimeType: z.string().optional(),
      userName: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("transcribeMeeting", input)),

  voiceClone: publicProcedure
    .input(z.object({
      audioBase64: z.string(),
      name: z.string().optional(),
      mimeType: z.string().optional(),
      removeBackgroundNoise: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("voiceClone", input)),

  uploadPdf: publicProcedure
    .input(z.object({
      base64: z.string().optional(),
      url: z.string().optional(),
      fileName: z.string().optional(),
      instruction: z.string().optional(),
      language: z.string().optional(),
      mimeType: z.string().optional(),
      userName: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("uploadPdf", input)),

  generatePdf: publicProcedure
    .input(z.object({
      content: z.string().optional(),
      title: z.string().optional(),
      language: z.string().optional(),
      userName: z.string().optional(),
      messages: z.array(z.any()).optional(),
    }).passthrough())
    .mutation(async ({ input }) => proxyMutation("generatePdf", input)),

  exportChat: publicProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.string(),
        content: z.string(),
        timestamp: z.any().optional(),
        type: z.string().optional(),
        assignedAgent: z.string().optional(),
        audioAttached: z.boolean().optional(),
      })),
      userName: z.string().optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("exportChat", input)),

  activateAgent: publicProcedure
    .input(z.object({
      agentName: z.string(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("activateAgent", input)),

  processApproval: publicProcedure
    .input(z.object({
      approvalId: z.string(),
      action: z.enum(["approve", "reject"]),
      agentName: z.string().optional(),
      actionDescription: z.string().optional(),
      userName: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("processApproval", input)),

  confirmDelegation: publicProcedure
    .input(z.object({
      targetAgent: z.string(),
      taskDescription: z.string(),
      audioTranscript: z.string().optional(),
      userName: z.string().optional(),
      additionalTargets: z.array(z.object({
        agent: z.string(),
        task: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("confirmDelegation", input)),

  checkBreakingNews: publicProcedure
    .input(z.object({ lang: z.string().optional() }))
    .mutation(async ({ input }) => proxyMutation("checkBreakingNews", input)),

  registerPushToken: publicProcedure
    .input(z.object({
      token: z.string(),
      platform: z.string().optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => proxyMutation("registerPushToken", input)),
});
