/**
 * CircuitBackground — Higgins MC
 *
 * Reproduceert de organische circuit/stroomschema achtergrond uit de Higgins presentatie:
 * gebogen lijnen die vanuit de hoeken lopen, gloeiende knooppunten, diagonale verbindingen
 * en IC-chips — precies zoals in de cilinderhoed presentatie.
 */
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Path, Circle, Line, Rect, G } from "react-native-svg";

interface CircuitBackgroundProps {
  opacity?: number;
  color?: string;
}

export function CircuitBackground({
  opacity = 0.28,
  color = "#00D4D4",
}: CircuitBackgroundProps) {
  const { width: W, height: H } = useWindowDimensions();

  // Bouw alle SVG elementen op basis van schermafmetingen
  const svgElements = buildCircuit(W, H, color);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg
        width={W}
        height={H}
        style={{ opacity }}
        viewBox={`0 0 ${W} ${H}`}
      >
        {svgElements}
      </Svg>
    </View>
  );
}

// ─── Circuit builder ──────────────────────────────────────────────────────────

function buildCircuit(W: number, H: number, color: string): React.ReactElement[] {
  const els: React.ReactElement[] = [];
  let k = 0;

  const sw = 1.0;   // standaard lijndikte
  const sw2 = 0.7;  // dunne lijn

  // ── Helpers ──────────────────────────────────────────────────────────────

  const L = (x1: number, y1: number, x2: number, y2: number, w = sw, op = 1.0) => (
    <Line key={k++} x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth={w} opacity={op} />
  );

  const C = (d: string, w = sw, op = 1.0) => (
    <Path key={k++} d={d} fill="none" stroke={color} strokeWidth={w} opacity={op} />
  );

  const Dot = (cx: number, cy: number, r = 3, op = 1.0) => (
    <Circle key={k++} cx={cx} cy={cy} r={r} fill={color} opacity={op} />
  );

  const SmallDot = (cx: number, cy: number, op = 0.8) => (
    <Circle key={k++} cx={cx} cy={cy} r={1.8} fill={color} opacity={op} />
  );

  const Chip = (cx: number, cy: number, w = 18, h = 10, op = 0.9) => (
    <G key={k++} opacity={op}>
      <Rect x={cx - w / 2} y={cy - h / 2} width={w} height={h}
        rx={2} fill="none" stroke={color} strokeWidth={0.8} />
      {/* pinnen links */}
      <Line x1={cx - w / 2 - 5} y1={cy - 3} x2={cx - w / 2} y2={cy - 3}
        stroke={color} strokeWidth={0.6} />
      <Line x1={cx - w / 2 - 5} y1={cy + 3} x2={cx - w / 2} y2={cy + 3}
        stroke={color} strokeWidth={0.6} />
      {/* pinnen rechts */}
      <Line x1={cx + w / 2} y1={cy - 3} x2={cx + w / 2 + 5} y2={cy - 3}
        stroke={color} strokeWidth={0.6} />
      <Line x1={cx + w / 2} y1={cy + 3} x2={cx + w / 2 + 5} y2={cy + 3}
        stroke={color} strokeWidth={0.6} />
    </G>
  );

  const Sq = (cx: number, cy: number, s = 6, op = 0.8) => (
    <Rect key={k++} x={cx - s / 2} y={cy - s / 2} width={s} height={s}
      rx={1} fill="none" stroke={color} strokeWidth={0.7} opacity={op} />
  );

  // ── LINKSBOVEN — organische cluster vanuit hoek ───────────────────────────
  // Hoofdlijn horizontaal
  els.push(L(0, 70, 90, 70, sw, 0.95));
  els.push(Dot(90, 70, 3.5));
  // Aftakking omhoog
  els.push(L(90, 70, 90, 30, sw2, 0.8));
  els.push(Dot(90, 30, 2.5, 0.7));
  els.push(L(90, 30, 140, 30, sw2, 0.7));
  els.push(SmallDot(140, 30, 0.6));
  // Gebogen lijn naar beneden rechts
  els.push(C(`M90,70 C110,70 130,90 150,110`, sw, 0.85));
  els.push(Dot(150, 110, 3));
  // Verticale stam
  els.push(L(90, 70, 90, 160, sw, 0.8));
  els.push(Chip(90, 130, 20, 12, 0.8));
  els.push(Dot(90, 160, 3));
  // Horizontale aftakking midden
  els.push(L(90, 160, 170, 160, sw2, 0.75));
  els.push(Sq(170, 160, 6, 0.7));
  // Gebogen diagonaal
  els.push(C(`M150,110 C170,130 180,160 200,190`, sw2, 0.7));
  els.push(Dot(200, 190, 2.5, 0.65));
  // Extra kleine aftakking
  els.push(L(0, 120, 50, 120, sw2, 0.6));
  els.push(Sq(50, 120, 5, 0.55));
  els.push(L(50, 120, 50, 160, sw2, 0.55));
  els.push(SmallDot(50, 160, 0.5));

  // ── RECHTSBOVEN — spiegelcluster ─────────────────────────────────────────
  els.push(L(W, 70, W - 90, 70, sw, 0.95));
  els.push(Dot(W - 90, 70, 3.5));
  els.push(L(W - 90, 70, W - 90, 30, sw2, 0.8));
  els.push(Dot(W - 90, 30, 2.5, 0.7));
  els.push(L(W - 90, 30, W - 140, 30, sw2, 0.7));
  els.push(SmallDot(W - 140, 30, 0.6));
  els.push(C(`M${W - 90},70 C${W - 110},70 ${W - 130},90 ${W - 150},110`, sw, 0.85));
  els.push(Dot(W - 150, 110, 3));
  els.push(L(W - 90, 70, W - 90, 160, sw, 0.8));
  els.push(Chip(W - 90, 130, 20, 12, 0.8));
  els.push(Dot(W - 90, 160, 3));
  els.push(L(W - 90, 160, W - 170, 160, sw2, 0.75));
  els.push(Sq(W - 170, 160, 6, 0.7));
  els.push(C(`M${W - 150},110 C${W - 170},130 ${W - 180},160 ${W - 200},190`, sw2, 0.7));
  els.push(Dot(W - 200, 190, 2.5, 0.65));
  els.push(L(W, 120, W - 50, 120, sw2, 0.6));
  els.push(Sq(W - 50, 120, 5, 0.55));
  els.push(L(W - 50, 120, W - 50, 160, sw2, 0.55));
  els.push(SmallDot(W - 50, 160, 0.5));

  // ── LINKSONDER — cluster ─────────────────────────────────────────────────
  els.push(L(0, H - 70, 90, H - 70, sw, 0.95));
  els.push(Dot(90, H - 70, 3.5));
  els.push(L(90, H - 70, 90, H - 30, sw2, 0.8));
  els.push(Dot(90, H - 30, 2.5, 0.7));
  els.push(L(90, H - 30, 140, H - 30, sw2, 0.7));
  els.push(SmallDot(140, H - 30, 0.6));
  els.push(C(`M90,${H - 70} C110,${H - 70} 130,${H - 90} 150,${H - 110}`, sw, 0.85));
  els.push(Dot(150, H - 110, 3));
  els.push(L(90, H - 70, 90, H - 160, sw, 0.8));
  els.push(Chip(90, H - 130, 20, 12, 0.8));
  els.push(Dot(90, H - 160, 3));
  els.push(L(90, H - 160, 170, H - 160, sw2, 0.75));
  els.push(Sq(170, H - 160, 6, 0.7));
  els.push(C(`M150,${H - 110} C170,${H - 130} 180,${H - 160} 200,${H - 190}`, sw2, 0.7));
  els.push(Dot(200, H - 190, 2.5, 0.65));
  els.push(L(0, H - 120, 50, H - 120, sw2, 0.6));
  els.push(Sq(50, H - 120, 5, 0.55));
  els.push(L(50, H - 120, 50, H - 160, sw2, 0.55));
  els.push(SmallDot(50, H - 160, 0.5));

  // ── RECHTSONDER — spiegelcluster ─────────────────────────────────────────
  els.push(L(W, H - 70, W - 90, H - 70, sw, 0.95));
  els.push(Dot(W - 90, H - 70, 3.5));
  els.push(L(W - 90, H - 70, W - 90, H - 30, sw2, 0.8));
  els.push(Dot(W - 90, H - 30, 2.5, 0.7));
  els.push(L(W - 90, H - 30, W - 140, H - 30, sw2, 0.7));
  els.push(SmallDot(W - 140, H - 30, 0.6));
  els.push(C(`M${W - 90},${H - 70} C${W - 110},${H - 70} ${W - 130},${H - 90} ${W - 150},${H - 110}`, sw, 0.85));
  els.push(Dot(W - 150, H - 110, 3));
  els.push(L(W - 90, H - 70, W - 90, H - 160, sw, 0.8));
  els.push(Chip(W - 90, H - 130, 20, 12, 0.8));
  els.push(Dot(W - 90, H - 160, 3));
  els.push(L(W - 90, H - 160, W - 170, H - 160, sw2, 0.75));
  els.push(Sq(W - 170, H - 160, 6, 0.7));
  els.push(C(`M${W - 150},${H - 110} C${W - 170},${H - 130} ${W - 180},${H - 160} ${W - 200},${H - 190}`, sw2, 0.7));
  els.push(Dot(W - 200, H - 190, 2.5, 0.65));
  els.push(L(W, H - 120, W - 50, H - 120, sw2, 0.6));
  els.push(Sq(W - 50, H - 120, 5, 0.55));
  els.push(L(W - 50, H - 120, W - 50, H - 160, sw2, 0.55));
  els.push(SmallDot(W - 50, H - 160, 0.5));

  // ── ZIJKANTEN — verticale stammen met aftakkingen ────────────────────────
  const midY = H / 2;

  // Links
  els.push(L(0, midY - 60, 30, midY - 60, sw2, 0.6));
  els.push(L(30, midY - 60, 30, midY + 60, sw, 0.7));
  els.push(Dot(30, midY, 4, 0.8));
  els.push(L(30, midY, 80, midY, sw, 0.75));
  els.push(Chip(65, midY, 22, 12, 0.75));
  els.push(L(30, midY + 60, 0, midY + 60, sw2, 0.6));
  els.push(SmallDot(30, midY - 60, 0.6));
  els.push(SmallDot(30, midY + 60, 0.6));

  // Rechts
  els.push(L(W, midY - 60, W - 30, midY - 60, sw2, 0.6));
  els.push(L(W - 30, midY - 60, W - 30, midY + 60, sw, 0.7));
  els.push(Dot(W - 30, midY, 4, 0.8));
  els.push(L(W - 30, midY, W - 80, midY, sw, 0.75));
  els.push(Chip(W - 65, midY, 22, 12, 0.75));
  els.push(L(W - 30, midY + 60, W, midY + 60, sw2, 0.6));
  els.push(SmallDot(W - 30, midY - 60, 0.6));
  els.push(SmallDot(W - 30, midY + 60, 0.6));

  // ── BOVEN/ONDER MIDDEN — horizontale accenten ─────────────────────────────
  const midX = W / 2;

  // Boven midden
  els.push(L(midX - 60, 0, midX - 60, 25, sw2, 0.55));
  els.push(L(midX - 60, 25, midX + 60, 25, sw, 0.6));
  els.push(Dot(midX, 25, 3, 0.65));
  els.push(L(midX + 60, 25, midX + 60, 0, sw2, 0.55));
  els.push(SmallDot(midX - 60, 25, 0.5));
  els.push(SmallDot(midX + 60, 25, 0.5));

  // Onder midden
  els.push(L(midX - 60, H, midX - 60, H - 25, sw2, 0.55));
  els.push(L(midX - 60, H - 25, midX + 60, H - 25, sw, 0.6));
  els.push(Dot(midX, H - 25, 3, 0.65));
  els.push(L(midX + 60, H - 25, midX + 60, H, sw2, 0.55));
  els.push(SmallDot(midX - 60, H - 25, 0.5));
  els.push(SmallDot(midX + 60, H - 25, 0.5));

  // ── GEBOGEN VERBINDINGEN — hoeken naar midden ─────────────────────────────
  // Linksboven naar links-midden
  els.push(C(`M200,190 C180,${midY - 80} 60,${midY - 40} 80,${midY}`, sw2, 0.5));
  // Rechtsboven naar rechts-midden
  els.push(C(`M${W - 200},190 C${W - 180},${midY - 80} ${W - 60},${midY - 40} ${W - 80},${midY}`, sw2, 0.5));
  // Linksonder naar links-midden
  els.push(C(`M200,${H - 190} C180,${midY + 80} 60,${midY + 40} 80,${midY}`, sw2, 0.5));
  // Rechtsonder naar rechts-midden
  els.push(C(`M${W - 200},${H - 190} C${W - 180},${midY + 80} ${W - 60},${midY + 40} ${W - 80},${midY}`, sw2, 0.5));

  return els;
}
