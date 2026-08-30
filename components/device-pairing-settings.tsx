import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useDevicePairing } from "@/lib/device-pairing-provider";
import { useLanguage } from "@/lib/language-provider";

const C = {
  bg: "#0A0C0E",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(0,212,212,0.18)",
  cyan: "#00D4D4",
  cyanDim: "rgba(0,212,212,0.12)",
  text: "#E8EDF2",
  muted: "#75808D",
  green: "#00D4A0",
  red: "#F87171",
};

const FONT = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

const COPY = {
  nl: {
    title: "BEVEILIGD APPARAAT",
    paired: "Beveiligd gekoppeld",
    unpaired: "Nog niet gekoppeld",
    checking: "Koppeling controleren…",
    unsupported: "Passkeys worden in deze omgeving niet ondersteund.",
    description: "Koppel deze iPhone met een eenmalige code uit Mission Control. Face ID bevestigt gevoelige acties.",
    pairingId: "Pairing-ID",
    code: "Eenmalige code",
    pair: "Koppel met Face ID",
    reconnect: "Opnieuw verifiëren",
    disconnect: "Apparaat intrekken",
    scopes: "beveiligde bevoegdheden",
    expired: "De code of sessie is verlopen. Start een nieuwe koppeling in Mission Control.",
    invalid: "De pairinggegevens zijn ongeldig of al gebruikt.",
    confirmTitle: "Apparaat intrekken?",
    confirmMessage: "Dit verwijdert alle actieve sessies voor dit gekoppelde apparaat.",
    cancel: "Annuleren",
  },
  en: {
    title: "SECURE DEVICE",
    paired: "Securely paired",
    unpaired: "Not paired yet",
    checking: "Checking pairing…",
    unsupported: "Passkeys are not supported in this environment.",
    description: "Pair this iPhone with a one-time code from Mission Control. Face ID confirms sensitive actions.",
    pairingId: "Pairing ID",
    code: "One-time code",
    pair: "Pair with Face ID",
    reconnect: "Verify again",
    disconnect: "Revoke device",
    scopes: "protected permissions",
    expired: "The code or session expired. Start a new pairing in Mission Control.",
    invalid: "The pairing details are invalid or already used.",
    confirmTitle: "Revoke device?",
    confirmMessage: "This removes every active session for this paired device.",
    cancel: "Cancel",
  },
  de: {
    title: "SICHERES GERÄT",
    paired: "Sicher gekoppelt",
    unpaired: "Noch nicht gekoppelt",
    checking: "Kopplung wird geprüft…",
    unsupported: "Passkeys werden in dieser Umgebung nicht unterstützt.",
    description: "Koppeln Sie dieses iPhone mit einem Einmalcode aus Mission Control. Face ID bestätigt sensible Aktionen.",
    pairingId: "Pairing-ID",
    code: "Einmalcode",
    pair: "Mit Face ID koppeln",
    reconnect: "Erneut verifizieren",
    disconnect: "Gerät widerrufen",
    scopes: "geschützte Berechtigungen",
    expired: "Code oder Sitzung ist abgelaufen. Starten Sie eine neue Kopplung in Mission Control.",
    invalid: "Die Pairing-Daten sind ungültig oder bereits verwendet.",
    confirmTitle: "Gerät widerrufen?",
    confirmMessage: "Dadurch werden alle aktiven Sitzungen dieses Geräts entfernt.",
    cancel: "Abbrechen",
  },
} as const;

function feedback(): void {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function DevicePairingSettings() {
  const { language } = useLanguage();
  const copy = COPY[language];
  const { status, snapshot, errorCode, pair, reconnect, disconnect } = useDevicePairing();
  const [pairingId, setPairingId] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const busy = status === "checking" || status === "pairing";
  const canPair = pairingId.trim().length >= 10 && claimCode.replace(/[^A-Za-z0-9]/g, "").length === 12 && !busy;

  const errorMessage = useMemo(() => {
    if (!errorCode) return null;
    if (errorCode.includes("EXPIRED")) return copy.expired;
    return copy.invalid;
  }, [copy.expired, copy.invalid, errorCode]);

  const submitPairing = async () => {
    if (!canPair) return;
    feedback();
    try {
      await pair(pairingId, claimCode);
      setPairingId("");
      setClaimCode("");
    } catch { /* state is rendered by provider */ }
  };

  const confirmDisconnect = () => {
    Alert.alert(copy.confirmTitle, copy.confirmMessage, [
      { text: copy.cancel, style: "cancel" },
      { text: copy.disconnect, style: "destructive", onPress: () => { feedback(); void disconnect(); } },
    ]);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{copy.title}</Text>
      <View style={styles.card} accessibilityLabel={copy.title}>
        <View style={styles.statusRow}>
          <View style={[styles.icon, status === "paired" && styles.iconPaired]}>
            <Text style={styles.iconText}>⌁</Text>
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.title}>
              {status === "paired" ? copy.paired : status === "checking" ? copy.checking : copy.unpaired}
            </Text>
            <Text style={styles.description}>{status === "unsupported" ? copy.unsupported : copy.description}</Text>
          </View>
          {busy ? <ActivityIndicator size="small" color={C.cyan} accessibilityLabel={copy.checking} /> : (
            <View style={[styles.dot, { backgroundColor: status === "paired" ? C.green : C.muted }]} />
          )}
        </View>

        {status === "paired" && snapshot ? (
          <View style={styles.controls}>
            <Text style={styles.meta}>{snapshot.scopes.length} {copy.scopes}</Text>
            <View style={styles.buttonRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.reconnect} style={styles.secondaryButton} onPress={() => void reconnect()}>
                <Text style={styles.secondaryText}>{copy.reconnect}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.disconnect} style={styles.dangerButton} onPress={confirmDisconnect}>
                <Text style={styles.dangerText}>{copy.disconnect}</Text>
              </Pressable>
            </View>
          </View>
        ) : status !== "unsupported" ? (
          <View style={styles.controls}>
            <TextInput
              accessibilityLabel={copy.pairingId}
              style={styles.input}
              value={pairingId}
              onChangeText={setPairingId}
              placeholder={copy.pairingId}
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="oneTimeCode"
            />
            <TextInput
              accessibilityLabel={copy.code}
              style={[styles.input, styles.codeInput]}
              value={claimCode}
              onChangeText={setClaimCode}
              placeholder={copy.code}
              placeholderTextColor={C.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={16}
              textContentType="oneTimeCode"
            />
            {errorMessage ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.pair}
              accessibilityState={{ disabled: !canPair, busy }}
              disabled={!canPair}
              style={[styles.primaryButton, !canPair && styles.disabledButton]}
              onPress={() => void submitPairing()}
            >
              {status === "pairing" ? <ActivityIndicator size="small" color={C.bg} /> : <Text style={styles.primaryText}>{copy.pair}</Text>}
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: "700", color: C.muted, fontFamily: FONT_BOLD, letterSpacing: 2, marginBottom: 10, marginLeft: 4 },
  card: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  statusRow: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(117,128,141,0.12)", borderWidth: 1, borderColor: "rgba(117,128,141,0.24)" },
  iconPaired: { backgroundColor: C.cyanDim, borderColor: C.border },
  iconText: { color: C.cyan, fontFamily: FONT_BOLD, fontSize: 20 },
  statusCopy: { flex: 1 },
  title: { color: C.text, fontFamily: FONT_BOLD, fontWeight: "700", fontSize: 15 },
  description: { color: C.muted, fontFamily: FONT, fontSize: 11, lineHeight: 16, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  controls: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", padding: 14, gap: 10 },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(255,255,255,0.035)", color: C.text, paddingHorizontal: 13, fontSize: 13, fontFamily: FONT },
  codeInput: { letterSpacing: 2, fontFamily: FONT_BOLD },
  error: { color: C.red, fontSize: 11, lineHeight: 16, fontFamily: FONT },
  meta: { color: C.muted, fontSize: 11, fontFamily: FONT },
  buttonRow: { flexDirection: "row", gap: 8 },
  primaryButton: { minHeight: 44, borderRadius: 12, backgroundColor: C.cyan, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  disabledButton: { opacity: 0.4 },
  primaryText: { color: C.bg, fontFamily: FONT_BOLD, fontSize: 13, fontWeight: "800" },
  secondaryButton: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  secondaryText: { color: C.cyan, fontFamily: FONT_BOLD, fontSize: 11 },
  dangerButton: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: "rgba(248,113,113,0.3)", backgroundColor: "rgba(248,113,113,0.08)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  dangerText: { color: C.red, fontFamily: FONT_BOLD, fontSize: 11 },
});
