import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { useColors } from "@/hooks/use-colors";
import { StyleSheet } from "react-native";

const AGENTS = [
  { id: "higgins", name: "Higgins", role: "Chief of Staff & Butler", status: "active", color: "#14B8A6" },
  { id: "elena", name: "Elena", role: "Executive Assistant", status: "active", color: "#8B5CF6" },
  { id: "legal", name: "Justitia", role: "Legal Advisor", status: "idle", color: "#F59E0B" },
  { id: "finance", name: "Warren", role: "Finance Analyst", status: "idle", color: "#10B981" },
];

const RECENT_ACTIVITY = [
  { id: "1", agent: "Higgins", action: "Rapport gegenereerd: Q2 Analyse", time: "2 min geleden" },
  { id: "2", agent: "Elena", action: "E-mail verstuurd naar 3 contacten", time: "18 min geleden" },
  { id: "3", agent: "Warren", action: "Portfolio update verwerkt", time: "1 uur geleden" },
];

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const styles = makeStyles(colors);

  const activeAgents = AGENTS.filter((a) => a.status === "active").length;

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Goedemiddag</Text>
            <Text style={styles.title}>Mission Control</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.statNumber}>{activeAgents}</Text>
            <Text style={styles.statLabel}>Actieve Agents</Text>
          </View>
          <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Taken Vandaag</Text>
          </View>
        </View>

        {/* Quick Action */}
        <Pressable
          style={({ pressed }) => [styles.chatCta, pressed && { opacity: 0.85 }]}
          onPress={() => router.push("/chat")}
        >
          <View style={styles.chatCtaContent}>
            <HigginsAvatar size={40} style={{ marginRight: 0 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.chatCtaTitle}>Spreek met Higgins</Text>
              <Text style={styles.chatCtaSubtitle}>Stel een vraag of geef een opdracht</Text>
            </View>
            <Text style={styles.chatCtaArrow}>›</Text>
          </View>
        </Pressable>

        {/* Agent Team */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Agent Team</Text>
            <Pressable onPress={() => router.push("/agents")}>
              <Text style={styles.sectionLink}>Alles zien</Text>
            </Pressable>
          </View>
          <View style={styles.agentGrid}>
            {AGENTS.map((agent) => (
              <Pressable
                key={agent.id}
                style={({ pressed }) => [styles.agentCard, pressed && { opacity: 0.8 }]}
                onPress={() => router.push("/agents")}
              >
                {agent.id === "higgins" ? (
                  <HigginsAvatar size={44} style={{ marginBottom: 8 }} />
                ) : (
                  <View style={[styles.agentAvatar, { backgroundColor: agent.color + "22", borderColor: agent.color + "44" }]}>
                    <Text style={[styles.agentAvatarText, { color: agent.color }]}>
                      {agent.name[0]}
                    </Text>
                  </View>
                )}
                <Text style={styles.agentName}>{agent.name}</Text>
                <Text style={styles.agentRole} numberOfLines={1}>{agent.role}</Text>
                <View style={styles.agentStatusRow}>
                  <View style={[styles.agentStatusDot, { backgroundColor: agent.status === "active" ? "#34D399" : "#94A3B8" }]} />
                  <Text style={[styles.agentStatusText, { color: agent.status === "active" ? "#34D399" : "#94A3B8" }]}>
                    {agent.status === "active" ? "Actief" : "Inactief"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recente Activiteit</Text>
          <View style={styles.activityList}>
            {RECENT_ACTIVITY.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityAction}>{item.action}</Text>
                  <Text style={styles.activityMeta}>{item.agent} · {item.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

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
    greeting: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: "400",
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      marginTop: 2,
      letterSpacing: -0.5,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#34D399",
    },
    statusText: {
      fontSize: 12,
      color: "#34D399",
      fontWeight: "600",
    },
    statsRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    statCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    statNumber: {
      fontSize: 32,
      fontWeight: "700",
      color: colors.primary,
      letterSpacing: -1,
    },
    statLabel: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
      fontWeight: "500",
    },
    chatCta: {
      marginHorizontal: 20,
      marginBottom: 24,
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 16,
    },
    chatCtaContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    chatCtaIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    chatCtaIconText: {
      fontSize: 20,
      fontWeight: "700",
      color: "#fff",
    },
    chatCtaTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fff",
    },
    chatCtaSubtitle: {
      fontSize: 12,
      color: "rgba(255,255,255,0.75)",
      marginTop: 2,
    },
    chatCtaArrow: {
      fontSize: 24,
      color: "rgba(255,255,255,0.7)",
      fontWeight: "300",
    },
    section: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.foreground,
      letterSpacing: -0.3,
    },
    sectionLink: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "500",
    },
    agentGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    agentCard: {
      width: "47%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    agentAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    agentAvatarText: {
      fontSize: 18,
      fontWeight: "700",
    },
    agentName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.foreground,
    },
    agentRole: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
      textAlign: "center",
    },
    agentStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 6,
    },
    agentStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    agentStatusText: {
      fontSize: 11,
      fontWeight: "500",
    },
    activityList: {
      gap: 12,
      marginTop: 4,
    },
    activityItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginTop: 4,
    },
    activityAction: {
      fontSize: 13,
      color: colors.foreground,
      fontWeight: "500",
      lineHeight: 18,
    },
    activityMeta: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 3,
    },
  });
}
