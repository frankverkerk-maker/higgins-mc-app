import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { getMcCloudActivityPresentation, type McCloudActivityState } from "@/lib/mc-cloud-activity-state";

export type { McCloudActivityState } from "@/lib/mc-cloud-activity-state";

type Props = {
  state: McCloudActivityState;
  label?: string;
  compact?: boolean;
  style?: ViewStyle;
};

function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

export function McCloudActivity({ state, label, compact = false, style }: Props) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const presentation = getMcCloudActivityPresentation(state, reduceMotion);
  const { animated, visible } = presentation;

  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    if (!animated || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, progress, reduceMotion]);

  const dotColor = presentation.tone === "cached" ? "#F5A623" : presentation.tone === "fallback" ? "#75808D" : "#00D4D4";
  const accessibleLabel = label ?? presentation.label;
  const motionStyle = useMemo(() => ({
    opacity: reduceMotion || !animated ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
    transform: [{ scale: reduceMotion || !animated ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
  }), [animated, progress, reduceMotion]);

  return (
    <View
      pointerEvents="none"
      accessible={visible}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibleLabel}
      accessibilityState={{ busy: presentation.busy }}
      style={[styles.container, compact && styles.compact, !visible && styles.hidden, style]}
    >
      <View style={styles.track}>
        <Animated.View style={[styles.dot, { backgroundColor: dotColor }, motionStyle]} />
        <View style={[styles.line, { backgroundColor: dotColor }]} />
      </View>
      {!compact ? <Text numberOfLines={1} style={[styles.label, { color: dotColor }]}>{accessibleLabel}</Text> : null}
    </View>
  );
}

const FONT = Platform.OS === "ios" ? "Avenir" : undefined;

const styles = StyleSheet.create({
  container: { minHeight: 18, minWidth: 126, flexDirection: "row", alignItems: "center", gap: 7 },
  compact: { minWidth: 30, width: 30 },
  hidden: { opacity: 0 },
  track: { width: 24, height: 10, alignItems: "center", justifyContent: "center" },
  line: { position: "absolute", width: 18, height: 1, opacity: 0.28 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 10, lineHeight: 14, fontFamily: FONT, letterSpacing: 0.2 },
});
