import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { AppBackground } from "@/components/app-background";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/lib/language-provider";
import { getApiBaseUrl } from "@/constants/oauth";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         "#0A0C0E",
  surface:    "#111418",
  border:     "#1E2530",
  cyan:       "#00D4D4",
  cyanDim:    "rgba(0,212,212,0.12)",
  text:       "#E8EDF2",
  muted:      "#5A6472",
  inputBg:    "#161B21",
  inputBorder:"#252D38",
};
const FONT      = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

// ─── Manus taak URL helper ────────────────────────────────────────────────────
function getManusTaskUrl(taskId: string): string {
  // Manus task pagina's zijn bereikbaar via https://manus.im/share/{taskId}
  // of via de app op https://app.manus.ai/task/{taskId}
  return `https://manus.im/share/${taskId}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type DocEntry = {
  id: string;
  fileName: string;
  url: string;
  sizeBytes?: number;
  pageCount?: number;
  higginsResponse: string;
  assignedAgent?: string;
  delegationTaskId?: string;
  uploadedAt: string;
};

const DOCS_STORAGE_KEY = "higgins_docs_library";

export default function DocsScreen() {
  const { t, language } = useLanguage();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const uploadPdfMutation = trpc.higgins.uploadPdf.useMutation();

  // ─── Gefilterde lijst op basis van zoekterm ──────────────────────────────
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase();
    return docs.filter(d =>
      d.fileName.toLowerCase().includes(q) ||
      d.higginsResponse.toLowerCase().includes(q) ||
      (d.assignedAgent ?? "").toLowerCase().includes(q)
    );
  }, [docs, searchQuery]);

  // ─── Laden en opslaan ────────────────────────────────────────────────────
  const loadDocs = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(DOCS_STORAGE_KEY);
      if (raw) setDocs(JSON.parse(raw));
    } catch (_) {}
  }, []);

  const saveDocs = useCallback(async (updated: DocEntry[]) => {
    try {
      await AsyncStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadDocs();
    AsyncStorage.getItem("higgins_user_name").then(n => setUserName(n));
  }, [loadDocs]);

  // ─── Synchroniseer met chat history ─────────────────────────────────────
  useEffect(() => {
    const syncFromChat = async () => {
      try {
        const raw = await AsyncStorage.getItem("higgins_chat_messages");
        if (!raw) return;
        const messages: Array<{
          type?: string;
          pdfUrl?: string;
          pdfFileName?: string;
          pdfSizeBytes?: number;
          pageCount?: number;
          content?: string;
          assignedAgent?: string;
          delegationTaskId?: string;
          timestamp?: string;
          id?: string;
        }> = JSON.parse(raw);
        const pdfMsgs = messages.filter(m => m.type === "pdf" && m.pdfUrl);
        const existingIds = new Set(docs.map(d => d.id));
        const newEntries: DocEntry[] = pdfMsgs
          .filter(m => m.id && !existingIds.has(m.id))
          .map(m => ({
            id: m.id!,
            fileName: m.pdfFileName ?? "document.pdf",
            url: m.pdfUrl!,
            sizeBytes: m.pdfSizeBytes,
            pageCount: m.pageCount,
            higginsResponse: m.content ?? "",
            assignedAgent: m.assignedAgent,
            delegationTaskId: m.delegationTaskId,
            uploadedAt: m.timestamp ?? new Date().toISOString(),
          }));
        if (newEntries.length > 0) {
          const merged = [...newEntries, ...docs].sort(
            (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          );
          setDocs(merged);
          await saveDocs(merged);
        }
      } catch (_) {}
    };
    syncFromChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDocs();
    setRefreshing(false);
  }, [loadDocs]);

  // ─── Upload ──────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "*/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;
      setIsUploading(true);

      const newEntries: DocEntry[] = [];
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const fileName = asset.name ?? `document_${Date.now()}_${i}.pdf`;
        const mimeType = asset.mimeType ?? "application/pdf";
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const uploadResult = await uploadPdfMutation.mutateAsync({
            base64, fileName, mimeType,
            userName: userName ?? undefined,
            language,
          });
          newEntries.push({
            id: `${Date.now()}_${i}`,
            fileName: uploadResult.fileName,
            url: uploadResult.url,
            sizeBytes: uploadResult.sizeBytes,
            pageCount: (uploadResult as any).pageCount,
            higginsResponse: uploadResult.higginsResponse,
            assignedAgent: (uploadResult as any).assignedAgent,
            delegationTaskId: (uploadResult as any).delegationTaskId,
            uploadedAt: new Date().toISOString(),
          });
        } catch (_) {
          Alert.alert("Fout", `Kon ${fileName} niet uploaden.`);
        }
      }

      if (newEntries.length > 0) {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const merged = [...newEntries, ...docs].sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
        setDocs(merged);
        await saveDocs(merged);
      }
    } catch (_) {
      Alert.alert("Fout", "Upload mislukt. Probeer opnieuw.");
    } finally {
      setIsUploading(false);
    }
  }, [docs, language, saveDocs, uploadPdfMutation, userName]);

  // ─── Verwijderen ─────────────────────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      "Document verwijderen",
      "Weet u zeker dat u dit document uit de bibliotheek wilt verwijderen?",
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: async () => {
            const updated = docs.filter(d => d.id !== id);
            setDocs(updated);
            await saveDocs(updated);
          },
        },
      ]
    );
  }, [docs, saveDocs]);

  // ─── PDF openen ──────────────────────────────────────────────────────────
  const handleOpen = useCallback(async (doc: DocEntry) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const baseUrl = getApiBaseUrl();
      const fullUrl = doc.url.startsWith("http") ? doc.url : `${baseUrl}${doc.url}`;
      await Linking.openURL(fullUrl);
    } catch (_) {
      Alert.alert("Fout", "Kan de PDF niet openen.");
    }
  }, []);

  // ─── Manus analyse openen ────────────────────────────────────────────────
  const handleViewAnalysis = useCallback(async (taskId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const url = getManusTaskUrl(taskId);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Analyse bekijken",
          `Taak ID: ${taskId}\n\nOpen manus.im om de volledige analyse te bekijken.`
        );
      }
    } catch (_) {
      Alert.alert("Fout", "Kan de analyse pagina niet openen.");
    }
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("nl-NL", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch (_) { return ""; }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── Document kaart ──────────────────────────────────────────────────────
  const renderDoc = ({ item }: { item: DocEntry }) => (
    <View style={styles.card}>
      {/* Header rij */}
      <View style={styles.cardHeader}>
        <View style={styles.docIconWrap}>
          <Text style={styles.docIcon}>📄</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.docName} numberOfLines={1}>{item.fileName}</Text>
          <Text style={styles.docMeta}>
            PDF{item.pageCount ? ` · ${item.pageCount} pag.` : ""}{item.sizeBytes ? ` · ${formatSize(item.sizeBytes)}` : ""} · {formatDate(item.uploadedAt)}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </Pressable>
      </View>

      {/* Higgins samenvatting */}
      {!!item.higginsResponse && (
        <Text style={styles.docCaption} numberOfLines={4}>{item.higginsResponse}</Text>
      )}

      {/* Agent badge */}
      {!!item.assignedAgent && (
        <View style={styles.agentBadge}>
          <Text style={styles.agentBadgeText}>⚡ {item.assignedAgent}</Text>
        </View>
      )}

      {/* Actie knoppen */}
      <View style={styles.cardActions}>
        {/* Bekijk volledige analyse — alleen tonen als er een taak ID is */}
        {!!item.delegationTaskId && (
          <Pressable
            style={({ pressed }) => [styles.analysisBtn, pressed && { opacity: 0.7 }]}
            onPress={() => handleViewAnalysis(item.delegationTaskId!)}
          >
            <Text style={styles.analysisBtnText}>Bekijk analyse →</Text>
          </Pressable>
        )}
        {/* PDF openen */}
        <Pressable
          style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.7 }]}
          onPress={() => handleOpen(item)}
        >
          <Text style={styles.openBtnText}>Openen ↓</Text>
        </Pressable>
      </View>
    </View>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <AppBackground>
      <ScreenContainer containerClassName="bg-transparent" safeAreaClassName="bg-transparent">
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Documenten</Text>
            <Text style={styles.headerSub}>
              {docs.length === 0
                ? "Geen documenten"
                : `${filteredDocs.length}${searchQuery ? ` van ${docs.length}` : ""} document${docs.length !== 1 ? "en" : ""}`}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.75 }, isUploading && { opacity: 0.5 }]}
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading
              ? <ActivityIndicator size="small" color={C.bg} />
              : <Text style={styles.uploadBtnText}>+ Upload</Text>
            }
          </Pressable>
        </View>

        {/* Zoekbalk — alleen tonen als er documenten zijn */}
        {docs.length > 0 && (
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Zoek op naam, inhoud of teamlid..."
              placeholderTextColor={C.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable
                style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.6 }]}
                onPress={() => setSearchQuery("")}
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Lege staat of lijst */}
        {docs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>Geen documenten</Text>
            <Text style={styles.emptySubtitle}>
              Upload een PDF via de chat of de knop hierboven.{"\n"}Higgins analyseert het document en delegeert naar het juiste teamlid.
            </Text>
          </View>
        ) : filteredDocs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Geen resultaten</Text>
            <Text style={styles.emptySubtitle}>
              Geen documenten gevonden voor "{searchQuery}".
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredDocs}
            keyExtractor={item => item.id}
            renderItem={renderDoc}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.cyan}
              />
            }
          />
        )}
      </ScreenContainer>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    fontFamily: FONT_BOLD,
  },
  headerSub: {
    fontSize: 12,
    color: C.muted,
    fontFamily: FONT,
    marginTop: 2,
  },
  uploadBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: C.cyan,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.bg,
    fontFamily: FONT_BOLD,
  },
  // ─── Zoekbalk ─────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.inputBorder,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    fontFamily: FONT,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtnText: {
    fontSize: 10,
    color: C.bg,
    fontWeight: "700",
  },
  // ─── Document kaart (Manus witte stijl) ──────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  docIcon: { fontSize: 18 },
  docName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    fontFamily: FONT_BOLD,
  },
  docMeta: {
    fontSize: 11,
    color: "#888888",
    fontFamily: FONT,
    marginTop: 1,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "700",
  },
  docCaption: {
    fontSize: 12,
    color: "#555555",
    fontFamily: FONT,
    lineHeight: 18,
    marginBottom: 8,
  },
  agentBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#F0FDF4",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 10,
  },
  agentBadgeText: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "700",
    fontFamily: FONT_BOLD,
  },
  // ─── Actie knoppen ────────────────────────────────────────────────────────
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  analysisBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  analysisBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
    fontFamily: FONT_BOLD,
  },
  openBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#0891b2",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: FONT_BOLD,
  },
  // ─── Lege staat ───────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    fontFamily: FONT_BOLD,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.muted,
    fontFamily: FONT,
    textAlign: "center",
    lineHeight: 20,
  },
});
