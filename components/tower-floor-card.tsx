import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { TowerFloor } from "@/lib/tower-directory";
import { TOWER_MOTION_MS, towerMotionTarget } from "@/lib/tower-motion";

export const FLOOR_COLORS: Record<string, string> = {
  executive: "#FFD700", "einstein-lab": "#A855F7", finance: "#22C55E",
  technology: "#3B82F6", marketing: "#F97316", enterprise: "#06B6D4",
  fmc: "#EC4899", jlc: "#8B5CF6", mtd: "#EF4444", uta: "#DC2626",
  "task-force-ghost": "#8B929B",
};

export function floorNumberLabel(number: number): string {
  return number < 0 ? `B${Math.abs(number)}` : String(number);
}

type Props = {
  floor: TowerFloor;
  expanded: boolean;
  live: boolean;
  agentLabel: string;
  longPressHint: string;
  onToggle: (number: number) => void;
  onLongPress: (label: string) => void;
};

const ease = Easing.out(Easing.cubic);
const layoutTransition = LinearTransition.duration(TOWER_MOTION_MS.layout).easing(ease);
const enter = FadeInDown.duration(TOWER_MOTION_MS.enter).easing(ease);
const exit = FadeOutUp.duration(TOWER_MOTION_MS.exit).easing(ease);

/** One hook instance per card: hover/focus/press never alter the directory. */
export function TowerFloorCard({
  floor, expanded, live, agentLabel, longPressHint, onToggle, onLongPress,
}: Props) {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const highlighted = useSharedValue(expanded ? 0.68 : 0);
  const pressure = useSharedValue(0);
  const arrow = useSharedValue(expanded ? 1 : 0);
  const color = FLOOR_COLORS[floor.departments[0]?.id] ?? "#68D3D0";
  const baseBorder = floor.restricted ? "#3D1F1F" : "#2A2D32";
  const baseBackground = floor.restricted ? "#1A1518" : "#1A1D21";
  const litBackground = floor.restricted ? "#291B23" : "#1B282B";

  useEffect(() => {
    const target = towerMotionTarget({ hovered, focused, pressed, expanded, reducedMotion });
    highlighted.value = withTiming(target.highlight, { duration: target.highlightDuration, easing: ease });
    pressure.value = withTiming(target.pressure, { duration: target.pressDuration, easing: ease });
    arrow.value = withTiming(target.arrow, { duration: target.arrowDuration, easing: ease });
  }, [expanded, hovered, focused, pressed, reducedMotion, highlighted, pressure, arrow]);

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(highlighted.value, [0, 1], [baseBackground, litBackground]),
    borderColor: interpolateColor(highlighted.value, [0, 1], [baseBorder, color]),
    transform: [{ scale: 1 + highlighted.value * 0.006 - pressure.value * 0.018 }],
  }), [baseBackground, litBackground, baseBorder, color]);
  const barStyle = useAnimatedStyle(() => ({
    opacity: 0.65 + highlighted.value * 0.35,
    width: 4 + highlighted.value * 2,
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrow.value * 90}deg` }],
    opacity: 0.55 + highlighted.value * 0.45,
  }));

  return (
    <Animated.View
      layout={reducedMotion ? undefined : layoutTransition}
      style={[styles.card, cardStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${floorNumberLabel(floor.number)} ${floor.label}, ${floor.totalAgents} ${agentLabel}`}
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        onPress={() => onToggle(floor.number)}
        onLongPress={() => onLongPress(floor.label)}
        delayLongPress={500}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={styles.pressable}
      >
        <Animated.View style={[styles.accentBar, { backgroundColor: color }, barStyle]} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{floorNumberLabel(floor.number)}</Text>
            </View>
            <View style={styles.floorInfo}>
              <Text style={styles.floorName}>{floor.label}</Text>
              <Text style={styles.floorDesc} numberOfLines={2}>
                {floor.departments.map(group => group.name).join(" · ")}
              </Text>
            </View>
            {floor.restricted && <Text style={styles.restricted}>🔒</Text>}
            <View style={styles.statusColumn}>
              {live && floor.activeCount > 0 && (
                <View style={styles.activeRow}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeCount}>{floor.activeCount}</Text>
                </View>
              )}
              <Text style={[styles.agentCount, { color }]}>{floor.totalAgents}</Text>
            </View>
            <Animated.Text style={[styles.arrow, { color }, arrowStyle]} aria-hidden>›</Animated.Text>
          </View>
          {expanded && (
            <Animated.View
              entering={reducedMotion ? undefined : enter}
              exiting={reducedMotion ? undefined : exit}
              style={styles.agentList}
            >
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
                      <View style={[styles.agentDot, { backgroundColor: live && (agent.status === "active" || agent.status === "busy") ? "#22C55E" : "#4A5568" }]} />
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
              <Text style={styles.longPressHint}>{longPressHint}</Text>
            </Animated.View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, overflow: "hidden", borderWidth: 1 },
  pressable: { flexDirection: "row", cursor: Platform.OS === "web" ? "pointer" : undefined },
  accentBar: { alignSelf: "stretch" },
  content: { flex: 1, padding: 14 },
  header: { flexDirection: "row", alignItems: "center" },
  numberBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#252830", alignItems: "center", justifyContent: "center", marginRight: 12 },
  numberText: { fontSize: 13, fontWeight: "700", color: "#ECEDEE" },
  floorInfo: { flex: 1 },
  floorName: { fontSize: 15, fontWeight: "600", color: "#ECEDEE" },
  floorDesc: { fontSize: 12, color: "#9BA1A6", marginTop: 2 },
  restricted: { fontSize: 14, marginRight: 8 },
  statusColumn: { alignItems: "flex-end", justifyContent: "center", minWidth: 36 },
  activeRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  activeDot: { width: 7, height: 7, borderRadius: 4, marginRight: 4, backgroundColor: "#22C55E" },
  activeCount: { fontSize: 11, fontWeight: "600", color: "#22C55E" },
  agentCount: { fontSize: 18, fontWeight: "700" },
  arrow: { fontSize: 24, fontWeight: "300", marginLeft: 9, width: 17, textAlign: "center" },
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
});
