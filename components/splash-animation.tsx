import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions, Text } from "react-native";
import { Image } from "expo-image";

interface SplashAnimationProps {
  onFinished: () => void;
}

const { width, height } = Dimensions.get("window");

/**
 * Higgins MC Splash Screen animatie.
 * Toont het cilinderhoed logo met een elegante fade-in + scale animatie,
 * gevolgd door een fade-out naar het hoofdscherm.
 */
export function SplashAnimation({ onFinished }: SplashAnimationProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fase 1: Logo fade-in + scale omhoog
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Fase 2: Tekst fade-in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }).start(() => {
        // Fase 3: Wacht even, dan fade-out van het hele scherm
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 500,
          delay: 900,
          useNativeDriver: true,
        }).start(() => {
          onFinished();
        });
      });
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Achtergrond glow */}
      <View style={styles.glow} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>

      {/* Tekst */}
      <Animated.View style={[styles.textWrapper, { opacity: textOpacity }]}>
        <Text style={styles.title}>HIGGINS</Text>
        <Text style={styles.subtitle}>MISSION CONTROL</Text>
      </Animated.View>

      {/* Versie */}
      <Animated.Text style={[styles.version, { opacity: textOpacity }]}>
        v1.0 Beta
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F1117",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#14B8A6",
    opacity: 0.06,
    top: height / 2 - 200,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },
  textWrapper: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#E2E8F0",
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#14B8A6",
    letterSpacing: 5,
  },
  version: {
    position: "absolute",
    bottom: 48,
    fontSize: 12,
    color: "#475569",
    letterSpacing: 1,
  },
});
