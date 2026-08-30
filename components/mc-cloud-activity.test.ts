import { describe, expect, it } from "vitest";
import { getMcCloudActivityPresentation } from "../lib/mc-cloud-activity-state";

describe("MC-cloud activity presentation", () => {
  it("animates only active fetch states when motion is allowed", () => {
    expect(getMcCloudActivityPresentation("initial", false)).toMatchObject({ visible: true, busy: true, animated: true });
    expect(getMcCloudActivityPresentation("refreshing", false)).toMatchObject({ visible: true, busy: true, animated: true });
    expect(getMcCloudActivityPresentation("retrying", false)).toMatchObject({ visible: true, busy: true, animated: true });
  });

  it("uses a static busy indicator when Reduce Motion is enabled", () => {
    expect(getMcCloudActivityPresentation("refreshing", true)).toMatchObject({ visible: true, busy: true, animated: false });
  });

  it("never presents cached or fallback data as a live animated fetch", () => {
    expect(getMcCloudActivityPresentation("cached", false)).toEqual({
      visible: true,
      busy: false,
      animated: false,
      label: "Gecachte gegevens",
      tone: "cached",
    });
    expect(getMcCloudActivityPresentation("fallback", false)).toMatchObject({ busy: false, animated: false, tone: "fallback" });
  });

  it("keeps an idle placeholder non-accessible and visually hidden without changing its container contract", () => {
    expect(getMcCloudActivityPresentation("idle", false)).toMatchObject({ visible: false, busy: false, animated: false, label: "" });
  });
});
