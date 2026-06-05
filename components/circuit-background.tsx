/**
 * CircuitBackground — Higgins MC
 *
 * Intense, heldere circuit/stroomschema achtergrond geïnspireerd op de Higgins presentatie.
 * Organische gebogen lijnen, IC-chips, gloeiende knooppunten, diagonale verbindingen.
 */
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Path, Circle, Line, Rect, G, Defs, RadialGradient, Stop } from "react-native-svg";

interface CircuitBackgroundProps {
  opacity?: number;
  color?: string;
}

export function CircuitBackground({
  opacity = 0.55,
  color = "#00D4D4",
}: CircuitBackgroundProps) {
  const { width: W, height: H } = useWindowDimensions();
  const svgElements = buildCircuit(W, H, color);

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]} pointerEvents="none">
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

function buildCircuit(W: number, H: number, color: string): React.ReactElement[] {
  const els: React.ReactElement[] = [];
  let k = 0;

  const sw  = 1.4;   // standaard lijndikte
  const sw2 = 1.0;   // dunne lijn
  const sw3 = 0.7;   // extra dun

  const L = (x1: number, y1: number, x2: number, y2: number, w = sw, op = 1.0) => (
    <Line key={k++} x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth={w} opacity={op} />
  );

  const CV = (d: string, w = sw, op = 1.0) => (
    <Path key={k++} d={d} fill="none" stroke={color} strokeWidth={w} opacity={op} />
  );

  const Dot = (cx: number, cy: number, r = 3.5, op = 1.0) => (
    <Circle key={k++} cx={cx} cy={cy} r={r} fill={color} opacity={op} />
  );

  const Ring = (cx: number, cy: number, r = 5, op = 0.9) => (
    <Circle key={k++} cx={cx} cy={cy} r={r} fill="none"
      stroke={color} strokeWidth={1.2} opacity={op} />
  );

  const Chip = (cx: number, cy: number, w = 22, h = 13, op = 1.0) => (
    <G key={k++} opacity={op}>
      <Rect x={cx - w / 2} y={cy - h / 2} width={w} height={h}
        rx={2} fill="none" stroke={color} strokeWidth={1.1} />
      <Line x1={cx - w / 2 - 6} y1={cy - 3.5} x2={cx - w / 2} y2={cy - 3.5}
        stroke={color} strokeWidth={0.9} />
      <Line x1={cx - w / 2 - 6} y1={cy + 3.5} x2={cx - w / 2} y2={cy + 3.5}
        stroke={color} strokeWidth={0.9} />
      <Line x1={cx + w / 2} y1={cy - 3.5} x2={cx + w / 2 + 6} y2={cy - 3.5}
        stroke={color} strokeWidth={0.9} />
      <Line x1={cx + w / 2} y1={cy + 3.5} x2={cx + w / 2 + 6} y2={cy + 3.5}
        stroke={color} strokeWidth={0.9} />
    </G>
  );

  const Sq = (cx: number, cy: number, s = 7, op = 0.9) => (
    <Rect key={k++} x={cx - s / 2} y={cy - s / 2} width={s} height={s}
      rx={1.5} fill="none" stroke={color} strokeWidth={1.0} opacity={op} />
  );

  // ── LINKSBOVEN ────────────────────────────────────────────────────────────
  els.push(L(0, 65, 100, 65, sw, 1.0));
  els.push(Dot(100, 65, 4.5));
  els.push(Ring(100, 65, 8, 0.6));
  els.push(L(100, 65, 100, 20, sw2, 0.9));
  els.push(Dot(100, 20, 3, 0.8));
  els.push(L(100, 20, 160, 20, sw2, 0.8));
  els.push(Sq(160, 20, 7, 0.75));
  els.push(CV(`M100,65 C125,65 145,90 165,115`, sw, 1.0));
  els.push(Dot(165, 115, 3.5));
  els.push(L(100, 65, 100, 175, sw, 0.95));
  els.push(Chip(100, 135, 24, 14, 1.0));
  els.push(Dot(100, 175, 4));
  els.push(Ring(100, 175, 7, 0.55));
  els.push(L(100, 175, 185, 175, sw2, 0.85));
  els.push(Sq(185, 175, 7, 0.8));
  els.push(CV(`M165,115 C185,138 195,165 215,200`, sw2, 0.8));
  els.push(Dot(215, 200, 3, 0.75));
  els.push(L(0, 125, 55, 125, sw2, 0.75));
  els.push(Sq(55, 125, 6, 0.7));
  els.push(L(55, 125, 55, 175, sw3, 0.65));
  els.push(Dot(55, 175, 2.5, 0.6));
  // Extra aftakking
  els.push(L(0, 175, 55, 175, sw3, 0.6));
  els.push(CV(`M0,40 C30,40 55,55 100,65`, sw2, 0.85));

  // ── RECHTSBOVEN ───────────────────────────────────────────────────────────
  els.push(L(W, 65, W - 100, 65, sw, 1.0));
  els.push(Dot(W - 100, 65, 4.5));
  els.push(Ring(W - 100, 65, 8, 0.6));
  els.push(L(W - 100, 65, W - 100, 20, sw2, 0.9));
  els.push(Dot(W - 100, 20, 3, 0.8));
  els.push(L(W - 100, 20, W - 160, 20, sw2, 0.8));
  els.push(Sq(W - 160, 20, 7, 0.75));
  els.push(CV(`M${W - 100},65 C${W - 125},65 ${W - 145},90 ${W - 165},115`, sw, 1.0));
  els.push(Dot(W - 165, 115, 3.5));
  els.push(L(W - 100, 65, W - 100, 175, sw, 0.95));
  els.push(Chip(W - 100, 135, 24, 14, 1.0));
  els.push(Dot(W - 100, 175, 4));
  els.push(Ring(W - 100, 175, 7, 0.55));
  els.push(L(W - 100, 175, W - 185, 175, sw2, 0.85));
  els.push(Sq(W - 185, 175, 7, 0.8));
  els.push(CV(`M${W - 165},115 C${W - 185},138 ${W - 195},165 ${W - 215},200`, sw2, 0.8));
  els.push(Dot(W - 215, 200, 3, 0.75));
  els.push(L(W, 125, W - 55, 125, sw2, 0.75));
  els.push(Sq(W - 55, 125, 6, 0.7));
  els.push(L(W - 55, 125, W - 55, 175, sw3, 0.65));
  els.push(Dot(W - 55, 175, 2.5, 0.6));
  els.push(L(W, 175, W - 55, 175, sw3, 0.6));
  els.push(CV(`M${W},40 C${W - 30},40 ${W - 55},55 ${W - 100},65`, sw2, 0.85));

  // ── LINKSONDER ────────────────────────────────────────────────────────────
  els.push(L(0, H - 65, 100, H - 65, sw, 1.0));
  els.push(Dot(100, H - 65, 4.5));
  els.push(Ring(100, H - 65, 8, 0.6));
  els.push(L(100, H - 65, 100, H - 20, sw2, 0.9));
  els.push(Dot(100, H - 20, 3, 0.8));
  els.push(L(100, H - 20, 160, H - 20, sw2, 0.8));
  els.push(Sq(160, H - 20, 7, 0.75));
  els.push(CV(`M100,${H - 65} C125,${H - 65} 145,${H - 90} 165,${H - 115}`, sw, 1.0));
  els.push(Dot(165, H - 115, 3.5));
  els.push(L(100, H - 65, 100, H - 175, sw, 0.95));
  els.push(Chip(100, H - 135, 24, 14, 1.0));
  els.push(Dot(100, H - 175, 4));
  els.push(Ring(100, H - 175, 7, 0.55));
  els.push(L(100, H - 175, 185, H - 175, sw2, 0.85));
  els.push(Sq(185, H - 175, 7, 0.8));
  els.push(CV(`M165,${H - 115} C185,${H - 138} 195,${H - 165} 215,${H - 200}`, sw2, 0.8));
  els.push(Dot(215, H - 200, 3, 0.75));
  els.push(L(0, H - 125, 55, H - 125, sw2, 0.75));
  els.push(Sq(55, H - 125, 6, 0.7));
  els.push(L(55, H - 125, 55, H - 175, sw3, 0.65));
  els.push(Dot(55, H - 175, 2.5, 0.6));
  els.push(L(0, H - 175, 55, H - 175, sw3, 0.6));
  els.push(CV(`M0,${H - 40} C30,${H - 40} 55,${H - 55} 100,${H - 65}`, sw2, 0.85));

  // ── RECHTSONDER ───────────────────────────────────────────────────────────
  els.push(L(W, H - 65, W - 100, H - 65, sw, 1.0));
  els.push(Dot(W - 100, H - 65, 4.5));
  els.push(Ring(W - 100, H - 65, 8, 0.6));
  els.push(L(W - 100, H - 65, W - 100, H - 20, sw2, 0.9));
  els.push(Dot(W - 100, H - 20, 3, 0.8));
  els.push(L(W - 100, H - 20, W - 160, H - 20, sw2, 0.8));
  els.push(Sq(W - 160, H - 20, 7, 0.75));
  els.push(CV(`M${W - 100},${H - 65} C${W - 125},${H - 65} ${W - 145},${H - 90} ${W - 165},${H - 115}`, sw, 1.0));
  els.push(Dot(W - 165, H - 115, 3.5));
  els.push(L(W - 100, H - 65, W - 100, H - 175, sw, 0.95));
  els.push(Chip(W - 100, H - 135, 24, 14, 1.0));
  els.push(Dot(W - 100, H - 175, 4));
  els.push(Ring(W - 100, H - 175, 7, 0.55));
  els.push(L(W - 100, H - 175, W - 185, H - 175, sw2, 0.85));
  els.push(Sq(W - 185, H - 175, 7, 0.8));
  els.push(CV(`M${W - 165},${H - 115} C${W - 185},${H - 138} ${W - 195},${H - 165} ${W - 215},${H - 200}`, sw2, 0.8));
  els.push(Dot(W - 215, H - 200, 3, 0.75));
  els.push(L(W, H - 125, W - 55, H - 125, sw2, 0.75));
  els.push(Sq(W - 55, H - 125, 6, 0.7));
  els.push(L(W - 55, H - 125, W - 55, H - 175, sw3, 0.65));
  els.push(Dot(W - 55, H - 175, 2.5, 0.6));
  els.push(L(W, H - 175, W - 55, H - 175, sw3, 0.6));
  els.push(CV(`M${W},${H - 40} C${W - 30},${H - 40} ${W - 55},${H - 55} ${W - 100},${H - 65}`, sw2, 0.85));

  // ── ZIJKANTEN — verticale stammen ─────────────────────────────────────────
  const midY = H / 2;

  // Links
  els.push(L(0, midY - 70, 35, midY - 70, sw2, 0.75));
  els.push(L(35, midY - 70, 35, midY + 70, sw, 0.85));
  els.push(Dot(35, midY, 5, 0.9));
  els.push(Ring(35, midY, 9, 0.5));
  els.push(L(35, midY, 90, midY, sw, 0.85));
  els.push(Chip(72, midY, 26, 14, 0.9));
  els.push(L(35, midY + 70, 0, midY + 70, sw2, 0.75));
  els.push(Dot(35, midY - 70, 3, 0.7));
  els.push(Dot(35, midY + 70, 3, 0.7));
  // Extra aftakkingen links
  els.push(L(35, midY - 35, 0, midY - 35, sw3, 0.55));
  els.push(Sq(35, midY - 35, 5, 0.6));
  els.push(L(35, midY + 35, 0, midY + 35, sw3, 0.55));
  els.push(Sq(35, midY + 35, 5, 0.6));

  // Rechts
  els.push(L(W, midY - 70, W - 35, midY - 70, sw2, 0.75));
  els.push(L(W - 35, midY - 70, W - 35, midY + 70, sw, 0.85));
  els.push(Dot(W - 35, midY, 5, 0.9));
  els.push(Ring(W - 35, midY, 9, 0.5));
  els.push(L(W - 35, midY, W - 90, midY, sw, 0.85));
  els.push(Chip(W - 72, midY, 26, 14, 0.9));
  els.push(L(W - 35, midY + 70, W, midY + 70, sw2, 0.75));
  els.push(Dot(W - 35, midY - 70, 3, 0.7));
  els.push(Dot(W - 35, midY + 70, 3, 0.7));
  els.push(L(W - 35, midY - 35, W, midY - 35, sw3, 0.55));
  els.push(Sq(W - 35, midY - 35, 5, 0.6));
  els.push(L(W - 35, midY + 35, W, midY + 35, sw3, 0.55));
  els.push(Sq(W - 35, midY + 35, 5, 0.6));

  // ── BOVEN/ONDER MIDDEN ────────────────────────────────────────────────────
  const midX = W / 2;

  // Boven
  els.push(L(midX - 80, 0, midX - 80, 30, sw2, 0.7));
  els.push(L(midX - 80, 30, midX + 80, 30, sw, 0.75));
  els.push(Dot(midX, 30, 4, 0.8));
  els.push(Ring(midX, 30, 7, 0.5));
  els.push(L(midX + 80, 30, midX + 80, 0, sw2, 0.7));
  els.push(Dot(midX - 80, 30, 3, 0.65));
  els.push(Dot(midX + 80, 30, 3, 0.65));
  els.push(L(midX, 30, midX, 65, sw2, 0.65));
  els.push(Sq(midX, 65, 6, 0.6));
  // Extra boven chips
  els.push(Chip(midX - 40, 30, 18, 10, 0.7));
  els.push(Chip(midX + 40, 30, 18, 10, 0.7));

  // Onder
  els.push(L(midX - 80, H, midX - 80, H - 30, sw2, 0.7));
  els.push(L(midX - 80, H - 30, midX + 80, H - 30, sw, 0.75));
  els.push(Dot(midX, H - 30, 4, 0.8));
  els.push(Ring(midX, H - 30, 7, 0.5));
  els.push(L(midX + 80, H - 30, midX + 80, H, sw2, 0.7));
  els.push(Dot(midX - 80, H - 30, 3, 0.65));
  els.push(Dot(midX + 80, H - 30, 3, 0.65));
  els.push(L(midX, H - 30, midX, H - 65, sw2, 0.65));
  els.push(Sq(midX, H - 65, 6, 0.6));
  els.push(Chip(midX - 40, H - 30, 18, 10, 0.7));
  els.push(Chip(midX + 40, H - 30, 18, 10, 0.7));

  // ── GEBOGEN VERBINDINGEN — hoeken naar zijkanten ──────────────────────────
  els.push(CV(`M215,200 C190,${midY - 100} 70,${midY - 50} 90,${midY}`, sw2, 0.65));
  els.push(CV(`M${W - 215},200 C${W - 190},${midY - 100} ${W - 70},${midY - 50} ${W - 90},${midY}`, sw2, 0.65));
  els.push(CV(`M215,${H - 200} C190,${midY + 100} 70,${midY + 50} 90,${midY}`, sw2, 0.65));
  els.push(CV(`M${W - 215},${H - 200} C${W - 190},${midY + 100} ${W - 70},${midY + 50} ${W - 90},${midY}`, sw2, 0.65));

  // ── EXTRA DIAGONALE ACCENTEN (midden scherm) ──────────────────────────────
  const q1x = W * 0.25, q3x = W * 0.75;
  const q1y = H * 0.3,  q3y = H * 0.7;

  els.push(L(q1x, q1y, q1x + 40, q1y, sw3, 0.5));
  els.push(Dot(q1x, q1y, 2.5, 0.5));
  els.push(L(q1x, q1y, q1x, q1y + 40, sw3, 0.5));

  els.push(L(q3x, q1y, q3x - 40, q1y, sw3, 0.5));
  els.push(Dot(q3x, q1y, 2.5, 0.5));
  els.push(L(q3x, q1y, q3x, q1y + 40, sw3, 0.5));

  els.push(L(q1x, q3y, q1x + 40, q3y, sw3, 0.5));
  els.push(Dot(q1x, q3y, 2.5, 0.5));
  els.push(L(q1x, q3y, q1x, q3y - 40, sw3, 0.5));

  els.push(L(q3x, q3y, q3x - 40, q3y, sw3, 0.5));
  els.push(Dot(q3x, q3y, 2.5, 0.5));
  els.push(L(q3x, q3y, q3x, q3y - 40, sw3, 0.5));

  return els;
}
