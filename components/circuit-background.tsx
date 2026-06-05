/**
 * CircuitBackground — Higgins MC
 *
 * Subtiele circuit/stroomschema SVG achtergrond, geïnspireerd op de
 * Higgins presentatie stijl. Volledig statisch, geen animatie overhead.
 *
 * Gebruik:
 *   <CircuitBackground />   ← absolute positionering, vult parent
 */
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Line, Circle, Rect, Path, G } from "react-native-svg";

interface CircuitBackgroundProps {
  opacity?: number;
  color?: string;
}

export function CircuitBackground({
  opacity = 0.045,
  color = "#00D4D4",
}: CircuitBackgroundProps) {
  const { width, height } = useWindowDimensions();

  // Genereer een deterministisch grid van circuit-lijnen
  const lines: React.ReactNode[] = [];
  const nodes: React.ReactNode[] = [];
  const key = { i: 0 };

  const GRID = 48;
  const cols = Math.ceil(width / GRID) + 1;
  const rows = Math.ceil(height / GRID) + 1;

  // Horizontale en verticale lijnen op rasterpunten (niet alle — selectief)
  const hPattern = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1];
  const vPattern = [0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * GRID;
      const y = r * GRID;
      const hi = (r * cols + c) % hPattern.length;
      const vi = (r + c) % vPattern.length;

      // Horizontale lijn naar rechts
      if (hPattern[hi] && c < cols - 1) {
        lines.push(
          <Line
            key={`h-${key.i++}`}
            x1={x} y1={y}
            x2={x + GRID} y2={y}
            stroke={color}
            strokeWidth="0.6"
          />
        );
      }

      // Verticale lijn naar beneden
      if (vPattern[vi] && r < rows - 1) {
        lines.push(
          <Line
            key={`v-${key.i++}`}
            x1={x} y1={y}
            x2={x} y2={y + GRID}
            stroke={color}
            strokeWidth="0.6"
          />
        );
      }

      // Knooppunten op kruispunten (selectief)
      const nodePattern = (r * 7 + c * 13) % 17;
      if (nodePattern < 3) {
        // Kleine vierkante chip
        nodes.push(
          <Rect
            key={`chip-${key.i++}`}
            x={x - 4} y={y - 4}
            width={8} height={8}
            rx={1}
            stroke={color}
            strokeWidth="0.8"
            fill="none"
          />
        );
      } else if (nodePattern < 6) {
        // Kleine cirkel
        nodes.push(
          <Circle
            key={`dot-${key.i++}`}
            cx={x} cy={y}
            r={2.5}
            stroke={color}
            strokeWidth="0.7"
            fill="none"
          />
        );
      } else if (nodePattern < 7) {
        // Grotere IC chip
        nodes.push(
          <G key={`ic-${key.i++}`}>
            <Rect
              x={x - 10} y={y - 6}
              width={20} height={12}
              rx={2}
              stroke={color}
              strokeWidth="0.8"
              fill="none"
            />
            {/* IC pinnen links */}
            <Line x1={x - 14} y1={y - 3} x2={x - 10} y2={y - 3} stroke={color} strokeWidth="0.6" />
            <Line x1={x - 14} y1={y + 3} x2={x - 10} y2={y + 3} stroke={color} strokeWidth="0.6" />
            {/* IC pinnen rechts */}
            <Line x1={x + 10} y1={y - 3} x2={x + 14} y2={y - 3} stroke={color} strokeWidth="0.6" />
            <Line x1={x + 10} y1={y + 3} x2={x + 14} y2={y + 3} stroke={color} strokeWidth="0.6" />
          </G>
        );
      }
    }
  }

  // Diagonale accent lijnen (45°) voor extra circuit-gevoel
  const diagonals: React.ReactNode[] = [];
  const diagPositions = [
    { x: width * 0.15, y: height * 0.1, len: 80 },
    { x: width * 0.7,  y: height * 0.05, len: 60 },
    { x: width * 0.85, y: height * 0.3, len: 100 },
    { x: width * 0.05, y: height * 0.6, len: 70 },
    { x: width * 0.5,  y: height * 0.75, len: 90 },
    { x: width * 0.9,  y: height * 0.8, len: 55 },
    { x: width * 0.3,  y: height * 0.45, len: 65 },
  ];
  diagPositions.forEach((d, i) => {
    diagonals.push(
      <Line
        key={`diag-${i}`}
        x1={d.x} y1={d.y}
        x2={d.x + d.len} y2={d.y + d.len}
        stroke={color}
        strokeWidth="0.5"
      />
    );
    // Kleine vierkantjes op de diagonaal uiteinden
    diagonals.push(
      <Rect
        key={`diag-end-${i}`}
        x={d.x + d.len - 3} y={d.y + d.len - 3}
        width={6} height={6}
        rx={1}
        stroke={color}
        strokeWidth="0.7"
        fill="none"
      />
    );
  });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width={width} height={height} style={{ opacity }}>
        {lines}
        {nodes}
        {diagonals}
      </Svg>
    </View>
  );
}
