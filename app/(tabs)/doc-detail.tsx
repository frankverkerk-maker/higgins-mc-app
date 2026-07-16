import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { AppBackground } from "@/components/app-background";
import { useLanguage } from "@/lib/language-provider";

const C = {
  bg: "#0A0C0E",
  surface: "#111418",
  border: "#1E2530",
  cyan: "#00D4D4",
  text: "#E8EDF2",
  muted: "#5A6472",
  green: "#00D4A0",
};

const FONT = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

export default function DocDetailScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { docId, fileName, higginsResponse, taskId } = useLocalSearchParams<{
    docId: string;
    fileName: string;
    higginsResponse: string;
    taskId: string;
  }>();

  // Analysis content comes from the higginsResponse param (server-side generated)
  const analysis = higginsResponse || null;

  const handleOpenInManus = async () => {
    if (!taskId) {
      Alert.alert(t.docDetail.noTaskId, t.docDetail.noTaskIdDesc);
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    try {
      const url = `https://manus.im/share/${taskId}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          t.docDetail.viewAnalysis,
          `Taak ID: ${taskId}\n\n${t.docDetail.viewAnalysisDesc}`
        );
      }
    } catch (error) {
      Alert.alert(t.docDetail.errorOpen, t.docDetail.errorOpenDesc);
    }
  };

  return (
    <AppBackground>
      <ScreenContainer containerClassName="bg-transparent" safeAreaClassName="bg-transparent">
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable
              style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
            >
              <Text style={s.backBtnText}>{t.docDetail.back}</Text>
            </Pressable>
            <Text style={s.headerTitle}>{t.docDetail.title}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Document Info */}
          <View style={s.card}>
            <Text style={s.fileName}>{fileName}</Text>
            <Text style={s.meta}>{t.docDetail.higginsAnalysis}</Text>
          </View>

          {/* Analysis Section */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{t.docDetail.analysis}</Text>
            </View>

            <View style={s.analysisCard}>
              <Text style={s.analysisText}>{analysis || t.docDetail.noAnalysis}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          {taskId && (
            <View style={s.actions}>
              <Pressable
                style={({ pressed }) => [s.manusBtn, pressed && { opacity: 0.7 }]}
                onPress={handleOpenInManus}
              >
                <Text style={s.manusBtnText}>{t.docDetail.viewInManus}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </AppBackground>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: C.cyan,
    fontWeight: "600",
    fontFamily: FONT,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    fontFamily: FONT_BOLD,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshBtnText: {
    fontSize: 18,
    color: C.cyan,
    fontWeight: "600",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    fontFamily: FONT_BOLD,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: C.muted,
    fontFamily: FONT,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.cyan,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: FONT_BOLD,
  },
  analysisCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 200,
  },
  analysisText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
    fontFamily: FONT,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: C.muted,
    fontFamily: FONT,
  },
  actions: {
    marginHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  manusBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.cyan,
    borderRadius: 8,
    alignItems: "center",
  },
  manusBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.bg,
    fontFamily: FONT_BOLD,
  },
});
