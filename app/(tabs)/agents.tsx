import { ScrollView, Text, View, StyleSheet, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         "#0A0C0E",
  surface:    "#111418",
  surface2:   "#161B21",
  border:     "#1E2530",
  cyan:       "#00D4D4",
  cyanDim:    "rgba(0,212,212,0.12)",
  cyanBorder: "rgba(0,212,212,0.25)",
  text:       "#E8EDF2",
  muted:      "#5A6472",
  green:      "#00D4A0",
  greenDim:   "rgba(0,212,160,0.15)",
  amber:      "#F5A623",
  amberDim:   "rgba(245,166,35,0.15)",
};
const FONT      = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

// ─── Mock data ────────────────────────────────────────────────────────────────
const AGENTS = [
  {
    id: "higgins",
    name: "Higgins",
    role: "Chief of Staff & Butler",
    status: "active",
    task: "Ochtend briefing voorbereiden voor morgen",
    lastActive: "Nu actief",
    isHiggins: true,
    color: "#00D4D4",
    colorDim: "rgba(0,212,212,0.12)",
  },
  {
    id: "elena",
    name: "Elena",
    role: "Executive Assistant",
    status: "active",
    task: "E-mails verwerken en agenda bijwerken",
    lastActive: "3 min geleden",
    isHiggins: false,
    color: "#A78BFA",
    colorDim: "rgba(167,139,250,0.15)",
  },
  {
    id: "warren",
    name: "Warren",
    role: "Finance Analyst",
    status: "idle",
    task: "Wacht op opdracht",
    lastActive: "2 uur geleden",
    isHiggins: false,
    color: "#F5A623",
    colorDim: "rgba(245,166,35,0.15)",
  },
  {
    id: "justitia",
    name: "Justitia",
    role: "Legal Advisor",
    status: "idle",
    task: "Wacht op opdracht",
    lastActive: "Gisteren 16:30",
    isHiggins: false,
    color: "#F472B6",
    colorDim: "rgba(244,114,182,0.15)",
  },
  {
    id: "aria",
    name: "Aria",
    role: "Marketing Strategist",
    status: "idle",
    task: "Wacht op opdracht",
    lastActive: "Gisteren 14:15",
    isHiggins: false,
    color: "#34D399",
    colorDim: "rgba(52,211,153,0.15)",
  },
  {
    id: "medicus",
    name: "Medicus",
    role: "Health & Wellness Advisor",
    status: "idle",
    task: "Wacht op opdracht",
    lastActive: "2 dagen geleden",
    isHiggins: false,
    color: "#60A5FA",
    colorDim: "rgba(96,165,250,0.15)",
  },
];

const ACTIVITY_LOG = [
  { id: "l1", agent: "Higgins", action: "Briefing samengesteld voor morgen", time: "14:52", color: "#00D4D4" },
  { id: "l2", agent: "Elena", action: "4 e-mails verwerkt, 2 klaargezet voor goedkeuring", time: "14:38", color: "#A78BFA" },
  { id: "l3", agent: "Warren", action: "Q2 portfolio-analyse afgerond en gerapporteerd", time: "12:15", color: "#F5A623" },
  { id: "l4", agent: "Higgins", action: "Vergadering 10:00 MT bevestigd en agenda verstuurd", time: "09:45", color: "#00D4D4" },
  { id: "l5", agent: "Justitia", action: "Contract partner clinic beoordeeld", time: "Gisteren", color: "#F472B6" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function TeamPulseScreen() {
  const activeCount = AGENTS.filter((a) => a.status === "active").length;

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
            <Text style={s.headerLabel}>TEAM STATUS</Text>
            <Text style={s.headerTitle}>Team Pulse</Text>
          </View>
          <View style={s.activeBadge}>
            <View style={s.activeDot} />
            <Text style={s.activeText}>{activeCount} actief</Text>
          </View>
        </View>

        <Text style={s.subtitle}>
          Higgins coördineert uw team. U communiceert uitsluitend via Higgins.
        </Text>

        {/* ── Agent kaarten ── */}
        <View style={s.agentList}>
          {AGENTS.map((agent) => (
            <View
              key={agent.id}
              style={[
                s.agentCard,
                agent.status === "active" && { borderColor: agent.color + "40" },
              ]}
            >
              <View style={s.agentLeft}>
                {agent.isHiggins ? (
                  <HigginsAvatar size={44} />
                ) : (
                  <View style={[s.agentAvatar, { backgroundColor: agent.colorDim, borderColor: agent.color + "55" }]}>
                    <Text style={[s.agentAvatarText, { color: agent.color }]}>
                      {agent.name[0]}
                    </Text>
                  </View>
                )}
              </View>
              <View style={s.agentInfo}>
                <View style={s.agentNameRow}>
                  <Text style={s.agentName}>{agent.name}</Text>
                  <View style={[
                    s.statusTag,
                    { backgroundColor: agent.status === "active" ? C.greenDim : "rgba(90,100,114,0.15)" },
                  ]}>
                    <View style={[
                      s.statusDot,
                      { backgroundColor: agent.status === "active" ? C.green : C.muted },
                    ]} />
                    <Text style={[
                      s.statusText,
                      { color: agent.status === "active" ? C.green : C.muted },
                    ]}>
                      {agent.status === "active" ? "Actief" : "Inactief"}
                    </Text>
                  </View>
                </View>
                <Text style={[s.agentRole, { color: agent.color }]}>{agent.role}</Text>
                <Text style={s.agentTask} numberOfLines={1}>{agent.task}</Text>
                <Text style={s.agentLastActive}>{agent.lastActive}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Activiteiten log ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Activiteiten vandaag</Text>
          <View style={s.logCard}>
            {ACTIVITY_LOG.map((item, index) => (
              <View
                key={item.id}
                style={[s.logItem, index < ACTIVITY_LOG.length - 1 && s.logItemBorder]}
              >
                <View style={[s.logDot, { backgroundColor: item.color }]} />
                <View style={s.logContent}>
                  <View style={s.logHeader}>
                    <Text style={[s.logAgent, { color: item.color }]}>{item.agent}</Text>
                    <Text style={s.logTime}>{item.time}</Text>
                  </View>
                  <Text style={s.logAction}>{item.action}</Text>
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
const s = StyleSheet.create({
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  headerLabel: {
    fontSize: 10, color: C.muted, fontFamily: FONT,
    letterSpacing: 2, textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 28, fontWeight: "800", color: C.text,
    fontFamily: FONT_BOLD, letterSpacing: -0.5, marginTop: 4,
  },
  activeBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.greenDim, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,212,160,0.3)", gap: 6,
  },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  activeText: { fontSize: 11, color: C.green, fontWeight: "700", fontFamily: FONT, letterSpacing: 0.5 },
  subtitle: {
    fontSize: 12, color: C.muted, paddingHorizontal: 20,
    marginBottom: 20, lineHeight: 17, fontFamily: FONT,
  },

  agentList: { paddingHorizontal: 20, gap: 10, marginBottom: 28 },
  agentCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  agentLeft: {},
  agentAvatar: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  agentAvatarText: { fontSize: 18, fontWeight: "800", fontFamily: FONT_BOLD },
  agentInfo: { flex: 1, gap: 3 },
  agentNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  agentName: { fontSize: 14, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD },
  statusTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700", fontFamily: FONT_BOLD },
  agentRole: { fontSize: 11, fontWeight: "600", fontFamily: FONT, letterSpacing: 0.3 },
  agentTask: { fontSize: 12, color: C.muted, fontFamily: FONT },
  agentLastActive: { fontSize: 10, color: "rgba(90,100,114,0.7)", fontFamily: FONT },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 16, fontWeight: "800", color: C.text,
    fontFamily: FONT_BOLD, letterSpacing: -0.2, marginBottom: 12,
  },
  logCard: {
    backgroundColor: C.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border,
  },
  logItem: { flexDirection: "row", gap: 12, paddingVertical: 12 },
  logItemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  logDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  logContent: { flex: 1, gap: 3 },
  logHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logAgent: { fontSize: 12, fontWeight: "800", fontFamily: FONT_BOLD },
  logTime: { fontSize: 10, color: C.muted, fontFamily: FONT },
  logAction: { fontSize: 13, color: C.text, lineHeight: 18, fontFamily: FONT, opacity: 0.85 },
});
