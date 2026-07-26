import { describe, it, expect } from "vitest";
import { nl } from "../lib/i18n/nl";
import { de } from "../lib/i18n/de";
import { en } from "../lib/i18n/en";

// Verifieert dat alle talen exact dezelfde sleutels per sectie hebben.
// Dit voorkomt dat content "stilletjes" in het Nederlands blijft staan in DE/EN.

const SECTIONS = ["common", "tabs", "onboarding", "dashboard", "chat", "agents", "settings", "push"] as const;

function keysOf(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).sort();
}

describe("i18n locale consistency", () => {
  for (const section of SECTIONS) {
    it(`section "${section}" has identical keys across nl/de/en`, () => {
      const nlKeys = keysOf((nl as any)[section]);
      const deKeys = keysOf((de as any)[section]);
      const enKeys = keysOf((en as any)[section]);
      expect(deKeys).toEqual(nlKeys);
      expect(enKeys).toEqual(nlKeys);
    });
  }

  it("dashboard contains the newly added translation keys", () => {
    const required = [
      "quickCommands", "speakWithHiggins", "speakWithHigginsSub", "via",
      "prio1", "prio2", "prio3",
      "qcDailyBrief", "qcPlanMeeting", "qcSendReport", "qcDelegateEmail", "qcSearchInfo", "qcQuickAction",
      "taskPrepBriefing", "taskProcessEmails", "taskAwaitingOrder",
      "approvalNathalieAction", "approvalWarrenAction", "timeMinAgo", "timeHourAgo",
    ];
    for (const key of required) {
      expect((nl.dashboard as any)[key], `nl.${key}`).toBeTruthy();
      expect((de.dashboard as any)[key], `de.${key}`).toBeTruthy();
      expect((en.dashboard as any)[key], `en.${key}`).toBeTruthy();
    }
  });

  it("German dashboard values are NOT identical to Dutch (real translation, not copy)", () => {
    // Steekproef: deze koppen/teksten moeten echt verschillen tussen NL en DE
    const sample = ["quickCommands", "speakWithHiggins", "prio1", "qcPlanMeeting", "taskAwaitingOrder"];
    for (const key of sample) {
      expect((de.dashboard as any)[key]).not.toBe((nl.dashboard as any)[key]);
    }
  });

  it("settings section has edition keys in every locale", () => {
    const required = ["edition", "editionInternal", "editionWhitelab", "editionDesc", "editionOperatorNote"];
    for (const key of required) {
      expect((nl.settings as any)[key], `nl.${key}`).toBeTruthy();
      expect((de.settings as any)[key], `de.${key}`).toBeTruthy();
      expect((en.settings as any)[key], `en.${key}`).toBeTruthy();
    }
    // DE moet echt vertaald zijn (geen NL-kopie)
    expect((de.settings as any).editionInternal).not.toBe((nl.settings as any).editionInternal);
  });

  it("agents section has departmentsPlural in every locale", () => {
    expect((nl.agents as any).departmentsPlural).toBe("Departementen");
    expect((de.agents as any).departmentsPlural).toBe("Abteilungen");
    expect((en.agents as any).departmentsPlural).toBe("Departments");
  });
});
