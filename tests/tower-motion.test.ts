import { describe, expect, it } from "vitest";
import { TOWER_MOTION_MS, towerMotionTarget } from "../lib/tower-motion";

const idle = { expanded: false, hovered: false, focused: false, pressed: false, reducedMotion: false };

describe("Higgins Tower-interacties", () => {
  it("highlights only the card under the mouse", () => {
    expect(towerMotionTarget(idle)).toMatchObject({ highlight: 0, pressure: 0, arrow: 0 });
    expect(towerMotionTarget({ ...idle, hovered: true })).toMatchObject({ highlight: 1, pressure: 0 });
    expect(towerMotionTarget(idle).highlight).toBe(0);
  });

  it("provides the same visible feedback for keyboard focus", () => {
    expect(towerMotionTarget({ ...idle, focused: true }).highlight).toBe(1);
  });

  it("keeps the selected floor and chevron visibly active until another floor opens", () => {
    expect(towerMotionTarget({ ...idle, expanded: true })).toMatchObject({ highlight: 0.68, arrow: 1 });
    expect(towerMotionTarget({ ...idle, expanded: true, hovered: true }).highlight).toBe(1);
    expect(towerMotionTarget(idle).arrow).toBe(0);
  });

  it("gives short press feedback and respects reduced-motion preferences", () => {
    expect(towerMotionTarget({ ...idle, pressed: true }).pressure).toBe(1);
    expect(towerMotionTarget({ ...idle, expanded: true, hovered: true, pressed: true, reducedMotion: true }))
      .toMatchObject({ highlight: 1, pressure: 1, arrow: 1, highlightDuration: 0, pressDuration: 0, arrowDuration: 0 });
  });

  it("uses restrained transition durations for normal motion", () => {
    expect(TOWER_MOTION_MS).toEqual({ highlight: 180, press: 100, arrow: 200, layout: 240, enter: 200, exit: 130 });
    expect(Math.max(...Object.values(TOWER_MOTION_MS))).toBeLessThanOrEqual(300);
  });
});
