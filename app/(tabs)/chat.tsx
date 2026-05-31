import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { sendMessageToHiggins } from "@/lib/manus-api";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         "#0A0C0E",
  surface:    "#111418",
  surface2:   "#161B21",
  border:     "#1E2530",
  cyan:       "#00D4D4",
  cyanDim:    "rgba(0,212,212,0.12)",
  cyanBorder: "rgba(0,212,212,0.25)",
  text:       "#E8EDF2",
  muted:      "#5A6472",
  userBubble: "#0D2A2A",
  userBorder: "rgba(0,212,212,0.3)",
  green:      "#00D4A0",
  greenDim:   "rgba(0,212,160,0.15)",
};
const FONT      = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

const API_KEY_STORAGE = "higgins_manus_api_key";
const TASK_ID_STORAGE = "higgins_task_id";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "0",
    role: "assistant",
    content: "Goedemiddag. Ik ben Higgins, uw Chief of Staff & Butler. Hoe kan ik u vandaag van dienst zijn?",
    timestamp: new Date(),
  },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isLive, setIsLive] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Laad opgeslagen API key en task ID bij opstarten
  useEffect(() => {
    (async () => {
      const storedKey = await AsyncStorage.getItem(API_KEY_STORAGE);
      const storedTaskId = await AsyncStorage.getItem(TASK_ID_STORAGE);
      if (storedKey) {
        setApiKey(storedKey);
        setIsLive(true);
      }
      if (storedTaskId) setTaskId(storedTaskId);
    })();
  }, []);

  const saveApiKey = useCallback(async () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    await AsyncStorage.setItem(API_KEY_STORAGE, key);
    setApiKey(key);
    setIsLive(true);
    setShowApiKeyModal(false);
    setApiKeyInput("");
  }, [apiKeyInput]);

  const disconnectApi = useCallback(async () => {
    await AsyncStorage.removeItem(API_KEY_STORAGE);
    await AsyncStorage.removeItem(TASK_ID_STORAGE);
    setApiKey(null);
    setTaskId(null);
    setIsLive(false);
    setMessages(INITIAL_MESSAGES);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    if (apiKey) {
      // Live modus: stuur naar Manus API
      const result = await sendMessageToHiggins({
        content: text,
        apiKey,
        taskId: taskId ?? undefined,
      });

      if (result.taskId && result.taskId !== taskId) {
        setTaskId(result.taskId);
        await AsyncStorage.setItem(TASK_ID_STORAGE, result.taskId);
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.ok
          ? result.response
          : `Er is een fout opgetreden: ${result.error ?? "Onbekende fout"}. Controleer uw API verbinding in de Instellingen.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } else {
      // Demo modus: gesimuleerd antwoord
      await new Promise((r) => setTimeout(r, 1200));
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `U bent in demo modus. Verbind de Manus API via de sleutel-knop rechtsboven om live antwoorden van Higgins te ontvangen.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }

    setIsLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, isLoading, apiKey, taskId]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && <HigginsAvatar size={32} />}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <HigginsAvatar size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>Higgins</Text>
            <View style={styles.headerStatus}>
              <View style={[styles.headerStatusDot, { backgroundColor: isLive ? "#34D399" : "#F59E0B" }]} />
              <Text style={styles.headerStatusText}>
              {isLive ? "Chief of Staff & Butler · Live" : "Chief of Staff & Butler · Demo modus"}
            </Text>
            </View>
          </View>
          {/* API verbinding knop */}
          <Pressable
            style={({ pressed }) => [styles.apiButton, pressed && { opacity: 0.7 }]}
            onPress={() => isLive ? disconnectApi() : setShowApiKeyModal(true)}
          >
            <Text style={[styles.apiButtonText, { color: isLive ? C.green : C.muted }]}>
              {isLive ? "⚡ Live" : "🔑 Verbind"}
            </Text>
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Typing indicator */}
        {isLoading && (
          <View style={styles.typingRow}>
            <HigginsAvatar size={32} />
            <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
              <ActivityIndicator size="small" color={C.cyan} />
            </View>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Stel een vraag aan Higgins..."
            placeholderTextColor={C.muted}
            multiline
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || isLoading) && styles.sendButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>›</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* API Key Modal */}
      <Modal
        visible={showApiKeyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApiKeyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Verbind Manus API</Text>
            <Text style={styles.modalSubtitle}>
              Voer uw Manus API sleutel in om live gesprekken met Higgins te voeren.
              U vindt uw API sleutel in de Manus instellingen.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="manus-api-key-..."
              placeholderTextColor={C.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.modalButtonCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowApiKeyModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Annuleren</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalButtonSave, pressed && { opacity: 0.7 }]}
                onPress={saveApiKey}
              >
                <Text style={styles.modalButtonSaveText}>Verbinden</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  headerName: { fontSize: 16, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD },
  headerStatus: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  headerStatusDot: { width: 6, height: 6, borderRadius: 3 },
  headerStatusText: { fontSize: 11, color: C.cyan, fontFamily: FONT, letterSpacing: 0.3 },
  apiButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.cyanBorder },
  apiButtonText: { fontSize: 12, fontWeight: "700", fontFamily: FONT_BOLD },
  messageList: { padding: 16, gap: 12 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 },
  messageRowUser: { flexDirection: "row-reverse" },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleAssistant: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: C.userBubble, borderWidth: 1, borderColor: C.userBorder, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: C.text, lineHeight: 21, fontFamily: FONT },
  bubbleTextUser: { color: C.cyan },
  bubbleTime: { fontSize: 10, color: C.muted, marginTop: 4, textAlign: "right", fontFamily: FONT },
  bubbleTimeUser: { color: "rgba(0,212,212,0.5)" },
  typingRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  typingBubble: { paddingVertical: 12, paddingHorizontal: 16 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  input: { flex: 1, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: C.text, maxHeight: 100, lineHeight: 20, fontFamily: FONT },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cyan, alignItems: "center", justifyContent: "center", shadowColor: C.cyan, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8 },
  sendButtonDisabled: { backgroundColor: C.surface2, shadowOpacity: 0 },
  sendButtonText: { fontSize: 24, color: "#0A0C0E", fontWeight: "800", marginLeft: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 16, borderTopWidth: 1, borderColor: C.cyanBorder },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD },
  modalSubtitle: { fontSize: 13, color: C.muted, lineHeight: 19, fontFamily: FONT },
  modalInput: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: C.text, fontFamily: FONT },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalButtonCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.surface2, alignItems: "center", borderWidth: 1, borderColor: C.border },
  modalButtonCancelText: { fontSize: 15, fontWeight: "600", color: C.muted, fontFamily: FONT_BOLD },
  modalButtonSave: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.cyan, alignItems: "center" },
  modalButtonSaveText: { fontSize: 15, fontWeight: "800", color: "#0A0C0E", fontFamily: FONT_BOLD },
});
