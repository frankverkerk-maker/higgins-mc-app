import { useState, useEffect, useRef, useCallback } from "react";
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
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { trpc } from "@/lib/trpc";

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
  red:        "#FF4D6A",
};
const FONT      = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const getInitialMessage = (name: string | null): Message => ({
  id: "0",
  role: "assistant",
  content: name
    ? `Goedemiddag, ${name}. Ik ben Higgins, uw Chief of Staff & Butler. Hoe kan ik u vandaag van dienst zijn?`
    : "Goedemiddag. Ik ben Higgins, uw Chief of Staff & Butler. Hoe kan ik u vandaag van dienst zijn?",
  timestamp: new Date(),
});

export default function ChatScreen() {
  const [userName, setUserName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const listRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  // tRPC mutations
  const chatMutation = trpc.higgins.chat.useMutation();
  const transcribeMutation = trpc.higgins.transcribe.useMutation();

  // Voice recorder
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isRecording = recorderState.isRecording;

  // Pulserende animatie voor opname knop
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Laad gebruikersnaam bij opstarten
  useEffect(() => {
    (async () => {
      const storedName = await AsyncStorage.getItem("higgins_user_name");
      if (storedName) setUserName(storedName);
      setMessages([getInitialMessage(storedName)]);

      if (Platform.OS !== "web") {
        await requestRecordingPermissionsAsync();
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      }
    })();
  }, []);

  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

    // Bouw conversatie geschiedenis op (max 10 berichten)
    const history: Array<{ role: "user" | "assistant"; content: string }> = historyRef.current.slice(-10);

    try {
      const result = await chatMutation.mutateAsync({
        message: text,
        history: history.map(h => ({ role: h.role, content: String(h.content) })),
        userName: userName ?? undefined,
      });

      // Update geschiedenis
      historyRef.current = [
        ...historyRef.current,
        { role: "user" as const, content: text },
        { role: "assistant" as const, content: result.reply },
      ].slice(-20);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.reply,
        timestamp: new Date(),
      };

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Mijn excuses, ik kon uw bericht niet verwerken. Probeert u het nogmaals.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setIsLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, isLoading, userName, chatMutation]);

  // ─── Voice opname starten / stoppen ───────────────────────────────────────
  const handleVoicePress = useCallback(async () => {
    if (Platform.OS === "web") return;

    if (isRecording) {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        setIsTranscribing(true);
        try {
          // Lees audio bestand als base64
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const result = await transcribeMutation.mutateAsync({
            audioBase64: base64,
            mimeType: "audio/m4a",
          });

          setInput(result.text);
        } catch (err) {
          setInput("(Transcriptie mislukt — probeer opnieuw)");
        } finally {
          setIsTranscribing(false);
        }
      }
    } else {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    }
  }, [isRecording, audioRecorder, transcribeMutation]);

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
              <View style={[styles.headerStatusDot, { backgroundColor: "#34D399" }]} />
              <Text style={styles.headerStatusText}>Chief of Staff & Butler · Live</Text>
            </View>
          </View>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>⚡ Live</Text>
          </View>
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

        {/* Typing / transcribing indicator */}
        {(isLoading || isTranscribing) && (
          <View style={styles.typingRow}>
            <HigginsAvatar size={32} />
            <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
              {isTranscribing
                ? <Text style={[styles.bubbleText, { fontSize: 12 }]}>🎙 Transcriberen...</Text>
                : <ActivityIndicator size="small" color={C.cyan} />
              }
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputRow}>
          {Platform.OS !== "web" && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
                onPress={handleVoicePress}
              >
                <Text style={styles.voiceButtonIcon}>{isRecording ? "⏹" : "🎙"}</Text>
              </Pressable>
            </Animated.View>
          )}

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Stel een vraag aan Higgins..."
            placeholderTextColor={C.muted}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || isLoading) && styles.sendButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>›</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  headerName: { fontSize: 16, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD },
  headerStatus: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  headerStatusDot: { width: 6, height: 6, borderRadius: 3 },
  headerStatusText: { fontSize: 11, color: C.cyan, fontFamily: FONT, letterSpacing: 0.3 },
  liveBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.cyanBorder },
  liveBadgeText: { fontSize: 12, fontWeight: "700", color: C.green, fontFamily: FONT_BOLD },
  messageList: { padding: 16, gap: 12 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 },
  messageRowUser: { flexDirection: "row-reverse" },
  bubble: { maxWidth: "78%", borderRadius: 18, padding: 12 },
  bubbleAssistant: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: C.userBubble, borderWidth: 1, borderColor: C.userBorder, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, color: C.text, fontFamily: FONT, lineHeight: 22 },
  bubbleTextUser: { color: C.cyan },
  bubbleTime: { fontSize: 10, color: C.muted, marginTop: 4, fontFamily: FONT },
  bubbleTimeUser: { textAlign: "right" },
  typingRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: { paddingVertical: 10, paddingHorizontal: 16 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  voiceButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.cyanBorder, alignItems: "center", justifyContent: "center" },
  voiceButtonActive: { backgroundColor: "rgba(255,77,106,0.2)", borderColor: C.red },
  voiceButtonIcon: { fontSize: 18 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: C.surface2, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, color: C.text, fontSize: 15, fontFamily: FONT, borderWidth: 1, borderColor: C.border },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cyan, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border },
  sendButtonText: { fontSize: 24, color: C.bg, fontWeight: "900", marginTop: -2 },
});
