/**
 * PatternBackground — Higgins MC
 *
 * Behang-aanpak: zwarte achtergrond met herhalende Higgins cilinderhoed.
 * Dit component rendert als absoluteFillObject ACHTER alle content.
 * Het is GEEN wrapper — het is pure achtergrond.
 *
 * Gebruik in elk scherm:
 *   <ScreenContainer>
 *     <PatternBackground />          ← behang (eerste child = achterste laag)
 *     <ScrollView>...</ScrollView>   ← schilderijen eroverheen
 *   </ScreenContainer>
 */
import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, Pattern, Path, Rect, G } from "react-native-svg";

interface PatternBackgroundProps {
  bgColor?: string;
  patternColor?: string;
  opacity?: number;
}

export function PatternBackground({
  bgColor = "#0A0C0E",
  patternColor = "#00D4D4",
  opacity = 0.10,
}: PatternBackgroundProps) {
  const { width: W, height: H } = useWindowDimensions();

  // Hoed SVG path — cilinderhoed in outline stijl, 60x50 viewport
  // Getekend op basis van het Higgins logo
  const hatPaths = useMemo(() => [
    // Rand (brim) — brede elliptische rand onderaan
    "M5,38 Q30,46 55,38 Q30,42 5,38 Z",
    // Cilinder lichaam
    "M12,38 L14,14 Q30,10 46,14 L48,38",
    // Bovenkant van de cilinder
    "M14,14 Q30,8 46,14",
    // Band om de hoed (decoratieve streep)
    "M13,30 Q30,34 47,30",
    // Subtiele circuit lijn links
    "M14,22 L10,22 L10,26 L14,26",
    // Subtiele circuit lijn rechts
    "M46,22 L50,22 L50,26 L46,26",
  ], []);

  return (
    <View
      style={[StyleSheet.absoluteFillObject, { backgroundColor: bgColor }]}
      pointerEvents="none"
    >
      <Svg width={W} height={H} style={{ opacity }}>
        <Defs>
          {/* Tile: 80x70 px, hoed gecentreerd, diagonaal verschoven */}
          <Pattern
            id="hatPattern"
            x="0"
            y="0"
            width={80}
            height={70}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(0)"
          >
            {/* Hoed 1 — normaal */}
            <G transform="translate(10, 10)">
              {hatPaths.map((d, i) => (
                <Path
                  key={`h1-${i}`}
                  d={d}
                  fill="none"
                  stroke={patternColor}
                  strokeWidth={i < 4 ? 1.2 : 0.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </G>
          </Pattern>

          {/* Tweede patroon — verschoven voor diagonaal effect */}
          <Pattern
            id="hatPatternOffset"
            x="40"
            y="35"
            width={80}
            height={70}
            patternUnits="userSpaceOnUse"
          >
            <G transform="translate(10, 10)">
              {hatPaths.map((d, i) => (
                <Path
                  key={`h2-${i}`}
                  d={d}
                  fill="none"
                  stroke={patternColor}
                  strokeWidth={i < 4 ? 1.2 : 0.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </G>
          </Pattern>
        </Defs>

        {/* Laag 1: hoofd patroon */}
        <Rect x="0" y="0" width={W} height={H} fill="url(#hatPattern)" />
        {/* Laag 2: verschoven patroon voor diagonale offset */}
        <Rect x="0" y="0" width={W} height={H} fill="url(#hatPatternOffset)" />
      </Svg>
    </View>
  );
}
