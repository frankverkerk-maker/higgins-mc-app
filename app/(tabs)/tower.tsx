import { useCallback, useEffect, useState } from "react";
import { Text, View, ScrollView, StyleSheet, Platform, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";
import { TEAM, DEPARTMENTS } from "@/constants/team";
import * as Haptics from "expo-haptics";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Floor {
  floor_number: number;
  floor_name: string;
  department_id: string;
  description: string;
  is_restricted: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const HIGGINS_TOWER: Floor[] = [
  { floor_number: 8, floor_name: "Penthouse", department_id: "executive", description: "Executive Office · Higgins, Elena, Barbara, Catharina, Rosi, Susi", is_restricted: false },
  { floor_number: 7, floor_name: "Einstein Lab", department_id: "einstein-lab", description: "Research & Innovation · Einstein, Curie, Tesla", is_restricted: false },
  { floor_number: 6, floor_name: "Finance Floor", department_id: "finance", description: "Financial Operations · Warren, Abacus, Closer, Carson, Strategos", is_restricted: false },
  { floor_number: 5, floor_name: "Tech Hub", department_id: "technology", description: "Engineering & Infrastructure · Elon + team", is_restricted: false },
  { floor_number: 4, floor_name: "Marketing Suite", department_id: "marketing", description: "Creative & Communications · Gary + team", is_restricted: false },
  { floor_number: 3, floor_name: "Enterprise Floor", department_id: "enterprise", description: "Operations & Client Services · Atlas + 13 agents", is_restricted: false },
  { floor_number: 2, floor_name: "Medical Center", department_id: "fmc", description: "Functional Medicine · David + 8 specialists", is_restricted: false },
  { floor_number: 1, floor_name: "Legal Wing", department_id: "jlc", description: "Juridisch & Compliance · Justitia + team", is_restricted: false },
  { floor_number: -1, floor_name: "Basement B1", department_id: "mtd", description: "Morgan Trading Desk · 7 agents", is_restricted: true },
  { floor_number: -2, floor_name: "Basement B2", department_id: "uta", description: "Ultra Trust Agency · 23 agents", is_restricted: true },
  { floor_number: -3, floor_name: "Basement B3", department_id: "task-force-ghost", description: "Task Force Ghost · Zero, Spectre", is_restricted: true },
];

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
  const [expandedFloor, setExpandedFloor] = useState<number | null>(null);

  const toggleFloor = useCallback((floorNum: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpandedFloor(prev => prev === floorNum ? null : floorNum);
  }, []);

  const getAgentsForDept = useCallback((deptId: string) => {
    return TEAM.filter(a => a.department === deptId);
  }, []);

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.towerIcon}>🏢</Text>
          <Text style={styles.title}>Higgins Tower</Text>
          <Text style={styles.subtitle}>
            11 verdiepingen · 88 agenten · 11 afdelingen
          </Text>
        </View>

        {/* Tower visualization */}
        <View style={styles.towerContainer}>
          {HIGGINS_TOWER.map((floor) => {
            const isExpanded = expandedFloor === floor.floor_number;
            const floorColor = FLOOR_COLORS[floor.department_id] || "#5A6472";
            const agents = getAgentsForDept(floor.department_id);
            const dept = DEPARTMENTS.find(d => d.name === floor.department_id);

            return (
              <Pressable
                key={floor.floor_number}
                onPress={() => toggleFloor(floor.floor_number)}
                style={({ pressed }) => [
                  styles.floorCard,
                  floor.is_restricted && styles.floorRestricted,
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
                        {floor.floor_number > 0 ? floor.floor_number : `B${Math.abs(floor.floor_number)}`}
                      </Text>
                    </View>
                    <View style={styles.floorInfo}>
                      <Text style={styles.floorName}>{floor.floor_name}</Text>
                      <Text style={styles.floorDesc}>{floor.description}</Text>
                    </View>
                    {floor.is_restricted && (
                      <View style={styles.restrictedBadge}>
                        <Text style={styles.restrictedText}>🔒</Text>
                      </View>
                    )}
                    <Text style={[styles.agentCount, { color: floorColor }]}>
                      {agents.length}
                    </Text>
                  </View>

                  {/* Expanded agent list */}
                  {isExpanded && (
                    <View style={styles.agentList}>
                      <View style={[styles.divider, { backgroundColor: floorColor + "40" }]} />
                      {agents.map((agent) => (
                        <View key={agent.name} style={styles.agentRow}>
                          <View style={[styles.agentDot, { backgroundColor: floorColor }]} />
                          <Text style={styles.agentName}>{agent.name}</Text>
                          <Text style={styles.agentRole}>{agent.role}</Text>
                          {agent.name === dept?.head && (
                            <View style={[styles.headBadge, { borderColor: floorColor }]}>
                              <Text style={[styles.headText, { color: floorColor }]}>HEAD</Text>
                            </View>
                          )}
                        </View>
                      ))}
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
            <Text style={styles.legendText}>Bovengronds (publiek)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
            <Text style={styles.legendText}>Basement (classified)</Text>
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
