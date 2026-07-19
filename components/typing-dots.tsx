import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, Easing } from "react-native";

/**
 * WhatsApp-style "typing" indicator: three dots that pulse in sequence.
 * Purely presentational; mount it while waiting for a reply.
 */
export function TypingDots({ color = "#00D4D4" }: { color?: string }) {
  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const d3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makeAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay(600 - delay),
        ]),
      );

    const a1 = makeAnim(d1, 0);
    const a2 = makeAnim(d2, 200);
    const a3 = makeAnim(d3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [d1, d2, d3]);

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: d1, transform: [{ scale: d1 }] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: d2, transform: [{ scale: d2 }] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: d3, transform: [{ scale: d3 }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
