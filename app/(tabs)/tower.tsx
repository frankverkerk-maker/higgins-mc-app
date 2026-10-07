import { useCallback, useMemo, useState } from "react";
import { Text, View, ScrollView, StyleSheet, Platform, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { TowerFloorCard } from "@/components/tower-floor-card";
import { ScreenContainer } from "@/components/screen-container";
import { useLanguage } from "@/lib/language-provider";
import { useEdition } from "@/lib/edition-provider";
import { useTeamFeed } from "@/lib/team-feed";
import { projectTower } from "@/lib/tower-directory";

export default function TowerScreen() {
  const { t } = useLanguage();
  const { edition } = useEdition();
  const router = useRouter();
  const [expandedFloor, setExpandedFloor] = useState<number | null>(null);
  const { team, departments, source, loading, refresh } = useTeamFeed(edition);
  const projection = useMemo(() => projectTower(
    team, departments, edition, source === "live", t.tower.otherDepartments,
  ), [team, departments, edition, source, t.tower.otherDepartments]);
  const live = source === "live";
  const sourceLabel = live ? t.tower.sourceLive : source === "stale"
    ? t.tower.sourceStale : t.tower.sourceBuiltin;

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.towerIcon}>🏢</Text>
          <Text style={styles.title}>{t.tower.title}</Text>
          <Text style={styles.subtitle}>
            {projection.floors.length} {t.tower.subtitle} · {projection.totalAgents} {t.tower.agents} · {projection.departmentCount} {t.tower.departments}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.agents.refreshTeam}
            onPress={refresh}
            style={styles.sourceRow}
          >
            <View style={[styles.sourceDot, { backgroundColor: live ? "#22C55E" : source === "stale" ? "#F59E0B" : "#9BA1A6" }]} />
            <Text style={styles.sourceText}>{sourceLabel} ↻</Text>
            {loading && <ActivityIndicator size="small" color="#00D4D4" style={styles.loading} />}
          </Pressable>
        </View>

        <View style={styles.towerContainer}>
          {projection.floors.map(floor => (
            <TowerFloorCard
              key={floor.number}
              floor={floor}
              expanded={expandedFloor === floor.number}
              live={live}
              agentLabel={t.tower.agents}
              longPressHint={t.tower.longPressHint}
              onToggle={toggleFloor}
              onLongPress={requestThroughHiggins}
            />
          ))}
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
  scrollContent: { paddingBottom: 100 },
  header: { alignItems: "center", paddingTop: 24, paddingBottom: 16, paddingHorizontal: 20 },
  towerIcon: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#ECEDEE", fontFamily: Platform.OS === "ios" ? "Avenir-Heavy" : undefined },
  subtitle: { fontSize: 14, color: "#9BA1A6", marginTop: 4, textAlign: "center" },
  sourceRow: { flexDirection: "row", alignItems: "center", marginTop: 8, padding: 6 },
  sourceDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  sourceText: { fontSize: 11, color: "#9BA1A6" },
  loading: { marginLeft: 8 },
  towerContainer: { paddingHorizontal: 16, gap: 8 },
  legend: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  activeDot: { width: 7, height: 7, borderRadius: 4, marginRight: 4, backgroundColor: "#22C55E" },
  legendText: { fontSize: 12, color: "#9BA1A6" },
});
