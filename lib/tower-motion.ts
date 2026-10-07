export const TOWER_MOTION_MS = {
  highlight: 180,
  press: 100,
  arrow: 200,
  layout: 240,
  enter: 200,
  exit: 130,
} as const;

export type TowerMotionInput = {
  expanded: boolean;
  hovered: boolean;
  focused: boolean;
  pressed: boolean;
  reducedMotion: boolean;
};

/** Each floor has independent presentation state; only expanded belongs to Tower. */
export function towerMotionTarget(input: TowerMotionInput) {
  const { expanded, hovered, focused, pressed, reducedMotion } = input;
  return {
    highlight: hovered || focused ? 1 : expanded ? 0.68 : 0,
    pressure: pressed ? 1 : 0,
    arrow: expanded ? 1 : 0,
    highlightDuration: reducedMotion ? 0 : TOWER_MOTION_MS.highlight,
    pressDuration: reducedMotion ? 0 : TOWER_MOTION_MS.press,
    arrowDuration: reducedMotion ? 0 : TOWER_MOTION_MS.arrow,
  };
}
