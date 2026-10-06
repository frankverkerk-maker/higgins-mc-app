import { useCallback, useMemo, useState } from "react";
import { Text, View, ScrollView, StyleSheet, Platform, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useLanguage } from "@/lib/language-provider";
import { useEdition } from "@/lib/edition-provider";
import { useTeamFeed } from "@/lib/team-feed";
import { projectTower } from "@/lib/tower-directory";
import { trpc } from "@/lib/trpc";

const FLOOR_COLORS: Record<string, string> = {
  executive: "#FFD700", "einstein-lab": "#A855F7", finance: "#22C55E",
  technology: "#3B82F6", marketing: "#F97316", enterprise: "#06B6D4",
  fmc: "#EC4899", jlc: "#8B5CF6", mtd: "#EF4444", uta: "#DC2626",
  "task-force-ghost": "#6B7280",
};

export default function TowerScreen() {
  const { t } = useLanguage();
  const { edition } = useEdition();
  const router = useRouter();
  const [expandedFloor, setExpandedFloor] = useState<number | null>(null);
  const { team, departments, source, loading, refresh } = useTeamFeed(edition);
  // The MC building API groups departments within three real floors. It is
  // not an 11-row floor table; normalize it in the pure projectTower adapter.
  const buildingQuery = trpc.higgins.getBuilding.useQuery(
    {}, { staleTime: 60_000, refetchInterval: 60_000 },
  );
  const projection = useMemo(() => projectTower(
    buildingQuery.data, team, departments, edition, source === "live",
  ), [buildingQuery.data, team, departments, edition, source]);
  const live = source === "live" && projection.fromBuilding && !buildingQuery.isError;
  const sourceLabel = live ? t.tower.sourceLive : source === "stale"
    ? t.tower.sourceStale : source === "live" ? t.tower.sourceMixed : t.tower.sourceBuiltin;

  const toggleFloor = useCallback((number: number) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedFloor(previous => previous === number ? null : number);
  }, []);

  const requestThroughHiggins = useCallback((label: string) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/(tabs)/chat", params: {
      prefill: `${t.tower.commandPrefix} ${label}: `,
    } });
  }, [router, t]);

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={styles.towerIcon}>🏢</Text>
          <Text style={styles.title}>{t.tower.title}</Text>
          <Text style={styles.subtitle}>
            {projection.floors.length} {t.tower.subtitle} · {projection.totalAgents} {t.tower.agents} · {projection.departmentCount} {t.tower.departments}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.agents.refreshTeam}
            onPress={() => { refresh(); void buildingQuery.refetch(); }}
            style={styles.sourceRow}
          >
            <View style={[styles.sourceDot, { backgroundColor: live ? "#22C55E" : source === "stale" ? "#F59E0B" : "#9BA1A6" }]} />
            <Text style={styles.sourceText}>{sourceLabel} ↻</Text>
            {(loading || buildingQuery.isLoading) && <ActivityIndicator size="small" color="#00D4D4" style={{ marginLeft: 8 }} />}
          </Pressable>
        </View>

        <View style={styles.towerContainer}>
          {projection.floors.map(floor => {
            const expanded = expandedFloor === floor.number;
            const color = FLOOR_COLORS[floor.departments[0]?.id] ?? "#5A6472";
            return (
              <Pressable
                key={floor.number}
                onPress={() => toggleFloor(floor.number)}
                onLongPress={() => requestThroughHiggins(floor.label)}
                delayLongPress={500}
                style={({ pressed }) => [styles.floorCard, floor.restricted && styles.floorRestricted,
                  expanded && styles.floorExpanded, pressed && { opacity: 0.8 }]}
              >
                <View style={[styles.floorBar, { backgroundColor: color }]} />
                <View style={styles.floorContent}>
                  <View style={styles.floorHeader}>
                    <View style={styles.floorNumberBadge}>
                      <Text style={styles.floorNumberText}>{floor.number > 0 ? floor.number : floor.number < 0 ? `B${Math.abs(floor.number)}` : "0"}</Text>
                    </View>
                    <View style={styles.floorInfo}>
                      <Text style={styles.floorName}>{floor.label}</Text>
                      <Text style={styles.floorDesc} numberOfLines={2}>
                        {floor.departments.map(group => group.name).join(" · ")}
                      </Text>
                    </View>
                    {floor.restricted && <Text style={styles.restrictedText}>🔒</Text>}
                    <View style={styles.statusColumn}>
                      {live && floor.activeCount > 0 && (
                        <View style={styles.activeRow}>
                          <View style={styles.activeDot} />
                          <Text style={styles.activeCountText}>{floor.activeCount}</Text>
                        </View>
                      )}
                      <Text style={[styles.agentCount, { color }]}>{floor.totalAgents}</Text>
                    </View>
                  </View>
                  {expanded && (
                    <View style={styles.agentList}>
                      {floor.departments.map(group => (
                        <View key={group.id} style={styles.departmentGroup}>
                          <View style={styles.departmentHeader}>
                            <Text style={[styles.departmentTitle, { color: FLOOR_COLORS[group.id] ?? "#ECEDEE" }]}>
                              {group.name} · {group.agents.length}
                            </Text>
                            {group.classified && <Text style={styles.classifiedTag}>CLASSIFIED</Text>}
                          </View>
                          {group.agents.map(agent => (
                            <View key={`${group.id}:${agent.name}`} style={styles.agentRow}>
                              <View style={[styles.agentDot, { backgroundColor: live && agent.status === "active" ? "#22C55E" : "#4A5568" }]} />
                              <Text style={styles.agentName}>{agent.name}</Text>
                              <Text style={styles.agentRole} numberOfLines={1}>
                                {live && agent.currentTask ? agent.currentTask : agent.role}
                              </Text>
                              {agent.name === group.head && (
                                <View style={[styles.headBadge, { borderColor: FLOOR_COLORS[group.id] ?? "#5A6472" }]}>
                                  <Text style={styles.headText}>HEAD</Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      ))}
                      <Text style={styles.longPressHint}>{t.tower.longPressHint}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} /><Text style={styles.legendText}>{t.tower.legendPublic}</Text></View>
          {edition === "internal" && <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} /><Text style={styles.legendText}>{t.tower.legendClassified}</Text></View>}
          <View style={styles.legendRow}><View style={styles.activeDot} /><Text style={styles.legendText}> = {t.agents.statusActive}</Text></View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", paddingTop: 24, paddingBottom: 16, paddingHorizontal: 20 },
  towerIcon: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#ECEDEE", fontFamily: Platform.OS === "ios" ? "Avenir-Heavy" : undefined },
  subtitle: { fontSize: 14, color: "#9BA1A6", marginTop: 4, textAlign: "center" },
  sourceRow: { flexDirection: "row", alignItems: "center", marginTop: 8, padding: 6 },
  sourceDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  sourceText: { fontSize: 11, color: "#9BA1A6" },
  towerContainer: { paddingHorizontal: 16, gap: 6 },
  floorCard: { flexDirection: "row", backgroundColor: "#1A1D21", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#2A2D32" },
  floorRestricted: { borderColor: "#3D1F1F", backgroundColor: "#1A1518" },
  floorExpanded: { borderColor: "#3A3D42" },
  floorBar: { width: 4 },
  floorContent: { flex: 1, padding: 14 },
  floorHeader: { flexDirection: "row", alignItems: "center" },
  floorNumberBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#252830", alignItems: "center", justifyContent: "center", marginRight: 12 },
  floorNumberText: { fontSize: 13, fontWeight: "700", color: "#ECEDEE" },
  floorInfo: { flex: 1 },
  floorName: { fontSize: 15, fontWeight: "600", color: "#ECEDEE" },
  floorDesc: { fontSize: 12, color: "#9BA1A6", marginTop: 2 },
  restrictedText: { fontSize: 14, marginRight: 8 },
  statusColumn: { alignItems: "flex-end", justifyContent: "center", minWidth: 36 },
  activeRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  activeDot: { width: 7, height: 7, borderRadius: 4, marginRight: 4, backgroundColor: "#22C55E" },
  activeCountText: { fontSize: 11, fontWeight: "600", color: "#22C55E" },
  agentCount: { fontSize: 18, fontWeight: "700" },
  agentList: { marginTop: 12 },
  departmentGroup: { borderTopWidth: 1, borderTopColor: "#2A2D32", paddingTop: 9, paddingBottom: 6 },
  departmentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  departmentTitle: { fontSize: 13, fontWeight: "700" },
  classifiedTag: { fontSize: 9, fontWeight: "700", color: "#EF4444" },
  agentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  agentDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  agentName: { fontSize: 14, fontWeight: "500", color: "#ECEDEE", marginRight: 8 },
  agentRole: { fontSize: 12, color: "#9BA1A6", flex: 1 },
  headBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  headText: { fontSize: 9, fontWeight: "700", color: "#ECEDEE" },
  longPressHint: { fontSize: 11, color: "#687076", fontStyle: "italic", marginTop: 10, textAlign: "center" },
  legend: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendText: { fontSize: 12, color: "#9BA1A6" },
});
