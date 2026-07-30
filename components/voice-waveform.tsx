import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";

interface VoiceWaveformProps {
  isPlaying: boolean;
  color?: string;
  barCount?: number;
  height?: number;
  barWidth?: number;
}

/**
 * A subtle waveform animation that shows during TTS playback.
 * Displays animated bars that pulse at different rates to simulate audio output.
 */
export function VoiceWaveform({
  isPlaying,
  color = "#00D4D4",
  barCount = 5,
  height = 16,
  barWidth = 2.5,
}: VoiceWaveformProps) {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <View style={[styles.container, { height }]}>
      {bars.map((i) => (
        <WaveBar
          key={i}
          index={i}
          isPlaying={isPlaying}
          color={color}
          height={height}
          barWidth={barWidth}
          barCount={barCount}
        />
      ))}
    </View>
  );
}

function WaveBar({
  index,
  isPlaying,
  color,
  height,
  barWidth,
  barCount,
}: {
  index: number;
  isPlaying: boolean;
  color: string;
  height: number;
  barWidth: number;
  barCount: number;
}) {
  const scale = useSharedValue(0.3);

  useEffect(() => {
    if (isPlaying) {
      // Each bar has a different delay and duration for natural look
      const delay = index * 80;
      const minScale = 0.25 + (index % 2) * 0.1;
      const maxScale = 0.6 + ((index + 1) % 3) * 0.2;
      const duration = 300 + (index % 3) * 100;

      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(maxScale, { duration, easing: Easing.inOut(Easing.ease) }),
            withTiming(minScale, { duration: duration + 50, easing: Easing.inOut(Easing.ease) }),
          ),
          -1, // infinite repeat
          true, // reverse
        ),
      );
    } else {
      scale.value = withTiming(0.3, { duration: 200 });
    }
  }, [isPlaying, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height * scale.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: barWidth,
          borderRadius: barWidth / 2,
          backgroundColor: color,
          opacity: isPlaying ? 0.9 : 0.3,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
});
