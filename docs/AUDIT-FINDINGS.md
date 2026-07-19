# Higgins MC Full App Audit — Findings

## Files Audited
- app/_layout.tsx (root layout)
- app/(tabs)/_layout.tsx (tab navigation)
- app/(tabs)/index.tsx (Command Center)
- app/(tabs)/chat.tsx (Chat — previously audited, 3 bugs fixed)
- app/(tabs)/agents.tsx (Team Pulse)
- app/(tabs)/tower.tsx (Higgins Tower)
- app/(tabs)/docs.tsx (Documents)
- app/(tabs)/doc-detail.tsx (Document Detail — hidden)
- app/(tabs)/settings.tsx (Settings)
- app/onboarding.tsx (Onboarding)
- server/routers.ts (tRPC API routes)

---

## CRITICAL BUGS (must fix)

### BUG-1: Logout button does nothing
**File:** `app/(tabs)/settings.tsx` line 128-130
**Issue:** `handleLogout` only triggers haptic feedback but performs NO actual logout action. No AsyncStorage clear, no navigation to onboarding, no state reset.
**Impact:** User cannot log out / reset the app.
**Fix:** Clear USER_NAME_KEY + chat history + navigate to onboarding.

### BUG-2: doc-detail uses client-side process.env.MANUS_API_KEY
**File:** `app/(tabs)/doc-detail.tsx` line 57
**Issue:** `process.env.MANUS_API_KEY` is accessed on the client side (React Native). Environment variables are NOT available in the client bundle unless prefixed with EXPO_PUBLIC_. This will always be undefined.
**Impact:** The Manus API fetch will always fail silently, falling back to the passed higginsResponse. The "refresh" button is effectively non-functional.
**Fix:** Move the API call to a tRPC server route, or remove the dead code and rely solely on higginsResponse.

### BUG-3: Settings toggles (notifications, briefing, haptic) are not persisted
**File:** `app/(tabs)/settings.tsx` lines 48-50, 123-126
**Issue:** The three toggle states (notifications, briefingEnabled, hapticEnabled) use useState but are never saved to AsyncStorage. On app restart they reset to defaults.
**Impact:** User thinks they disabled notifications but the setting is lost on restart.
**Fix:** Load from AsyncStorage on mount, save on toggle.

### BUG-4: docs.tsx uses "higgins_user_name" key, rest of app uses USER_NAME_KEY
**File:** `app/(tabs)/docs.tsx` line 99
**Issue:** `AsyncStorage.getItem("higgins_user_name")` — this is the same value as USER_NAME_KEY but hardcoded as a string instead of importing the constant. If the key ever changes, docs.tsx will break silently.
**Impact:** Low risk currently (same string), but maintenance hazard.
**Fix:** Import USER_NAME_KEY from onboarding.tsx.

---

## MEDIUM ISSUES

### MED-1: Onboarding initialRouteName race condition
**File:** `app/_layout.tsx` lines 51-58, 124
**Issue:** The Stack's `initialRouteName` is set based on `needsOnboarding` state, but this state is set asynchronously (after AsyncStorage read). On first render, `needsOnboarding` is false (default), so the Stack renders "(tabs)" even if the user hasn't onboarded yet. The check completes after the Stack is already mounted.
**Impact:** Brief flash of tabs before onboarding appears on fresh install.
**Fix:** Don't render Stack until `onboardingChecked` is true, or use a redirect in the tabs layout.

### MED-2: docs.tsx syncFromChat runs on every mount without deduplication guard
**File:** `app/(tabs)/docs.tsx` lines 102-147
**Issue:** The sync effect reads chat history and merges into docs on every component mount. It checks `existingIds` but uses the initial empty `docs` state (closure captures initial value). If docs haven't loaded yet from AsyncStorage, it may re-add entries.
**Impact:** Potential duplicate documents appearing briefly.
**Fix:** Add a guard that waits for `loadDocs` to complete before running sync.

### MED-3: Hardcoded Dutch strings in doc-detail.tsx
**File:** `app/(tabs)/doc-detail.tsx` lines 59, 85, 88, 97, 104, 111, 114, 132, 133, 134, 142
**Issue:** All UI text is hardcoded Dutch ("Terug", "Document Analyse", "Analyse niet beschikbaar", etc.) instead of using the i18n system.
**Impact:** German and English users see Dutch text on this screen.
**Fix:** Add doc-detail keys to i18n files and use t.docDetail.xxx.

### MED-4: Settings Alert messages hardcoded Dutch
**File:** `app/(tabs)/settings.tsx` lines 89, 104, 118
**Issue:** Alert.alert messages are hardcoded Dutch ("Fout", "Locatie niet gevonden") instead of i18n.
**Impact:** German/English users see Dutch alerts.
**Fix:** Use t.settings.xxx for alert messages.

### MED-5: Command Center weather/news section labels partially hardcoded
**File:** `app/(tabs)/index.tsx` lines 282-284, 330-334, 298-319
**Issue:** Some weather labels use inline ternary (language === "de" ? ... : ...) instead of the i18n system. This is inconsistent and will break if more languages are added.
**Impact:** Maintenance hazard, inconsistent i18n approach.
**Fix:** Move all these strings to the i18n files.

---

## LOW ISSUES / IMPROVEMENTS

### LOW-1: Siri Shortcuts settings section appears AFTER logout button
**File:** `app/(tabs)/settings.tsx` lines 441-451
**Issue:** The Siri section renders below the logout button, which is unusual UX (logout should be last).
**Fix:** Move SiriShortcutsSettings above the logout section.

### LOW-2: approvalsQuery.refetch() in useEffect dependency array
**File:** `app/(tabs)/index.tsx` lines 176-179
**Issue:** `approvalsQuery` object reference changes on every render, potentially causing infinite re-renders. Should use `approvalsQuery.refetch` as the dependency or wrap in useCallback.
**Impact:** Possible unnecessary re-fetches (mitigated by staleTime).
**Fix:** Remove approvalsQuery from dependency array or use a ref.

### LOW-3: iPad sidebar SIDEBAR_WIDTH imported but not used in _layout.tsx
**File:** `app/(tabs)/_layout.tsx` line 7
**Issue:** `SIDEBAR_WIDTH` is imported but never referenced in this file.
**Impact:** Dead import, no runtime issue.
**Fix:** Remove unused import.

---

## SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 4 | To fix |
| Medium | 5 | To fix |
| Low | 3 | Optional |

**Priority fixes:** BUG-1 (logout), BUG-2 (dead client API call), BUG-3 (toggle persistence), MED-1 (onboarding flash)
