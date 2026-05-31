import { ScrollView, Text, View, Pressable, StyleSheet, Platform } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { USER_NAME_KEY } from "@/app/onboarding";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/lib/language-provider";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       "#0A0C0E",
  surface:  "#111418",
  surface2: "#161B21",
  border:   "#1E2530",
  cyan:     "#00D4D4",
  cyanDim:  "rgba(0,212,212,0.15)",
  cyanBorder:"rgba(0,212,212,0.25)",
  text:     "#E8EDF2",
  muted:    "#5A6472",
  red:      "#FF4D6A",
  redDim:   "rgba(255,77,106,0.15)",
  green:    "#00D4A0",
  greenDim: "rgba(0,212,160,0.15)",
  amber:    "#F5A623",
};

const FONT = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

// ─── Mock data ────────────────────────────────────────────────────────────────
const MORNING_BRIEF = {
  date: "Zaterdag, 31 mei 2026",
  summary: "Goedemorgen. Vandaag heeft u 2 vergaderingen en 3 openstaande acties. Warren heeft gisteren de portfolio-analyse afgerond. Elena heeft 4 e-mails klaargezet voor uw goedkeuring. Ik adviseer u te beginnen met de Q2-review.",
  highlight: "Q2-review vereist uw aandacht vandaag.",
};

const PRIORITIES = [
  { id: "p1", label: "Q2 financieel rapport goedkeuren", agent: "Warren", urgent: true },
  { id: "p2", label: "Voorstel nieuwe partner clinic bekijken", agent: "Justitia", urgent: false },
  { id: "p3", label: "Agenda volgende week bevestigen", agent: "Elena", urgent: false },
];

const QUICK_COMMANDS = [
  { id: "q1", icon: "📋", label: "Dagbriefing" },
  { id: "q2", icon: "📅", label: "Plan vergadering" },
  { id: "q3", icon: "📊", label: "Stuur rapport" },
  { id: "q4", icon: "✉️", label: "Delegeer e-mail" },
  { id: "q5", icon: "🔍", label: "Zoek informatie" },
  { id: "q6", icon: "⚡", label: "Snelle actie" },
];

const APPROVALS = [
  { id: "a1", agent: "Elena", action: "E-mail versturen naar 3 partner clinics over Q3-planning", time: "14 min geleden" },
  { id: "a2", agent: "Warren", action: "Portfolio herbalancering uitvoeren (€12.400)", time: "1 uur geleden" },
];

const AGENT_PULSE = [
  { id: "ag1", name: "Higgins", status: "active", task: "Briefing voorbereiden" },
  { id: "ag2", name: "Elena",   status: "active", task: "E-mails verwerken" },
  { id: "ag3", name: "Warren",  status: "idle",   task: "Wacht op opdracht" },
  { id: "ag4", name: "Justitia",status: "idle",   task: "Wacht op opdracht" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [userName, setUserName] = useState<string | null>(null);
  const [approvals, setApprovals] = useState(APPROVALS);
  const [approvalFeedback, setApprovalFeedback] = useState<Record<string, string>>({});

  // Live Morning Briefing via server
  const briefQuery = trpc.higgins.morningBrief.useQuery(
    { userName: userName ?? undefined, language },
    { enabled: true, staleTime: 5 * 60 * 1000 }
  );

  // Approval mutation
  const approvalMutation = trpc.higgins.processApproval.useMutation();

  useEffect(() => {
    AsyncStorage.getItem(USER_NAME_KEY).then((name) => {
      if (name) setUserName(name);
    });
  }, []);

  const handleApproval = useCallback(async (item: typeof APPROVALS[0], action: "approve" | "reject") => {
    if (Platform.OS !== "web") {
      action === "approve"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    try {
      const result = await approvalMutation.mutateAsync({
        approvalId: item.id,
        action,
        agentName: item.agent,
        actionDescription: item.action,
        userName: userName ?? undefined,
      });
      const higginsReply = typeof result.higginsResponse === "string"
        ? result.higginsResponse
        : "Begrepen.";
      setApprovalFeedback((prev) => ({ ...prev, [item.id]: higginsReply }));
      // Verwijder na 3 seconden
      setTimeout(() => {
        setApprovals((prev) => prev.filter((a) => a.id !== item.id));
      }, 3000);
    } catch (_) {
      setApprovalFeedback((prev) => ({ ...prev, [item.id]: "Actie verwerkt." }));
      setTimeout(() => {
        setApprovals((prev) => prev.filter((a) => a.id !== item.id));
      }, 2000);
    }
  }, [userName, approvalMutation]);

  const now = new Date();
  const hour = now.getHours();
  const greetingWord = hour < 12 ? t.dashboard.morning : hour < 18 ? t.dashboard.afternoon : t.dashboard.evening;
  const greeting = userName ? `${greetingWord}, ${userName}` : greetingWord;

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting}</Text>
            <Text style={s.title}>{t.dashboard.title}</Text>
          </View>
          <View style={s.statusBadge}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>{t.common.online}</Text>
          </View>
        </View>

        {/* ── Morning Brief ── */}
        <View style={s.briefCard}>
          <View style={s.briefHeader}>
            <HigginsAvatar size={38} />
            <View style={{ flex: 1 }}>
              <Text style={s.briefLabel}>{t.dashboard.morningBriefing}</Text>
              <Text style={s.briefDate}>{briefQuery.data?.date ?? MORNING_BRIEF.date}</Text>
            </View>
            <View style={s.newBadge}>
              <Text style={s.newBadgeText}>{t.dashboard.morningBriefingNew}</Text>
            </View>
          </View>
          <Text style={s.briefSummary}>
            {briefQuery.isLoading ? t.dashboard.morningBriefLoading : briefQuery.data?.brief ?? MORNING_BRIEF.summary}
          </Text>
          {!briefQuery.isLoading && (
            <View style={s.briefHighlight}>
              <Text style={s.briefHighlightText}>⚡ {MORNING_BRIEF.highlight}</Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [s.briefCta, pressed && { opacity: 0.75 }]}
            onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {} router.push("/chat"); }}
          >
            <Text style={s.briefCtaText}>{t.dashboard.discussWithHiggins}</Text>
          </Pressable>
        </View>

        {/* ── Goedkeuringen ── */}
        {approvals.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>{t.dashboard.awaitingApproval}</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{approvals.length}</Text>
              </View>
            </View>
            {approvals.map((item) => (
              <View key={item.id} style={s.approvalCard}>
                <View style={s.approvalTop}>
                  <Text style={s.approvalAgent}>{item.agent}</Text>
                  <Text style={s.approvalTime}>{item.time}</Text>
                </View>
                <Text style={s.approvalAction}>{item.action}</Text>
                {approvalFeedback[item.id] ? (
                  <View style={[s.briefHighlight, { marginTop: 8 }]}>
                    <Text style={[s.briefHighlightText, { fontSize: 13 }]}>💬 {approvalFeedback[item.id]}</Text>
                  </View>
                ) : (
                  <View style={s.approvalButtons}>
                    <Pressable
                      style={({ pressed }) => [s.btnApprove, pressed && { opacity: 0.75 }, approvalMutation.isPending && { opacity: 0.5 }]}
                      onPress={() => handleApproval(item, "approve")}
                      disabled={approvalMutation.isPending}
                    >
                      <Text style={s.btnApproveText}>✓  {t.dashboard.approve}</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [s.btnReject, pressed && { opacity: 0.75 }, approvalMutation.isPending && { opacity: 0.5 }]}
                      onPress={() => handleApproval(item, "reject")}
                      disabled={approvalMutation.isPending}
                    >
                      <Text style={s.btnRejectText}>✕  {t.dashboard.reject}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Prioriteiten ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.dashboard.prioritiesToday}</Text>
          {PRIORITIES.map((item, index) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [s.priorityItem, pressed && { opacity: 0.75 }]}
              onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {} router.push("/chat"); }}
            >
              <View style={[s.priorityNum, item.urgent && s.priorityNumUrgent]}>
                <Text style={[s.priorityNumText, item.urgent && { color: C.cyan }]}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.priorityLabel}>{item.label}</Text>
                <Text style={s.priorityAgent}>via {item.agent}</Text>
              </View>
              {item.urgent && (
                <View style={s.urgentTag}>
                  <Text style={s.urgentTagText}>{t.dashboard.urgent}</Text>
                </View>
              )}
              <Text style={s.arrow}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Snelle Opdrachten ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Snelle opdrachten</Text>
          <View style={s.commandGrid}>
            {QUICK_COMMANDS.map((cmd) => (
              <Pressable
                key={cmd.id}
                style={({ pressed }) => [s.commandCard, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
                onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {} router.push("/chat"); }}
              >
                <Text style={s.commandIcon}>{cmd.icon}</Text>
                <Text style={s.commandLabel}>{cmd.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Team Pulse ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.tabs.teamPulse}</Text>
          {AGENT_PULSE.map((agent) => (
            <View key={agent.id} style={s.pulseItem}>
              <View style={[s.pulseDot, { backgroundColor: agent.status === "active" ? C.green : C.muted }]} />
              <Text style={s.pulseName}>{agent.name}</Text>
              <Text style={s.pulseTask} numberOfLines={1}>{agent.task}</Text>
              <View style={[s.pulseTag, { backgroundColor: agent.status === "active" ? C.greenDim : "rgba(90,100,114,0.2)" }]}>
                <Text style={[s.pulseTagText, { color: agent.status === "active" ? C.green : C.muted }]}>
                  {agent.status === "active" ? t.dashboard.active : t.dashboard.standby}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── CTA ── */}
        <Pressable
          style={({ pressed }) => [s.chatCta, pressed && { opacity: 0.85 }]}
          onPress={() => router.push("/chat")}
        >
          <HigginsAvatar size={42} />
          <View style={{ flex: 1 }}>
            <Text style={s.chatCtaTitle}>Spreek met Higgins</Text>
            <Text style={s.chatCtaSub}>Stel een vraag of geef een opdracht</Text>
          </View>
          <Text style={s.chatCtaArrow}>›</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  greeting: { fontSize: 12, color: C.muted, fontFamily: FONT, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { fontSize: 28, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD, letterSpacing: -0.5, marginTop: 4 },
  statusBadge: { flexDirection: "row", alignItems: "center", backgroundColor: C.greenDim, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,212,160,0.3)", gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  statusText: { fontSize: 11, color: C.green, fontWeight: "700", fontFamily: FONT, letterSpacing: 0.5 },

  // Brief card
  briefCard: { marginHorizontal: 20, marginBottom: 24, backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.cyanBorder, gap: 12, shadowColor: C.cyan, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 12 },
  briefHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  briefLabel: { fontSize: 10, fontWeight: "800", color: C.cyan, fontFamily: FONT_BOLD, letterSpacing: 2 },
  briefDate: { fontSize: 11, color: C.muted, marginTop: 2, fontFamily: FONT },
  newBadge: { backgroundColor: C.cyanDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: C.cyanBorder },
  newBadgeText: { fontSize: 9, color: C.cyan, fontWeight: "800", fontFamily: FONT_BOLD, letterSpacing: 1.5 },
  briefSummary: { fontSize: 13, color: C.text, lineHeight: 21, fontFamily: FONT, opacity: 0.85 },
  briefHighlight: { backgroundColor: C.cyanDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderLeftWidth: 3, borderLeftColor: C.cyan },
  briefHighlightText: { fontSize: 12, color: C.cyan, fontWeight: "700", fontFamily: FONT_BOLD },
  briefCta: { alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 9, backgroundColor: C.cyan, borderRadius: 12 },
  briefCtaText: { fontSize: 13, color: "#0A0C0E", fontWeight: "800", fontFamily: FONT_BOLD },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD, letterSpacing: -0.2, marginBottom: 12 },
  countBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
  countBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800", fontFamily: FONT_BOLD },

  // Approvals
  approvalCard: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,77,106,0.2)", gap: 8, marginBottom: 10 },
  approvalTop: { flexDirection: "row", justifyContent: "space-between" },
  approvalAgent: { fontSize: 12, fontWeight: "800", color: C.cyan, fontFamily: FONT_BOLD, letterSpacing: 0.5 },
  approvalTime: { fontSize: 11, color: C.muted, fontFamily: FONT },
  approvalAction: { fontSize: 13, color: C.text, lineHeight: 19, fontFamily: FONT },
  approvalButtons: { flexDirection: "row", gap: 8, marginTop: 4 },
  btnApprove: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: C.greenDim, borderWidth: 1, borderColor: "rgba(0,212,160,0.3)" },
  btnApproveText: { fontSize: 13, fontWeight: "700", color: C.green, fontFamily: FONT_BOLD },
  btnReject: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: C.redDim, borderWidth: 1, borderColor: "rgba(255,77,106,0.3)" },
  btnRejectText: { fontSize: 13, fontWeight: "700", color: C.red, fontFamily: FONT_BOLD },

  // Priorities
  priorityItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  priorityNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  priorityNumUrgent: { borderColor: C.cyanBorder, backgroundColor: C.cyanDim },
  priorityNumText: { fontSize: 13, fontWeight: "800", color: C.muted, fontFamily: FONT_BOLD },
  priorityLabel: { fontSize: 13, fontWeight: "600", color: C.text, lineHeight: 18, fontFamily: FONT },
  priorityAgent: { fontSize: 11, color: C.muted, marginTop: 2, fontFamily: FONT },
  urgentTag: { backgroundColor: C.redDim, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,77,106,0.3)" },
  urgentTagText: { fontSize: 9, color: C.red, fontWeight: "800", fontFamily: FONT_BOLD, letterSpacing: 1 },
  arrow: { fontSize: 22, color: C.muted, fontWeight: "300" },

  // Quick commands
  commandGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  commandCard: { width: "30%", aspectRatio: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", gap: 7 },
  commandIcon: { fontSize: 22 },
  commandLabel: { fontSize: 10, fontWeight: "700", color: C.text, textAlign: "center", fontFamily: FONT_BOLD, letterSpacing: 0.2 },

  // Team Pulse
  pulseItem: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  pulseName: { fontSize: 13, fontWeight: "700", color: C.text, width: 72, fontFamily: FONT_BOLD },
  pulseTask: { flex: 1, fontSize: 12, color: C.muted, fontFamily: FONT },
  pulseTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pulseTagText: { fontSize: 10, fontWeight: "700", fontFamily: FONT_BOLD },

  // Chat CTA
  chatCta: { marginHorizontal: 20, backgroundColor: C.cyan, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: C.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 16 },
  chatCtaTitle: { fontSize: 15, fontWeight: "800", color: "#0A0C0E", fontFamily: FONT_BOLD },
  chatCtaSub: { fontSize: 12, color: "rgba(10,12,14,0.65)", marginTop: 2, fontFamily: FONT },
  chatCtaArrow: { fontSize: 26, color: "rgba(10,12,14,0.5)", fontWeight: "300" },
});
