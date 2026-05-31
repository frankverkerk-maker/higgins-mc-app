import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { useColors } from "@/hooks/use-colors";

const AGENTS = [
  {
    id: "higgins",
    name: "Higgins",
    role: "Chief AI Officer",
    description: "Centrale orchestrator en primaire gesprekspartner. Coördineert alle agents.",
    status: "active",
    color: "#14B8A6",
    tasks: 12,
  },
  {
    id: "elena",
    name: "Elena",
    role: "Executive Assistant",
    description: "Beheert agenda, e-mail en communicatie. Proactief en gedetailleerd.",
    status: "active",
    color: "#8B5CF6",
    tasks: 7,
  },
  {
    id: "justitia",
    name: "Justitia",
    role: "Legal Advisor",
    description: "Juridische analyse, contracten en compliance vraagstukken.",
    status: "idle",
    color: "#F59E0B",
    tasks: 2,
  },
  {
    id: "warren",
    name: "Warren",
    role: "Finance Analyst",
    description: "Financiële analyse, rapportages en portfolio monitoring.",
    status: "idle",
    color: "#10B981",
    tasks: 4,
  },
  {
    id: "marketing",
    name: "Aria",
    role: "Marketing Specialist",
    description: "Content strategie, campagnes en marktanalyse.",
    status: "idle",
    color: "#EC4899",
    tasks: 1,
  },
  {
    id: "medical",
    name: "Medicus",
    role: "Medical Advisor",
    description: "Medische informatie en gezondheidsadvies voor Swiss Vitality Clinics.",
    status: "idle",
    color: "#3B82F6",
    tasks: 0,
  },
];

export default function AgentsScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const activeCount = AGENTS.filter((a) => a.status === "active").length;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Agent Team</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeCount} actief</Text>
        </View>
      </View>

      <FlatList
        data={AGENTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.cardTop}>
              {item.id === "higgins" ? (
                <HigginsAvatar size={48} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: item.color + "22", borderColor: item.color + "55" }]}>
                  <Text style={[styles.avatarText, { color: item.color }]}>
                    {item.name[0]}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.agentName}>{item.name}</Text>
                  <View style={[
                    styles.statusPill,
                    { backgroundColor: item.status === "active" ? "#34D39922" : colors.border }
                  ]}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: item.status === "active" ? "#34D399" : colors.muted }
                    ]} />
                    <Text style={[
                      styles.statusText,
                      { color: item.status === "active" ? "#34D399" : colors.muted }
                    ]}>
                      {item.status === "active" ? "Actief" : "Inactief"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.agentRole}>{item.role}</Text>
              </View>
            </View>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.taskCount}>{item.tasks} taken uitgevoerd</Text>
              <Text style={[styles.detailLink, { color: item.color }]}>Details ›</Text>
            </View>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    badge: {
      backgroundColor: colors.primary + "22",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + "44",
    },
    badgeText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "600",
    },
    list: {
      padding: 16,
      gap: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 20,
      fontWeight: "700",
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    agentName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
    },
    agentRole: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "600",
    },
    description: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    taskCount: {
      fontSize: 12,
      color: colors.muted,
    },
    detailLink: {
      fontSize: 13,
      fontWeight: "600",
    },
  });
}
