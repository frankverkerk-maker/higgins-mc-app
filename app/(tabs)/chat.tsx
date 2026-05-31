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
  Modal,
  ScrollView,
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
  redDim:     "rgba(255,77,106,0.15)",
  amber:      "#F5A623",
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
  const meetingPulseAnim = useRef(new Animated.Value(1)).current;
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  // Vergadering opname state
  const [isMeetingRecording, setIsMeetingRecording] = useState(false);
  const [meetingResult, setMeetingResult] = useState<{ transcript: string; summary: string } | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [isProcessingMeeting, setIsProcessingMeeting] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const meetingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tRPC mutations
  const chatMutation = trpc.higgins.chat.useMutation();
  const transcribeMutation = trpc.higgins.transcribe.useMutation();
  const transcribeMeetingMutation = trpc.higgins.transcribeMeeting.useMutation();

  // Voice recorder (voor chat mic)
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isRecording = recorderState.isRecording;

  // Meeting recorder (apart exemplaar)
  const meetingRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const meetingRecorderState = useAudioRecorderState(meetingRecorder);

  // Pulserende animatie voor chat mic knop
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

  // Pulserende animatie voor vergadering opname knop
  useEffect(() => {
    if (isMeetingRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(meetingPulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(meetingPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      meetingPulseAnim.stopAnimation();
      meetingPulseAnim.setValue(1);
    }
  }, [isMeetingRecording]);

  // Vergadering timer
  useEffect(() => {
    if (isMeetingRecording) {
      setMeetingDuration(0);
      meetingTimerRef.current = setInterval(() => {
        setMeetingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (meetingTimerRef.current) {
        clearInterval(meetingTimerRef.current);
        meetingTimerRef.current = null;
      }
    }
    return () => {
      if (meetingTimerRef.current) clearInterval(meetingTimerRef.current);
    };
  }, [isMeetingRecording]);

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

    const history: Array<{ role: "user" | "assistant"; content: string }> = historyRef.current.slice(-10);

    try {
      const result = await chatMutation.mutateAsync({
        message: text,
        history: history.map(h => ({ role: h.role, content: String(h.content) })),
        userName: userName ?? undefined,
      });

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

  // ─── Chat mic: Voice-to-Higgins ───────────────────────────────────────────
  const handleVoicePress = useCallback(async () => {
    if (Platform.OS === "web") return;

    if (isRecording) {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        setIsTranscribing(true);
        try {
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

  // ─── Vergadering opname starten / stoppen ─────────────────────────────────
  const handleMeetingPress = useCallback(async () => {
    if (Platform.OS === "web") return;

    if (isMeetingRecording) {
      // Stop opname en verwerk
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (_) {}
      setIsMeetingRecording(false);
      await meetingRecorder.stop();
      const uri = meetingRecorder.uri;
      if (uri) {
        setIsProcessingMeeting(true);
        setShowMeetingModal(true);
        try {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const result = await transcribeMeetingMutation.mutateAsync({
            audioBase64: base64,
            mimeType: "audio/m4a",
            userName: userName ?? undefined,
          });
          setMeetingResult({ transcript: result.transcript, summary: result.summary });
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
        } catch (err) {
          setMeetingResult({ transcript: "(Transcriptie mislukt)", summary: "Er is een fout opgetreden bij het verwerken van de vergadering." });
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (_) {}
        } finally {
          setIsProcessingMeeting(false);
        }
      }
    } else {
      // Start opname
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
      setMeetingResult(null);
      await meetingRecorder.prepareToRecordAsync();
      meetingRecorder.record();
      setIsMeetingRecording(true);
    }
  }, [isMeetingRecording, meetingRecorder, transcribeMeetingMutation, userName]);

  const sendSummaryToChat = useCallback(() => {
    if (!meetingResult) return;
    setShowMeetingModal(false);
    const summaryMessage = `📋 **Vergadering samenvatting door Higgins:**\n\n${meetingResult.summary}`;
    const assistantMsg: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: summaryMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [meetingResult]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

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
          {/* Vergadering opname knop in header */}
          {Platform.OS !== "web" && (
            <Animated.View style={{ transform: [{ scale: meetingPulseAnim }] }}>
              <Pressable
                style={[styles.meetingButton, isMeetingRecording && styles.meetingButtonActive]}
                onPress={handleMeetingPress}
              >
                <Text style={styles.meetingButtonIcon}>{isMeetingRecording ? "⏹" : "🎤"}</Text>
                <Text style={[styles.meetingButtonLabel, isMeetingRecording && { color: C.red }]}>
                  {isMeetingRecording ? formatDuration(meetingDuration) : "Vergadering"}
                </Text>
              </Pressable>
            </Animated.View>
          )}
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

        {/* Vergadering opname banner */}
        {isMeetingRecording && (
          <View style={styles.meetingBanner}>
            <View style={styles.meetingBannerDot} />
            <Text style={styles.meetingBannerText}>
              Vergadering wordt opgenomen · {formatDuration(meetingDuration)}
            </Text>
            <Pressable onPress={handleMeetingPress} style={styles.meetingBannerStop}>
              <Text style={styles.meetingBannerStopText}>Stop</Text>
            </Pressable>
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

      {/* Vergadering resultaat modal */}
      <Modal
        visible={showMeetingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMeetingModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <HigginsAvatar size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Vergadering Verwerkt</Text>
              <Text style={styles.modalSubtitle}>Higgins heeft uw vergadering geanalyseerd</Text>
            </View>
            <Pressable onPress={() => setShowMeetingModal(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          {isProcessingMeeting ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={C.cyan} />
              <Text style={styles.modalLoadingText}>Higgins analyseert de vergadering...</Text>
              <Text style={styles.modalLoadingSubtext}>Dit kan even duren afhankelijk van de duur</Text>
            </View>
          ) : meetingResult ? (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Samenvatting */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>📋 SAMENVATTING VAN HIGGINS</Text>
                <Text style={styles.modalSectionText}>{meetingResult.summary}</Text>
              </View>

              {/* Transcriptie */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>📝 VOLLEDIGE TRANSCRIPTIE</Text>
                <Text style={[styles.modalSectionText, { color: C.muted, fontSize: 13 }]}>
                  {meetingResult.transcript}
                </Text>
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>
          ) : null}

          {!isProcessingMeeting && meetingResult && (
            <View style={styles.modalFooter}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, pressed && { opacity: 0.8 }]}
                onPress={sendSummaryToChat}
              >
                <Text style={styles.modalBtnText}>Stuur samenvatting naar chat →</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  headerName: { fontSize: 16, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD },
  headerStatus: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  headerStatusDot: { width: 6, height: 6, borderRadius: 3 },
  headerStatusText: { fontSize: 11, color: C.cyan, fontFamily: FONT, letterSpacing: 0.3 },
  meetingButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.cyanBorder },
  meetingButtonActive: { backgroundColor: C.redDim, borderColor: C.red },
  meetingButtonIcon: { fontSize: 16 },
  meetingButtonLabel: { fontSize: 12, fontWeight: "700", color: C.cyan, fontFamily: FONT_BOLD },
  meetingBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.redDim, borderTopWidth: 1, borderTopColor: C.red },
  meetingBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  meetingBannerText: { flex: 1, fontSize: 13, color: C.red, fontFamily: FONT, fontWeight: "600" },
  meetingBannerStop: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: C.red },
  meetingBannerStopText: { fontSize: 12, fontWeight: "800", color: "#fff", fontFamily: FONT_BOLD },
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
  // Modal
  modal: { flex: 1, backgroundColor: C.bg },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  modalTitle: { fontSize: 16, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD },
  modalSubtitle: { fontSize: 12, color: C.cyan, fontFamily: FONT, marginTop: 2 },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
  modalCloseText: { fontSize: 14, color: C.muted, fontWeight: "700" },
  modalLoading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 40 },
  modalLoadingText: { fontSize: 16, color: C.text, fontFamily: FONT, textAlign: "center" },
  modalLoadingSubtext: { fontSize: 13, color: C.muted, fontFamily: FONT, textAlign: "center" },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  modalSection: { marginBottom: 24, backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  modalSectionLabel: { fontSize: 11, fontWeight: "800", color: C.cyan, fontFamily: FONT_BOLD, letterSpacing: 1, marginBottom: 10 },
  modalSectionText: { fontSize: 15, color: C.text, fontFamily: FONT, lineHeight: 23 },
  modalFooter: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  modalBtn: { backgroundColor: C.cyan, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontWeight: "800", color: C.bg, fontFamily: FONT_BOLD },
});
