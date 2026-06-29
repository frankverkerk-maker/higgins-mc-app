import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from "react-native";
import { useState, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AppBackground } from "@/components/app-background";
import { TEAM } from "@/constants/team";
import { useLanguage } from "@/lib/language-provider";
import { trpc } from "@/lib/trpc";

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
  amberDim:   "rgba(245,166,35,0.12)",
  purple:     "#A78BFA",
  purpleDim:  "rgba(167,139,250,0.12)",
};
const FONT      = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

// Departement kleur mapping
const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  "Orchestrators":          { bg: C.cyanDim,   text: C.cyan },
  "Marketing Command":      { bg: "rgba(251,191,36,0.12)", text: "#FBBF24" },
  "Team Elon — IT":         { bg: C.purpleDim, text: C.purple },
  "Revenue":                { bg: C.greenDim,  text: C.green },
  "Specialists":            { bg: "rgba(249,115,22,0.12)", text: "#FB923C" },
  "Justitia Legal Council": { bg: "rgba(239,68,68,0.12)",  text: "#F87171" },
  "Enterprise":             { bg: "rgba(99,102,241,0.12)", text: "#818CF8" },
  "Web Solutions":          { bg: "rgba(56,189,248,0.12)", text: "#38BDF8" },
  "Einstein Research Lab":  { bg: "rgba(52,211,153,0.12)", text: "#34D399" },
  // Classified — rood/donker accent
  "Task Force Ghost":       { bg: "rgba(239,68,68,0.10)",  text: "#FF6B6B" },
  "Ultratrust Agency (UTA)":{ bg: "rgba(239,68,68,0.10)",  text: "#FF6B6B" },
  "WTD":                    { bg: "rgba(239,68,68,0.10)",  text: "#FF6B6B" },
};

// Initiaal voor agent avatar
function agentInitial(name: string) {
  return name.replace("Dr. ", "").charAt(0).toUpperCase();
}

// Mock activiteit als fallback (taken worden vertaald via buildMockActivity)
type ActivityMap = Record<string, { status: "active" | "idle" | "busy"; task: string }>;
function buildMockActivity(t: any): ActivityMap {
  return {
    "Higgins":  { status: "active", task: t.dashboard.taskPrepBriefing },
    "Elena":    { status: "active", task: t.dashboard.taskProcessEmails },
    "Gary":     { status: "busy",   task: t.dashboard.qcSendReport },
    "Elon":     { status: "idle",   task: t.dashboard.taskAwaitingOrder },
    "Warren":   { status: "busy",   task: t.dashboard.prio1 },
    "Justitia": { status: "idle",   task: t.dashboard.taskAwaitingOrder },
  };
}

const STATUS_COLORS = {
  active: C.green,
  busy:   C.amber,
  idle:   C.muted,
};

// Groepeer team per departement
const DEPARTMENTS = [
  "Orchestrators",
  "Marketing Command",
  "Team Elon — IT",
  "Revenue",
  "Specialists",
  "Web Solutions",
  "Einstein Research Lab",
  "Justitia Legal Council",
  "Enterprise",
  // Classified — altijd onderaan
  "Task Force Ghost",
  "Ultratrust Agency (UTA)",
  "WTD",
];

function haptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") {
    try { Haptics.impactAsync(style); } catch (_) {}
  }
}

export default function TeamPulseScreen() {
  const { t } = useLanguage();
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityMap>(() => buildMockActivity(t));

  // Live agent status from server
  const agentStatusQuery = trpc.higgins.getAgentStatus.useQuery(
    {},
    { staleTime: 15 * 1000, refetchInterval: 15 * 1000 }
  );

  // Update activity when server data changes
  useEffect(() => {
    if (agentStatusQuery.data) {
      const typedData = agentStatusQuery.data as Record<string, { status: "active" | "idle" | "busy"; task: string }>;
      setActivity(typedData);
    }
  }, [agentStatusQuery.data]);

  // Houd fallback-taken in sync met de gekozen taal zolang er geen live data is
  useEffect(() => {
    if (!agentStatusQuery.data) setActivity(buildMockActivity(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, agentStatusQuery.data]);

  const handleAgentPress = (name: string) => {
    haptic(Haptics.ImpactFeedbackStyle.Light);
    setExpandedAgent(prev => prev === name ? null : name);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <AppBackground>
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerLabel}>{t.agents.subtitle.toUpperCase()}</Text>
            <Text style={s.headerTitle}>{t.agents.title}</Text>
            <Text style={s.headerSub}>{TEAM.length} {t.agents.activeAgents} · {DEPARTMENTS.length} {t.agents.departmentsPlural}</Text>
          </View>
          <LanguageSwitcher />
        </View>

        {/* ── Live activiteit (kernteam) ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.agents.statusActive}</Text>
          <View style={s.card}>
            {["Higgins", "Elena", "Gary", "Warren"].map((name, i) => {
              const act = activity[name] ?? { status: "idle", task: "Wacht op opdracht" };
              const agent = TEAM.find(a => a.name === name)!;
              const isHiggins = name === "Higgins";
              const isExpanded = expandedAgent === name;
              return (
                <Pressable
                  key={name}
                  style={({ pressed }) => [s.pulseRow, i > 0 && s.rowBorder, pressed && { opacity: 0.75 }]}
                  onPress={() => handleAgentPress(name)}
                >
                  <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[act.status] }]} />
                  {isHiggins
                    ? <HigginsAvatar size={36} />
                    : (
                      <View style={[s.agentAvatar, { backgroundColor: DEPT_COLORS[agent?.department ?? ""]?.bg ?? C.surface2 }]}>
                        <Text style={[s.agentAvatarText, { color: DEPT_COLORS[agent?.department ?? ""]?.text ?? C.muted }]}>
                          {agentInitial(name)}
                        </Text>
                      </View>
                    )
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={s.agentName}>{name}</Text>
                    <Text style={s.agentTask}>{act.task}</Text>
                    {isExpanded && agent && (
                      <Text style={[s.agentTask, { color: C.cyan, marginTop: 4 }]}>{agent.role}</Text>
                    )}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[act.status] + "22" }]}>
                    <Text style={[s.statusBadgeText, { color: STATUS_COLORS[act.status] }]}>
                      {act.status === "active" ? t.agents.statusActive : act.status === "busy" ? t.agents.statusBusy : t.agents.statusStandby}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Alle departementen ── */}
        {DEPARTMENTS.map(dept => {
          const agents = TEAM.filter(a => a.department === dept);
          const colors = DEPT_COLORS[dept] ?? { bg: C.surface2, text: C.muted };
          const isAddOn = agents[0]?.isAddOn;
          const isClassified = agents[0]?.isClassified;
          return (
            <View key={dept} style={s.section}>
              <View style={s.deptHeader}>
                <Text style={[s.sectionTitle, isClassified && { color: "#FF6B6B" }]}>{dept.toUpperCase()}</Text>
                {isAddOn && (
                  <View style={s.addOnBadge}>
                    <Text style={s.addOnText}>ADD-ON</Text>
                  </View>
                )}
                {isClassified && (
                  <View style={s.classifiedBadge}>
                    <Text style={s.classifiedText}>CLASSIFIED</Text>
                  </View>
                )}
              </View>
              <View style={s.card}>
                {agents.map((agent, i) => {
                  const isHiggins = agent.name === "Higgins";
                  const isExpanded = expandedAgent === agent.name;
                  return (
                    <Pressable
                      key={agent.name}
                      style={({ pressed }) => [s.agentRow, i > 0 && s.rowBorder, pressed && { opacity: 0.75 }]}
                      onPress={() => handleAgentPress(agent.name)}
                    >
                      {isHiggins
                        ? <HigginsAvatar size={38} />
                        : (
                          <View style={[s.agentAvatar, { backgroundColor: colors.bg }]}>
                            <Text style={[s.agentAvatarText, { color: colors.text }]}>
                              {agentInitial(agent.name)}
                            </Text>
                          </View>
                        )
                      }
                      <View style={{ flex: 1 }}>
                        <Text style={s.agentName}>{agent.name}</Text>
                        <Text style={s.agentRole}>{agent.role}</Text>
                        {isExpanded && activity[agent.name] && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                            <View style={[s.statusDotSmall, { backgroundColor: STATUS_COLORS[activity[agent.name].status] }]} />
                            <Text style={[s.agentTask, { color: STATUS_COLORS[activity[agent.name].status] }]}>
                              {activity[agent.name].task}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.chevron}>›</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
      </AppBackground>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerLabel: { fontSize: 10, color: C.muted, fontFamily: FONT, letterSpacing: 2, textTransform: "uppercase" },
  headerTitle: { fontSize: 28, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD, letterSpacing: -0.5, marginTop: 4 },
  headerSub: { fontSize: 13, color: C.cyan, fontFamily: FONT, marginTop: 4, letterSpacing: 0.5 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  deptHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: "700", color: C.muted, fontFamily: FONT_BOLD, textTransform: "uppercase", letterSpacing: 2 },
  addOnBadge: { backgroundColor: C.amberDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: C.amber + "44" },
  addOnText: { fontSize: 9, color: C.amber, fontWeight: "700", fontFamily: FONT_BOLD, letterSpacing: 1 },
  classifiedBadge: { backgroundColor: "rgba(239,68,68,0.12)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,107,107,0.45)" },
  classifiedText: { fontSize: 9, color: "#FF6B6B", fontWeight: "700", fontFamily: FONT_BOLD, letterSpacing: 1 },

  card: {
    backgroundColor: "rgba(0,212,212,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.22)",
    overflow: "hidden",
    shadowColor: "#00D4D4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: "rgba(0,212,212,0.12)" },

  // Pulse rijen (actief nu)
  pulseRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  agentTask: { fontSize: 11, color: C.muted, fontFamily: FONT, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", fontFamily: FONT_BOLD },

  // Agent rijen (departement overzicht)
  agentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  agentAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  agentAvatarText: { fontSize: 15, fontWeight: "800", fontFamily: FONT_BOLD },
  agentName: { fontSize: 14, fontWeight: "700", color: C.text, fontFamily: FONT_BOLD },
  agentRole: { fontSize: 11, color: C.muted, fontFamily: FONT, marginTop: 2 },
  chevron: { fontSize: 18, color: C.muted, marginLeft: 4 },
});
