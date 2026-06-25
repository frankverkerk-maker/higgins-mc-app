import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { AppBackground } from "@/components/app-background";
import { trpc } from "@/lib/trpc";
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

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch full analysis from Manus API if taskId is available
  useEffect(() => {
    if (taskId) {
      fetchAnalysis();
    }
  }, [taskId]);

  const fetchAnalysis = async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const apiKey = process.env.MANUS_API_KEY;
      if (!apiKey) {
        setAnalysis(higginsResponse || "Analyse niet beschikbaar");
        return;
      }

      const response = await fetch(
        `https://api.manus.ai/v2/task.listMessages?task_id=${encodeURIComponent(taskId)}&limit=10`,
        {
          headers: {
            "x-manus-api-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        setAnalysis(higginsResponse || "Analyse niet beschikbaar");
        return;
      }

      const data = await response.json() as {
        messages?: Array<{ type: string; content?: string; text?: string }>;
      };

      const messages = data.messages || [];
      const assistantMsg = messages.find((m) => m.type === "assistant_message");
      const fullAnalysis = assistantMsg?.content || assistantMsg?.text || higginsResponse;

      setAnalysis(fullAnalysis || "Analyse niet beschikbaar");
    } catch (error) {
      console.error("Error fetching analysis:", error);
      setAnalysis(higginsResponse || "Analyse niet beschikbaar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInManus = async () => {
    if (!taskId) {
      Alert.alert("Geen taak ID", "Dit document heeft geen Manus taak ID");
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
          "Analyse bekijken",
          `Taak ID: ${taskId}\n\nOpen manus.im om de volledige analyse te bekijken.`
        );
      }
    } catch (error) {
      Alert.alert("Fout", "Kan de analyse pagina niet openen");
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
              <Text style={s.backBtnText}>← Terug</Text>
            </Pressable>
            <Text style={s.headerTitle}>Document Analyse</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Document Info */}
          <View style={s.card}>
            <Text style={s.fileName}>{fileName}</Text>
            <Text style={s.meta}>Higgins Analyse</Text>
          </View>

          {/* Analysis Section */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Analyse</Text>
              {taskId && (
                <Pressable
                  style={({ pressed }) => [s.refreshBtn, pressed && { opacity: 0.6 }]}
                  onPress={fetchAnalysis}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={C.cyan} />
                  ) : (
                    <Text style={s.refreshBtnText}>↻</Text>
                  )}
                </Pressable>
              )}
            </View>

            <View style={s.analysisCard}>
              {isLoading ? (
                <View style={s.loadingContainer}>
                  <ActivityIndicator size="large" color={C.cyan} />
                  <Text style={s.loadingText}>Analyse wordt geladen...</Text>
                </View>
              ) : (
                <Text style={s.analysisText}>{analysis || higginsResponse || "Geen analyse beschikbaar"}</Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          {taskId && (
            <View style={s.actions}>
              <Pressable
                style={({ pressed }) => [s.manusBtn, pressed && { opacity: 0.7 }]}
                onPress={handleOpenInManus}
              >
                <Text style={s.manusBtnText}>Bekijk in Manus →</Text>
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
