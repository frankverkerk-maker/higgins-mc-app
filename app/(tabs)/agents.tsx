import { ScrollView, Text, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { useColors } from "@/hooks/use-colors";

// ─── Mock data ────────────────────────────────────────────────────────────────

const AGENTS = [
  {
    id: "higgins",
    name: "Higgins",
    role: "Chief of Staff & Butler",
    status: "active",
    task: "Ochtend briefing voorbereiden",
    tasksToday: 12,
    color: "#14B8A6",
    isHiggins: true,
  },
  {
    id: "elena",
    name: "Elena",
    role: "Executive Assistant",
    status: "active",
    task: "E-mails verwerken en klaarzetten",
    tasksToday: 8,
    color: "#8B5CF6",
    isHiggins: false,
  },
  {
    id: "justitia",
    name: "Justitia",
    role: "Legal Advisor",
    status: "idle",
    task: "Wacht op opdracht",
    tasksToday: 2,
    color: "#F59E0B",
    isHiggins: false,
  },
  {
    id: "warren",
    name: "Warren",
    role: "Finance Analyst",
    status: "idle",
    task: "Wacht op opdracht",
    tasksToday: 5,
    color: "#10B981",
    isHiggins: false,
  },
  {
    id: "aria",
    name: "Aria",
    role: "Research Specialist",
    status: "idle",
    task: "Wacht op opdracht",
    tasksToday: 1,
    color: "#EC4899",
    isHiggins: false,
  },
  {
    id: "medicus",
    name: "Medicus",
    role: "Health & Wellness Advisor",
    status: "idle",
    task: "Wacht op opdracht",
    tasksToday: 0,
    color: "#3B82F6",
    isHiggins: false,
  },
];

const ACTIVITY_LOG = [
  { id: "l1", agent: "Warren", action: "Portfolio analyse Q2 afgerond", time: "09:14", type: "done" },
  { id: "l2", agent: "Elena", action: "4 e-mails klaargezet voor goedkeuring", time: "09:02", type: "pending" },
  { id: "l3", agent: "Higgins", action: "Dagplanning samengesteld", time: "08:45", type: "done" },
  { id: "l4", agent: "Justitia", action: "Contract partner clinic gereviewed", time: "Gisteren", type: "done" },
  { id: "l5", agent: "Aria", action: "Marktonderzoek Baden-Baden voltooid", time: "Gisteren", type: "done" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeamPulseScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const activeCount = AGENTS.filter((a) => a.status === "active").length;

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Team Pulse</Text>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>{activeCount} actief</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Higgins coördineert uw team. U communiceert uitsluitend via Higgins.
        </Text>

        {/* Agent Status Cards */}
        <View style={styles.agentList}>
          {AGENTS.map((agent) => (
            <View key={agent.id} style={[styles.agentCard, agent.status === "active" && styles.agentCardActive]}>
              <View style={styles.agentLeft}>
                {agent.isHiggins ? (
                  <HigginsAvatar size={44} />
                ) : (
                  <View style={[styles.agentAvatar, { backgroundColor: agent.color + "22", borderColor: agent.color + "55" }]}>
                    <Text style={[styles.agentAvatarText, { color: agent.color }]}>
                      {agent.name[0]}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.agentInfo}>
                <View style={styles.agentNameRow}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <View style={[styles.statusPill, { backgroundColor: agent.status === "active" ? "#34D39922" : "#94A3B822" }]}>
                    <View style={[styles.statusPillDot, { backgroundColor: agent.status === "active" ? "#34D399" : "#94A3B8" }]} />
                    <Text style={[styles.statusPillText, { color: agent.status === "active" ? "#34D399" : "#94A3B8" }]}>
                      {agent.status === "active" ? "Actief" : "Inactief"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.agentRole}>{agent.role}</Text>
                <Text style={styles.agentTask} numberOfLines={1}>{agent.task}</Text>
              </View>
              <View style={styles.agentStats}>
                <Text style={[styles.agentTaskCount, { color: agent.color }]}>{agent.tasksToday}</Text>
                <Text style={styles.agentTaskLabel}>taken</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Activity Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activiteit vandaag</Text>
          <View style={styles.logList}>
            {ACTIVITY_LOG.map((item, index) => (
              <View key={item.id} style={styles.logItem}>
                <View style={styles.logTimeline}>
                  <View style={[styles.logDot, { backgroundColor: item.type === "done" ? "#34D399" : colors.primary }]} />
                  {index < ACTIVITY_LOG.length - 1 && <View style={styles.logLine} />}
                </View>
                <View style={styles.logContent}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logAgent}>{item.agent}</Text>
                    <Text style={styles.logTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.logAction}>{item.action}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    },
    title: { fontSize: 26, fontWeight: "700", color: colors.foreground, letterSpacing: -0.5 },
    activeBadge: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: "#34D39922", paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 20, borderWidth: 1, borderColor: "#34D39944",
    },
    activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#34D399" },
    activeText: { fontSize: 12, color: "#34D399", fontWeight: "600" },
    subtitle: {
      fontSize: 12, color: colors.muted, paddingHorizontal: 20,
      marginBottom: 20, lineHeight: 17,
    },

    // Agent list
    agentList: { paddingHorizontal: 20, gap: 10, marginBottom: 28 },
    agentCard: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: colors.surface, borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: colors.border,
    },
    agentCardActive: { borderColor: "#34D39933" },
    agentLeft: {},
    agentAvatar: {
      width: 44, height: 44, borderRadius: 22,
      borderWidth: 1.5, alignItems: "center", justifyContent: "center",
    },
    agentAvatarText: { fontSize: 18, fontWeight: "700" },
    agentInfo: { flex: 1, gap: 2 },
    agentNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    agentName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
    statusPill: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
    },
    statusPillDot: { width: 5, height: 5, borderRadius: 3 },
    statusPillText: { fontSize: 10, fontWeight: "600" },
    agentRole: { fontSize: 11, color: colors.muted },
    agentTask: { fontSize: 12, color: colors.foreground, opacity: 0.7 },
    agentStats: { alignItems: "center", minWidth: 36 },
    agentTaskCount: { fontSize: 20, fontWeight: "700" },
    agentTaskLabel: { fontSize: 10, color: colors.muted, marginTop: -2 },

    // Activity log
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, letterSpacing: -0.3, marginBottom: 16 },
    logList: { gap: 0 },
    logItem: { flexDirection: "row", gap: 14 },
    logTimeline: { alignItems: "center", width: 16 },
    logDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    logLine: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 4 },
    logContent: { flex: 1, paddingBottom: 16 },
    logHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
    logAgent: { fontSize: 12, fontWeight: "700", color: colors.primary },
    logTime: { fontSize: 11, color: colors.muted },
    logAction: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
  });
}
