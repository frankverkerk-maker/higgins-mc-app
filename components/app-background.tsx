import { ImageBackground, StyleSheet, type ViewProps } from "react-native";

// Higgins hoed watermark patroon — gehost op CDN (geen grote bestanden in repo)
const BG_PATTERN_URI = "https://d2xsxph8kpxj0f.cloudfront.net/310419663030048912/fzaGgof9hzLwRHCXppwV8j/higgins-bg-pattern-XF4TWutdpHe9amFFHW734V.png";

interface AppBackgroundProps extends ViewProps {
  children: React.ReactNode;
}

/**
 * AppBackground — wraps screen content with the Higgins hat watermark background.
 * Uses React Native's ImageBackground which guarantees the image is always
 * rendered behind the children — no zIndex tricks needed.
 *
 * Usage:
 *   <AppBackground>
 *     <ScrollView>...</ScrollView>
 *   </AppBackground>
 */
export function AppBackground({ children, style, ...props }: AppBackgroundProps) {
  return (
    <ImageBackground
      source={{ uri: BG_PATTERN_URI }}
      style={[styles.root, style]}
      imageStyle={styles.image}
      resizeMode="repeat"
      {...props}
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  image: {
    opacity: 0.55,
  },
});
