import { View, StyleSheet, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useColors } from "@/hooks/use-colors";

interface HigginsAvatarProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Herbruikbare Higgins avatar component met het officiële cilinderhoed logo.
 * Gebruik op alle plekken waar Higgins wordt weergegeven (chat, dashboard, agents).
 */
export function HigginsAvatar({ size = 40, style }: HigginsAvatarProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary + "18",
          borderColor: colors.primary + "55",
        },
        style,
      ]}
    >
      <Image
        source={require("@/assets/images/icon.png")}
        style={{ width: size * 0.78, height: size * 0.78, borderRadius: (size * 0.78) / 2 }}
        contentFit="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
