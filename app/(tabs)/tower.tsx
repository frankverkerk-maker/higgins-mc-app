import { useCallback, useState } from "react";
import { Text, View, ScrollView, StyleSheet, Platform, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";
import { useEdition } from "@/lib/edition-provider";
import { useTeamFeed } from "@/lib/team-feed";
import { getCanonicalAgentDisplayName } from "@/lib/team-pulse";
import { buildTowerFloors, formatTowerFloorNumber, getTowerAgentTotal, type TowerFloor } from "@/lib/tower-model";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

// ─── Types ──────────────────────────────────────────────────────────────────

const FLOOR_COLORS: Record<string, string> = {
  executive: "#FFD700",
  "einstein-lab": "#A855F7",
  finance: "#22C55E",
  technology: "#3B82F6",
  marketing: "#F97316",
  enterprise: "#06B6D4",
  fmc: "#EC4899",
  jlc: "#8B5CF6",
  mtd: "#EF4444",
  uta: "#DC2626",
  "task-force-ghost": "#6B7280",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function TowerScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { edition: fallbackEdition, isInternal } = useEdition();
  const router = useRouter();
  const [expandedFloor, setExpandedFloor] = useState<number | null>(null);
  const { team, departments, source, loading } = useTeamFeed(fallbackEdition);

  // Fetch live agent statuses
  const agentStatusQuery = trpc.higgins.getAgentStatus.useQuery(
    {},
    { staleTime: 15 * 1000, refetchInterval: 15 * 1000 }
  );

  const visibleFloors = buildTowerFloors(team, departments, isInternal);
  const isLive = source === "live";

  const toggleFloor = useCallback((floorNum: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpandedFloor(prev => prev === floorNum ? null : floorNum);
  }, []);

  // Long-press: navigate to Chat with pre-filled Higgins command about this department
  const handleLongPress = useCallback((floor: TowerFloor) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const prefix = t.tower?.commandPrefix || "Higgins, ik heb een opdracht voor de afdeling";
    const prefill = `${prefix} ${floor.floorName}: `;
    router.push({ pathname: "/(tabs)/chat", params: { prefill } });
  }, [t, router]);

  // Count active agents per department using live status data
  const getActiveCountForFloor = useCallback((floor: TowerFloor) => {
    if (!agentStatusQuery.data) return 0;
    const statuses = agentStatusQuery.data as Record<string, { status: string; task: string }>;
    return floor.agents.filter(a => statuses[a.name]?.status === "active").length;
  }, [agentStatusQuery.data]);

  const totalAgents = getTowerAgentTotal(visibleFloors);

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.towerIcon}>🏢</Text>
          <Text style={styles.title}>{t.tower?.title || "Higgins Tower"}</Text>
          <Text style={styles.subtitle}>
            {visibleFloors.length} {t.tower?.subtitle || "verdiepingen"} · {totalAgents} {t.tower?.agents || "agenten"} · {visibleFloors.length} {t.tower?.departments || "afdelingen"}
          </Text>
          {/* Source indicator */}
          <View style={styles.sourceRow}>
            <View style={[styles.sourceDot, { backgroundColor: isLive ? "#22C55E" : "#9BA1A6" }]} />
            <Text style={styles.sourceText}>
              {isLive ? (t.tower?.sourceLive || "Live via database") : (t.tower?.sourceBuiltin || "Ingebouwde lijst")}
            </Text>
            {loading && (
              <ActivityIndicator size="small" color="#00D4D4" style={{ marginLeft: 8 }} />
            )}
          </View>
        </View>

        {/* Tower visualization */}
        <View style={styles.towerContainer}>
          {visibleFloors.map((floor) => {
            const isExpanded = expandedFloor === floor.floorNumber;
            const floorColor = FLOOR_COLORS[floor.departmentId] || "#5A6472";
            const agents = floor.agents;
            const activeCount = getActiveCountForFloor(floor);
            const dept = departments.find(d => d.id === floor.departmentId);

            return (
              <Pressable
                key={floor.departmentId}
                onPress={() => toggleFloor(floor.floorNumber)}
                onLongPress={() => handleLongPress(floor)}
                delayLongPress={500}
                style={({ pressed }) => [
                  styles.floorCard,
                  floor.isRestricted && styles.floorRestricted,
                  isExpanded && styles.floorExpanded,
                  pressed && { opacity: 0.8 },
                ]}
              >
                {/* Floor indicator bar */}
                <View style={[styles.floorBar, { backgroundColor: floorColor }]} />

                {/* Floor content */}
                <View style={styles.floorContent}>
                  <View style={styles.floorHeader}>
                    <View style={styles.floorNumberBadge}>
                      <Text style={styles.floorNumberText}>
                        {formatTowerFloorNumber(floor.floorNumber)}
                      </Text>
                    </View>
                    <View style={styles.floorInfo}>
                      <Text style={styles.floorName}>{floor.floorName}</Text>
                      <Text style={styles.floorDesc}>{floor.description}</Text>
                    </View>
                    {floor.isRestricted && (
                      <View style={styles.restrictedBadge}>
                        <Text style={styles.restrictedText}>🔒</Text>
                      </View>
                    )}
                    {/* Agent status: active count dot */}
                    <View style={styles.statusColumn}>
                      {activeCount > 0 && (
                        <View style={styles.activeRow}>
                          <View style={[styles.activeDot, { backgroundColor: "#22C55E" }]} />
                          <Text style={styles.activeCountText}>{activeCount}</Text>
                        </View>
                      )}
                      <Text style={[styles.agentCount, { color: floorColor }]}>
                        {agents.length}
                      </Text>
                    </View>
                  </View>

                  {/* Expanded agent list */}
                  {isExpanded && (
                    <View style={styles.agentList}>
                      <View style={[styles.divider, { backgroundColor: floorColor + "40" }]} />
                      {agents.map((agent) => {
                        const statuses = (agentStatusQuery.data ?? {}) as Record<string, { status: string; task: string }>;
                        const agentStatus = statuses[agent.name];
                        const isActive = agentStatus?.status === "active";
                        return (
                          <View key={agent.name} style={styles.agentRow}>
                            <View style={[styles.agentDot, { backgroundColor: isActive ? "#22C55E" : "#4A5568" }]} />
                            <Text style={styles.agentName}>{getCanonicalAgentDisplayName(agent.name, agent.displayName)}</Text>
                            <Text style={styles.agentRole} numberOfLines={1}>
                              {isActive && agentStatus?.task ? agentStatus.task : agent.role}
                            </Text>
                            {(agent.name === dept?.head ||
                              getCanonicalAgentDisplayName(agent.name, agent.displayName) ===
                                getCanonicalAgentDisplayName(dept?.head ?? "")) && (
                              <View style={[styles.headBadge, { borderColor: floorColor }]}>
                                <Text style={[styles.headText, { color: floorColor }]}>HEAD</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                      {/* Long-press hint */}
                      <Text style={styles.longPressHint}>
                        {t.tower?.longPressHint || "Houd ingedrukt om Higgins een opdracht te geven over deze afdeling"}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.legendText}>{t.tower?.legendPublic || "Bovengronds (publiek)"}</Text>
          </View>
          {isInternal && (
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.legendText}>{t.tower?.legendClassified || "Basement (classified)"}</Text>
            </View>
          )}
          <View style={styles.legendRow}>
            <View style={[styles.activeDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.legendText}>= actieve agent(en)</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  towerIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ECEDEE",
    fontFamily: Platform.OS === "ios" ? "Avenir-Heavy" : undefined,
  },
  subtitle: {
    fontSize: 14,
    color: "#9BA1A6",
    marginTop: 4,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  sourceText: {
    fontSize: 11,
    color: "#9BA1A6",
  },
  towerContainer: {
    paddingHorizontal: 16,
    gap: 6,
  },
  floorCard: {
    flexDirection: "row",
    backgroundColor: "#1A1D21",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2A2D32",
  },
  floorRestricted: {
    borderColor: "#3D1F1F",
    backgroundColor: "#1A1518",
  },
  floorExpanded: {
    borderColor: "#3A3D42",
  },
  floorBar: {
    width: 4,
  },
  floorContent: {
    flex: 1,
    padding: 14,
  },
  floorHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  floorNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#252830",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  floorNumberText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ECEDEE",
  },
  floorInfo: {
    flex: 1,
  },
  floorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ECEDEE",
  },
  floorDesc: {
    fontSize: 12,
    color: "#9BA1A6",
    marginTop: 2,
  },
  restrictedBadge: {
    marginRight: 8,
  },
  restrictedText: {
    fontSize: 14,
  },
  statusColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 36,
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 4,
  },
  activeCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#22C55E",
  },
  agentCount: {
    fontSize: 18,
    fontWeight: "700",
  },
  agentList: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    marginBottom: 10,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  agentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  agentName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ECEDEE",
    marginRight: 8,
  },
  agentRole: {
    fontSize: 12,
    color: "#9BA1A6",
    flex: 1,
  },
  headBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  headText: {
    fontSize: 9,
    fontWeight: "700",
  },
  longPressHint: {
    fontSize: 11,
    color: "#687076",
    fontStyle: "italic",
    marginTop: 10,
    textAlign: "center",
  },
  legend: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#9BA1A6",
  },
});
