import { View, Text, ScrollView, StyleSheet, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { TEAM } from "@/constants/team";

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
};

// Initiaal voor agent avatar
function agentInitial(name: string) {
  return name.replace("Dr. ", "").charAt(0).toUpperCase();
}

// Gesimuleerde activiteit per agent (in productie: live data van Hermes)
const ACTIVITY: Record<string, { status: "active" | "idle" | "busy"; task: string }> = {
  "Higgins":  { status: "active", task: "Briefing voorbereiden" },
  "Elena":    { status: "active", task: "E-mails verwerken" },
  "Gary":     { status: "busy",   task: "Campagne analyse" },
  "Elon":     { status: "idle",   task: "Wacht op opdracht" },
  "Warren":   { status: "busy",   task: "Q2 rapport opstellen" },
  "Justitia": { status: "idle",   task: "Wacht op opdracht" },
};

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
  "Justitia Legal Council",
  "Enterprise",
];

export default function TeamPulseScreen() {
  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerLabel}>LIVE OVERZICHT</Text>
          <Text style={s.headerTitle}>Team Pulse</Text>
          <Text style={s.headerSub}>36 Agents · 7 Departementen</Text>
        </View>

        {/* ── Live activiteit (kernteam) ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Actief nu</Text>
          <View style={s.card}>
            {["Higgins", "Elena", "Gary", "Warren"].map((name, i) => {
              const act = ACTIVITY[name] ?? { status: "idle", task: "Wacht op opdracht" };
              const agent = TEAM.find(a => a.name === name)!;
              const isHiggins = name === "Higgins";
              return (
                <View key={name} style={[s.pulseRow, i > 0 && s.rowBorder]}>
                  <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[act.status] }]} />
                  {isHiggins
                    ? <HigginsAvatar size={36} />
                    : (
                      <View style={[s.agentAvatar, { backgroundColor: DEPT_COLORS[agent.department]?.bg ?? C.surface2 }]}>
                        <Text style={[s.agentAvatarText, { color: DEPT_COLORS[agent.department]?.text ?? C.muted }]}>
                          {agentInitial(name)}
                        </Text>
                      </View>
                    )
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={s.agentName}>{name}</Text>
                    <Text style={s.agentTask}>{act.task}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[act.status] + "22" }]}>
                    <Text style={[s.statusBadgeText, { color: STATUS_COLORS[act.status] }]}>
                      {act.status === "active" ? "Actief" : act.status === "busy" ? "Bezig" : "Inactief"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Alle departementen ── */}
        {DEPARTMENTS.map(dept => {
          const agents = TEAM.filter(a => a.department === dept);
          const colors = DEPT_COLORS[dept] ?? { bg: C.surface2, text: C.muted };
          const isAddOn = agents[0]?.isAddOn;
          return (
            <View key={dept} style={s.section}>
              <View style={s.deptHeader}>
                <Text style={s.sectionTitle}>{dept.toUpperCase()}</Text>
                {isAddOn && (
                  <View style={s.addOnBadge}>
                    <Text style={s.addOnText}>ADD-ON</Text>
                  </View>
                )}
              </View>
              <View style={s.card}>
                {agents.map((agent, i) => {
                  const isHiggins = agent.name === "Higgins";
                  return (
                    <View key={agent.name} style={[s.agentRow, i > 0 && s.rowBorder]}>
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
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerLabel: { fontSize: 10, color: C.muted, fontFamily: FONT, letterSpacing: 2, textTransform: "uppercase" },
  headerTitle: { fontSize: 28, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD, letterSpacing: -0.5, marginTop: 4 },
  headerSub: { fontSize: 13, color: C.cyan, fontFamily: FONT, marginTop: 4, letterSpacing: 0.5 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  deptHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: "700", color: C.muted, fontFamily: FONT_BOLD, textTransform: "uppercase", letterSpacing: 2 },
  addOnBadge: { backgroundColor: C.amberDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: C.amber + "44" },
  addOnText: { fontSize: 9, color: C.amber, fontWeight: "700", fontFamily: FONT_BOLD, letterSpacing: 1 },

  card: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.border },

  // Pulse rijen (actief nu)
  pulseRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  agentTask: { fontSize: 11, color: C.muted, fontFamily: FONT, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", fontFamily: FONT_BOLD },

  // Agent rijen (departement overzicht)
  agentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  agentAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  agentAvatarText: { fontSize: 15, fontWeight: "800", fontFamily: FONT_BOLD },
  agentName: { fontSize: 14, fontWeight: "700", color: C.text, fontFamily: FONT_BOLD },
  agentRole: { fontSize: 11, color: C.muted, fontFamily: FONT, marginTop: 2 },
});
