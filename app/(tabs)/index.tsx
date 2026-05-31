import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { useColors } from "@/hooks/use-colors";

// ─── Mock data (wordt later vervangen door live Manus API data) ───────────────

const MORNING_BRIEF = {
  date: "Zaterdag, 31 mei 2026",
  summary:
    "Goedemorgen. Vandaag heeft u 2 vergaderingen en 3 openstaande acties. Warren heeft gisteren de portfolio-analyse afgerond. Elena heeft 4 e-mails klaargezet voor uw goedkeuring. Ik adviseer u te beginnen met de Q2-review.",
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
  { id: "ag2", name: "Elena", status: "active", task: "E-mails verwerken" },
  { id: "ag3", name: "Warren", status: "idle", task: "Wacht op opdracht" },
  { id: "ag4", name: "Justitia", status: "idle", task: "Wacht op opdracht" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const styles = makeStyles(colors);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.title}>Command Center</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        {/* ── Morning Brief ── */}
        <View style={styles.briefCard}>
          <View style={styles.briefHeader}>
            <HigginsAvatar size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.briefLabel}>Ochtend Briefing</Text>
              <Text style={styles.briefDate}>{MORNING_BRIEF.date}</Text>
            </View>
            <View style={styles.briefBadge}>
              <Text style={styles.briefBadgeText}>Nieuw</Text>
            </View>
          </View>
          <Text style={styles.briefSummary}>{MORNING_BRIEF.summary}</Text>
          <View style={styles.briefHighlight}>
            <Text style={styles.briefHighlightText}>⚡ {MORNING_BRIEF.highlight}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.briefCta, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/chat")}
          >
            <Text style={styles.briefCtaText}>Bespreek met Higgins →</Text>
          </Pressable>
        </View>

        {/* ── Goedkeuringen vereist ── */}
        {APPROVALS.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Wacht op uw goedkeuring</Text>
              <View style={styles.approvalBadge}>
                <Text style={styles.approvalBadgeText}>{APPROVALS.length}</Text>
              </View>
            </View>
            <View style={styles.approvalList}>
              {APPROVALS.map((item) => (
                <View key={item.id} style={styles.approvalCard}>
                  <View style={styles.approvalTop}>
                    <Text style={styles.approvalAgent}>{item.agent}</Text>
                    <Text style={styles.approvalTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.approvalAction}>{item.action}</Text>
                  <View style={styles.approvalButtons}>
                    <Pressable
                      style={({ pressed }) => [styles.approvalBtn, styles.approvalBtnApprove, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.approvalBtnApproveText}>✓ Goedkeuren</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.approvalBtn, styles.approvalBtnReject, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.approvalBtnRejectText}>✕ Afwijzen</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Prioriteiten van de dag ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prioriteiten vandaag</Text>
          <View style={styles.priorityList}>
            {PRIORITIES.map((item, index) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.priorityItem, pressed && { opacity: 0.8 }]}
                onPress={() => router.push("/chat")}
              >
                <View style={[styles.priorityNumber, item.urgent && styles.priorityNumberUrgent]}>
                  <Text style={[styles.priorityNumberText, item.urgent && styles.priorityNumberTextUrgent]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.priorityLabel}>{item.label}</Text>
                  <Text style={styles.priorityAgent}>via {item.agent}</Text>
                </View>
                {item.urgent && (
                  <View style={styles.urgentTag}>
                    <Text style={styles.urgentTagText}>Urgent</Text>
                  </View>
                )}
                <Text style={styles.priorityArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Snelle Opdrachten ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snelle opdrachten</Text>
          <View style={styles.commandGrid}>
            {QUICK_COMMANDS.map((cmd) => (
              <Pressable
                key={cmd.id}
                style={({ pressed }) => [styles.commandCard, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
                onPress={() => router.push("/chat")}
              >
                <Text style={styles.commandIcon}>{cmd.icon}</Text>
                <Text style={styles.commandLabel}>{cmd.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Agent Pulse ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Pulse</Text>
          <View style={styles.pulseList}>
            {AGENT_PULSE.map((agent) => (
              <View key={agent.id} style={styles.pulseItem}>
                <View style={[styles.pulseDot, { backgroundColor: agent.status === "active" ? "#34D399" : "#94A3B8" }]} />
                <Text style={styles.pulseName}>{agent.name}</Text>
                <Text style={styles.pulseTask} numberOfLines={1}>{agent.task}</Text>
                <View style={[styles.pulseStatus, { backgroundColor: agent.status === "active" ? "#34D39922" : "#94A3B822" }]}>
                  <Text style={[styles.pulseStatusText, { color: agent.status === "active" ? "#34D399" : "#94A3B8" }]}>
                    {agent.status === "active" ? "Actief" : "Inactief"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Spreek met Higgins CTA ── */}
        <Pressable
          style={({ pressed }) => [styles.chatCta, pressed && { opacity: 0.85 }]}
          onPress={() => router.push("/chat")}
        >
          <HigginsAvatar size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.chatCtaTitle}>Spreek met Higgins</Text>
            <Text style={styles.chatCtaSubtitle}>Stel een vraag of geef een opdracht</Text>
          </View>
          <Text style={styles.chatCtaArrow}>›</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 20,
    },
    greeting: { fontSize: 13, color: colors.muted, fontWeight: "400" },
    title: { fontSize: 26, fontWeight: "700", color: colors.foreground, marginTop: 2, letterSpacing: -0.5 },
    statusBadge: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border, gap: 6,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#34D399" },
    statusText: { fontSize: 12, color: "#34D399", fontWeight: "600" },

    // Morning Brief
    briefCard: {
      marginHorizontal: 20, marginBottom: 24,
      backgroundColor: colors.surface, borderRadius: 20,
      padding: 18, borderWidth: 1, borderColor: colors.border,
      gap: 12,
    },
    briefHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    briefLabel: { fontSize: 13, fontWeight: "700", color: colors.primary, letterSpacing: 0.3 },
    briefDate: { fontSize: 11, color: colors.muted, marginTop: 1 },
    briefBadge: {
      backgroundColor: colors.primary + "22", paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 8, borderWidth: 1, borderColor: colors.primary + "44",
    },
    briefBadgeText: { fontSize: 10, color: colors.primary, fontWeight: "700" },
    briefSummary: { fontSize: 13, color: colors.foreground, lineHeight: 20 },
    briefHighlight: {
      backgroundColor: colors.primary + "15", borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8,
      borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    briefHighlightText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    briefCta: {
      alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8,
      backgroundColor: colors.primary, borderRadius: 12,
    },
    briefCtaText: { fontSize: 13, color: "#fff", fontWeight: "700" },

    // Sections
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, letterSpacing: -0.3, marginBottom: 12 },

    // Approvals
    approvalBadge: {
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center",
    },
    approvalBadgeText: { fontSize: 11, color: "#fff", fontWeight: "700" },
    approvalList: { gap: 10 },
    approvalCard: {
      backgroundColor: colors.surface, borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: "#EF444433", gap: 8,
    },
    approvalTop: { flexDirection: "row", justifyContent: "space-between" },
    approvalAgent: { fontSize: 12, fontWeight: "700", color: colors.primary },
    approvalTime: { fontSize: 11, color: colors.muted },
    approvalAction: { fontSize: 13, color: colors.foreground, lineHeight: 19 },
    approvalButtons: { flexDirection: "row", gap: 8, marginTop: 4 },
    approvalBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
    approvalBtnApprove: { backgroundColor: "#34D39922", borderWidth: 1, borderColor: "#34D39944" },
    approvalBtnApproveText: { fontSize: 13, fontWeight: "700", color: "#34D399" },
    approvalBtnReject: { backgroundColor: "#EF444422", borderWidth: 1, borderColor: "#EF444444" },
    approvalBtnRejectText: { fontSize: 13, fontWeight: "700", color: "#EF4444" },

    // Priorities
    priorityList: { gap: 8 },
    priorityItem: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.border,
    },
    priorityNumber: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: colors.border, alignItems: "center", justifyContent: "center",
    },
    priorityNumberUrgent: { backgroundColor: colors.primary + "22" },
    priorityNumberText: { fontSize: 13, fontWeight: "700", color: colors.muted },
    priorityNumberTextUrgent: { color: colors.primary },
    priorityLabel: { fontSize: 13, fontWeight: "600", color: colors.foreground, lineHeight: 18 },
    priorityAgent: { fontSize: 11, color: colors.muted, marginTop: 2 },
    urgentTag: {
      backgroundColor: "#EF444422", paddingHorizontal: 7, paddingVertical: 3,
      borderRadius: 6, borderWidth: 1, borderColor: "#EF444444",
    },
    urgentTagText: { fontSize: 10, color: "#EF4444", fontWeight: "700" },
    priorityArrow: { fontSize: 20, color: colors.muted, fontWeight: "300" },

    // Quick Commands
    commandGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    commandCard: {
      width: "30%", aspectRatio: 1,
      backgroundColor: colors.surface, borderRadius: 16,
      borderWidth: 1, borderColor: colors.border,
      alignItems: "center", justifyContent: "center", gap: 6,
    },
    commandIcon: { fontSize: 24 },
    commandLabel: { fontSize: 11, fontWeight: "600", color: colors.foreground, textAlign: "center" },

    // Agent Pulse
    pulseList: { gap: 8 },
    pulseItem: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: colors.surface, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: colors.border,
    },
    pulseDot: { width: 8, height: 8, borderRadius: 4 },
    pulseName: { fontSize: 13, fontWeight: "700", color: colors.foreground, width: 72 },
    pulseTask: { flex: 1, fontSize: 12, color: colors.muted },
    pulseStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    pulseStatusText: { fontSize: 11, fontWeight: "600" },

    // Chat CTA
    chatCta: {
      marginHorizontal: 20, backgroundColor: colors.primary,
      borderRadius: 16, padding: 16,
      flexDirection: "row", alignItems: "center", gap: 12,
    },
    chatCtaTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
    chatCtaSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
    chatCtaArrow: { fontSize: 24, color: "rgba(255,255,255,0.7)", fontWeight: "300" },
  });
}
