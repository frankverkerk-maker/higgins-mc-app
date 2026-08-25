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
  Linking,
  Alert,
  AppState,
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
import * as DocumentPicker from "expo-document-picker";
import { getApiBaseUrl } from "@/constants/oauth";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AppBackground } from "@/components/app-background";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/lib/language-provider";
import { useChatUnread } from "@/lib/chat-unread-provider";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Notifications from "expo-notifications";
import { TypingDots } from "@/components/typing-dots";
import { DelegationTracker } from "@/components/delegation-tracker";
import { isOnline, enqueueMessage, getQueue, dequeueMessage } from "@/lib/offline-queue";
import { isStaleRequest, RequestDeadlineError, withDeadline } from "@/lib/request-deadline";

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
  pdfBg:      "#FFFFFF",
  pdfBorder:  "#E5E7EB",
};
const FONT      = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

// ─── Agent statussen (eerlijk — gesimuleerd tot live backend) ─────────────────
// Agent statussen worden dynamisch bijgehouden — gestart als lege map,
// bijgewerkt wanneer Higgins een agent activeert via de Manus API.
type AgentStatus = { status: "active" | "idle" | "busy"; task: string; taskId?: string };

// ─── Berichttypen ─────────────────────────────────────────────────────────────
type MessageType = "text" | "pdf";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: MessageType;
  // Offline queue status
  status?: "sent" | "queued" | "failed";
  // PDF bijlage velden
  pdfUrl?: string;
  pdfFileName?: string;
  pdfSizeBytes?: number;
  // Delegatie velden
  delegationTaskId?: string;
  assignedAgent?: string;
  pageCount?: number;
};

const CHAT_STORAGE_KEY = "higgins_chat_history_v2";
const CLIENT_VERSION = process.env.EXPO_PUBLIC_CLIENT_VERSION?.trim() || "1.0.3";
const ONLINE_CHECK_TIMEOUT_MS = 5_000;
const CHAT_REQUEST_TIMEOUT_MS = 20_000;
const STALE_REQUEST_MS = 25_000;

const getInitialMessage = (name: string | null, lang: string): Message => {
  const greetings: Record<string, string> = {
    nl: name ? `Goedemiddag, ${name}. Ik ben Higgins, uw Chief of Staff & Butler. Hoe kan ik u vandaag van dienst zijn?` : "Goedemiddag. Ik ben Higgins, uw Chief of Staff & Butler. Hoe kan ik u vandaag van dienst zijn?",
    de: name ? `Guten Tag, ${name}. Ich bin Higgins, Ihr Chief of Staff & Butler. Wie kann ich Ihnen heute behilflich sein?` : "Guten Tag. Ich bin Higgins, Ihr Chief of Staff & Butler. Wie kann ich Ihnen heute behilflich sein?",
    en: name ? `Good afternoon, ${name}. I am Higgins, your Chief of Staff & Butler. How may I assist you today?` : "Good afternoon. I am Higgins, your Chief of Staff & Butler. How may I assist you today?",
  };
  return {
    id: "0",
    role: "assistant",
    content: greetings[lang] ?? greetings.nl,
    timestamp: new Date(),
    type: "text",
  };
};

export default function ChatScreen() {
  const { t, language } = useLanguage();
  const { setChatActive, notifyReply } = useChatUnread();
  const params = useLocalSearchParams<{ prefill?: string; startMeeting?: string }>();

  // Flag the chat as focused so incoming replies don't count as unread while reading.
  useFocusEffect(
    useCallback(() => {
      setChatActive(true);
      return () => setChatActive(false);
    }, [setChatActive]),
  );

  // Fire a light local notification when Higgins replies while the app is backgrounded
  // or the user is on another tab. No-op on web / when permission is missing.
  const notifyHigginsReply = useCallback(async (preview: string) => {
    notifyReply();
    if (Platform.OS === "web") return;
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Higgins",
          body: preview.length > 120 ? preview.slice(0, 117) + "…" : preview,
          sound: true,
        },
        trigger: null,
      });
    } catch (_) {}
  }, [notifyReply]);
  const [userName, setUserName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Dynamische agent statussen — bijgewerkt na echte Manus API activering
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const listRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const meetingPulseAnim = useRef(new Animated.Value(1)).current;
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const sendGenerationRef = useRef(0);
  const sendStartedAtRef = useRef<number | null>(null);

  // Pre-fill input from Tower long-press (Higgins command about a department)
  useEffect(() => {
    if (params.prefill && typeof params.prefill === "string") {
      setInput(params.prefill);
    }
  }, [params.prefill]);

  // Siri Shortcut: auto-start meeting recording when launched via "Start Vergadering"
  useEffect(() => {
    if (params.startMeeting === "true" && Platform.OS !== "web" && !isMeetingRecording) {
      // Small delay to ensure audio permissions are ready
      setTimeout(() => handleMeetingPress(), 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.startMeeting]);

  // ── Offline queue: flush queued messages when chat is focused ──────────
  useFocusEffect(
    useCallback(() => {
      const flushOfflineQueue = async () => {
        const queue = await getQueue();
        if (queue.length === 0) return;
        const online = await isOnline();
        if (!online) return;

        for (const qMsg of queue) {
          try {
            await chatMutation.mutateAsync({
              message: qMsg.text,
              history: [],
              userName: userName ?? undefined,
              language,
            });
            await dequeueMessage(qMsg.id);
            // Update the queued message status to sent
            setMessages(prev => prev.map(m =>
              m.status === "queued" && m.content === qMsg.text
                ? { ...m, status: "sent" as const }
                : m
            ));
          } catch {
            break; // Stop flushing on first failure
          }
        }
      };
      flushOfflineQueue();
    }, [userName, language])
  );

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
  const generatePdfMutation = trpc.higgins.generatePdf.useMutation();
  const activateAgentMutation = trpc.higgins.activateAgent.useMutation();
  const uploadPdfMutation = trpc.higgins.uploadPdf.useMutation();

  const releaseSendLock = useCallback(() => {
    sendGenerationRef.current += 1;
    sendStartedAtRef.current = null;
    setIsLoading(false);
    chatMutation.reset();
  }, [chatMutation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        isLoading &&
        isStaleRequest(sendStartedAtRef.current, Date.now(), STALE_REQUEST_MS)
      ) {
        releaseSendLock();
      }
    });
    return () => subscription.remove();
  }, [isLoading, releaseSendLock]);

  // Voice recorder (voor chat mic)
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isRecording = recorderState.isRecording;

  // Meeting recorder (apart exemplaar)
  const meetingRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

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

  // ─── Persistente chat opslag ──────────────────────────────────────────────
  const saveMessages = useCallback(async (msgs: Message[]) => {
    try {
      // Sla de laatste 50 berichten op (zonder het initiële welkomstbericht)
      const toSave = msgs.slice(-50).map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      }));
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
    } catch (_) {}
  }, []);

  // ─── PDF upload handler ───────────────────────────────────────────────────
  const handleUploadPdf = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "*/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;

      setIsUploading(true);
      let currentMessages = [...messages];

      // Verwerk elk geselecteerd bestand sequentieel
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const fileName = asset.name ?? `document_${Date.now()}_${i}.pdf`;
        const mimeType = asset.mimeType ?? "application/pdf";

        // Toon user bericht met bestandsnaam
        const userMsg: Message = {
          id: `${Date.now()}_u${i}`,
          role: "user",
          content: `📎 ${fileName}${result.assets.length > 1 ? ` (${i + 1}/${result.assets.length})` : ""}`,
          timestamp: new Date(),
          type: "text",
        };
        currentMessages = [...currentMessages, userMsg];
        setMessages([...currentMessages]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const uploadResult = await uploadPdfMutation.mutateAsync({
            base64,
            fileName,
            mimeType,
            userName: userName ?? undefined,
            language,
          });

          const pdfMsg: Message = {
            id: `${Date.now()}_p${i}`,
            role: "assistant",
            content: uploadResult.higginsResponse,
            timestamp: new Date(),
            type: "pdf",
            pdfUrl: uploadResult.url,
            pdfFileName: uploadResult.fileName,
            pdfSizeBytes: uploadResult.sizeBytes,
            delegationTaskId: (uploadResult as any).delegationTaskId,
            assignedAgent: (uploadResult as any).assignedAgent,
            pageCount: (uploadResult as any).pageCount,
          };
          currentMessages = [...currentMessages, pdfMsg];
          setMessages([...currentMessages]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (_fileErr) {
          const errMsg: Message = {
            id: `${Date.now()}_e${i}`,
            role: "assistant",
            content: `⚠️ Kon ${fileName} niet verwerken. Probeer het opnieuw.`,
            timestamp: new Date(),
            type: "text",
          };
          currentMessages = [...currentMessages, errMsg];
          setMessages([...currentMessages]);
        }
      }

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await saveMessages(currentMessages);
    } catch (_err) {
      Alert.alert("Fout", t.chat.uploadError);
    } finally {
      setIsUploading(false);
    }
  }, [messages, userName, language, uploadPdfMutation, saveMessages, t]);

  // Laad gebruikersnaam en chatgeschiedenis bij opstarten
  useEffect(() => {
    (async () => {
      const storedName = await AsyncStorage.getItem("higgins_user_name");
      if (storedName) setUserName(storedName);

      // Herstel chatgeschiedenis
      try {
        const stored = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Array<Message & { timestamp: string }>;
          const restored: Message[] = parsed.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          if (restored.length > 0) {
            setMessages(restored);
            historyRef.current = restored
              .filter(m => m.type !== "pdf")
              .map(m => ({ role: m.role, content: m.content }))
              .slice(-20);
          } else {
            setMessages([getInitialMessage(storedName, language)]);
          }
        } else {
          setMessages([getInitialMessage(storedName, language)]);
        }
      } catch (_) {
        setMessages([getInitialMessage(storedName, language)]);
      }

      if (Platform.OS !== "web") {
        await requestRecordingPermissionsAsync();
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      }
    })();
  }, []);

  // ─── Bouw agent status context voor Higgins ───────────────────────────────
  // Alleen geactiveerde agents worden meegestuurd — geen misleidende hardcoded statussen
  const buildAgentContext = (): string => {
    const activeAgents = Object.entries(agentStatuses);
    if (activeAgents.length === 0) return "";
    const lines = activeAgents.map(([name, info]) => {
      const statusLabel = info.status === "busy" ? "bezig" : "actief";
      const taskIdNote = info.taskId ? ` (Manus taak: ${info.taskId})` : "";
      return `- ${name}: ${statusLabel} — ${info.task}${taskIdNote}`;
    });
    return `\n\nGEACTIVEERDE AGENTS VIA MANUS API (dit zijn echte actieve taken):\n${lines.join("\n")}`;
  };

  // ─── Pending delegation state (for confirmation UX) ─────────────────────
  const [pendingDelegation, setPendingDelegation] = useState<{
    targetAgent: string;
    targetDepartment: string | null;
    taskDescription: string;
    confidence: number;
    msgId: string;
    additionalTargets?: Array<{ agent: string; department: string; task: string }>;
  } | null>(null);

  // ─── Bevestig een pending delegatie ("Akkoord" knop) ─────────────────────
  const confirmDelegation = useCallback(async () => {
    if (!pendingDelegation) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const result = await chatMutation.mutateAsync({
        message: "__confirm__",
        history: [],
        userName: userName ?? undefined,
        language,
        confirmDelegation: {
          targetAgent: pendingDelegation.targetAgent,
          taskDescription: pendingDelegation.taskDescription,
          additionalTargets: pendingDelegation.additionalTargets?.map(t => ({ agent: t.agent, task: t.task })),
        },
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.reply,
        timestamp: new Date(),
        type: "text",
      };

      // Update agent status if delegation succeeded
      if ((result as any).delegation) {
        setAgentStatuses(prev => ({
          ...prev,
          [pendingDelegation.targetAgent]: {
            status: "busy",
            task: pendingDelegation.taskDescription.substring(0, 60),
            taskId: (result as any).delegation.taskId,
          },
        }));
      }

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        saveMessages(updated);
        return updated;
      });
      notifyHigginsReply(result.reply);
    } catch (_) {
      // silently fail — user can retry
    }

    setPendingDelegation(null);
    setIsLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [pendingDelegation, chatMutation, userName, language, saveMessages, notifyHigginsReply]);

  // ─── Wijs een pending delegatie af ──────────────────────────────────────
  const rejectDelegation = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingDelegation(null);
  }, []);

  // ─── Stuur bericht naar Higgins (server doet nu alle routing) ──────────
  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;

    const generation = ++sendGenerationRef.current;
    sendStartedAtRef.current = Date.now();

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
      type: "text",
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    const history: Array<{ role: "user" | "assistant"; content: string }> = historyRef.current.slice(-10);

    try {
      // ── Offline check: queue if no connectivity ──────────────────────────
      const online = await withDeadline(
        isOnline(),
        ONLINE_CHECK_TIMEOUT_MS,
        "connectivity check",
      );
      if (!online) {
        // Mark message as queued and save
        const queuedMsg: Message = { ...userMsg, status: "queued" };
        const queuedMessages = [...messages, queuedMsg];
        setMessages(queuedMessages);
        await saveMessages(queuedMessages);
        await enqueueMessage(text);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      // ── Alle routing gebeurt nu server-side via de command router ────────────
      const agentContext = buildAgentContext();
      const messageWithContext = agentContext ? text + agentContext : text;

      const result = await withDeadline(
        chatMutation.mutateAsync({
          message: messageWithContext,
          history: history.map(h => ({ role: h.role, content: String(h.content) })),
          userName: userName ?? undefined,
          language,
        }),
        CHAT_REQUEST_TIMEOUT_MS,
        "Higgins chat request",
      );

      if (generation !== sendGenerationRef.current) return;

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
        type: "text",
      };

      // ── Handle direct delegation (server already activated the agent) ──
      if ((result as any).delegation) {
        const del = (result as any).delegation;
        setAgentStatuses(prev => ({
          ...prev,
          [del.agent]: {
            status: "busy",
            task: text.substring(0, 60) + (text.length > 60 ? "..." : ""),
            taskId: del.taskId,
          },
        }));
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if ((result as any).pendingDelegation) {
        // ── Handle pending delegation (needs user confirmation) ──────────
        const pd = (result as any).pendingDelegation;
        setPendingDelegation({
          targetAgent: pd.targetAgent,
          targetDepartment: pd.targetDepartment,
          taskDescription: pd.taskDescription,
          confidence: pd.confidence,
          msgId: assistantMsg.id,
          additionalTargets: pd.additionalTargets ?? [],
        });
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);
      await saveMessages(updatedMessages);
      notifyHigginsReply(result.reply);
    } catch (error) {
      if (generation !== sendGenerationRef.current) return;
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error instanceof RequestDeadlineError
          ? "De verbinding duurde te lang. U kunt direct opnieuw verzenden."
          : t.chat.errorGeneric || "Mijn excuses, ik kon uw bericht niet verwerken. Probeert u het nogmaals.",
        timestamp: new Date(),
        type: "text",
      };
      const updatedMessages = [...newMessages, errorMsg];
      setMessages(updatedMessages);
      await saveMessages(updatedMessages);
    } finally {
      if (generation === sendGenerationRef.current) {
        sendStartedAtRef.current = null;
        setIsLoading(false);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    }
  }, [input, isLoading, userName, chatMutation, activateAgentMutation, messages, language, saveMessages, notifyHigginsReply]);

  // ─── PDF genereren van het laatste Higgins antwoord ───────────────────────
  const handleGeneratePdf = useCallback(async () => {
    // Zoek het laatste assistant bericht
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant" && m.type === "text");
    if (!lastAssistant) return;

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGeneratingPdf(true);

    try {
      const result = await generatePdfMutation.mutateAsync({
        title: "Higgins Rapport",
        content: lastAssistant.content,
        userName: userName ?? undefined,
        language,
      });

      const pdfMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Ik heb het rapport voor u gegenereerd in de Carpe Diem huisstijl.",
        timestamp: new Date(),
        type: "pdf",
        pdfUrl: result.url,
        pdfFileName: result.fileName,
        pdfSizeBytes: result.sizeBytes,
      };

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const updatedMessages = [...messages, pdfMsg];
      setMessages(updatedMessages);
      await saveMessages(updatedMessages);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert("PDF fout", "Het genereren van de PDF is mislukt. Probeer het opnieuw.");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [messages, generatePdfMutation, userName, language, saveMessages]);

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
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
      setMeetingResult(null);
      await meetingRecorder.prepareToRecordAsync();
      meetingRecorder.record();
      setIsMeetingRecording(true);
    }
  }, [isMeetingRecording, meetingRecorder, transcribeMeetingMutation, userName]);

  const sendSummaryToChat = useCallback(async () => {
    if (!meetingResult) return;
    setShowMeetingModal(false);

    // S3 fix: Route the meeting summary through the command router as a user message
    // so Higgins can intelligently determine if action items need delegation
    const commandMessage = `Hier is de samenvatting van mijn vergadering. Analyseer de actiepunten en bepaal of er taken gedelegeerd moeten worden aan het team:\n\n${meetingResult.summary}`;

    // Add the summary as a user message first
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `📋 Vergadering samenvatting:\n\n${meetingResult.summary}`,
      timestamp: new Date(),
      type: "text",
    };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setIsLoading(true);

    try {
      // Send through the command router — Higgins will analyze and potentially delegate
      const result = await chatMutation.mutateAsync({
        message: commandMessage,
        userName: userName ?? undefined,
        language,
        history: withUser.slice(-10).map(m => ({ role: m.role, content: m.content })),
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.reply,
        timestamp: new Date(),
        type: "text",
        delegationTaskId: (result as any).delegation?.taskId,
        assignedAgent: (result as any).delegation?.agent,
      };
      const updatedMessages = [...withUser, assistantMsg];
      setMessages(updatedMessages);
      await saveMessages(updatedMessages);

      // Handle pending delegation (low confidence) from meeting summary
      if ((result as any).pendingDelegation) {
        const pd = (result as any).pendingDelegation;
        setPendingDelegation({
          targetAgent: pd.targetAgent,
          targetDepartment: pd.targetDepartment,
          taskDescription: pd.taskDescription,
          confidence: pd.confidence,
          msgId: assistantMsg.id,
          additionalTargets: pd.additionalTargets ?? [],
        });
      }
    } catch (_) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Mijn excuses, ik kon de vergaderingsamenvatting niet verwerken. De samenvatting is wel opgeslagen in de chat.",
        timestamp: new Date(),
        type: "text",
      };
      const updatedMessages = [...withUser, errorMsg];
      setMessages(updatedMessages);
      await saveMessages(updatedMessages);
    }

    setIsLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [meetingResult, messages, saveMessages, chatMutation, userName, language]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── PDF kaart component ──────────────────────────────────────────────────
  const PdfCard = ({ msg }: { msg: Message }) => {
    const [isOpening, setIsOpening] = useState(false);
    const [taskStatus, setTaskStatus] = useState<"running" | "stopped" | "error" | null>(
      msg.delegationTaskId ? "running" : null
    );
    const [taskResult, setTaskResult] = useState<string | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Poll agent taakstatus elke 5 seconden totdat voltooid
    useEffect(() => {
      if (!msg.delegationTaskId || taskStatus === "stopped" || taskStatus === "error") return;
      const poll = async () => {
        try {
          const res = await fetch(
            `${getApiBaseUrl()}/api/trpc/higgins.getTaskStatus?input=${encodeURIComponent(JSON.stringify({ json: { taskId: msg.delegationTaskId, language, userName: userName ?? undefined } }))}`
          );
          if (!res.ok) return;
          const data = await res.json() as { result?: { data?: { json?: { agentStatus: string; lastMessage?: string } } } };
          const status = data?.result?.data?.json?.agentStatus;
          const lastMsg = data?.result?.data?.json?.lastMessage;
          if (status === "stopped" || status === "error") {
            setTaskStatus(status as "stopped" | "error");
            if (lastMsg) setTaskResult(lastMsg);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }
        } catch (_) { /* stil falen */ }
      };
      poll();
      pollIntervalRef.current = setInterval(poll, 5000);
      return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [msg.delegationTaskId]);

    const handleOpen = async () => {
      if (!msg.pdfUrl) return;
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsOpening(true);
      try {
        // Bouw de volledige URL op (server-relative pad naar absolute URL)
        const baseUrl = getApiBaseUrl();
        const fullUrl = msg.pdfUrl.startsWith("http") ? msg.pdfUrl : `${baseUrl}${msg.pdfUrl}`;
        await Linking.openURL(fullUrl);
      } catch (_) {
        Alert.alert("Fout", "Kan de PDF niet openen.");
      } finally {
        setIsOpening(false);
      }
    };

    return (
      <View style={styles.pdfCard}>
        {/* Header rij: icoon + naam + grootte */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <View style={styles.pdfIconWrap}>
            <Text style={styles.pdfIcon}>📄</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pdfName} numberOfLines={1}>
              {msg.pdfFileName ?? "Higgins Rapport.pdf"}
            </Text>
            <Text style={styles.pdfMeta}>
              PDF · {msg.pdfSizeBytes ? formatFileSize(msg.pdfSizeBytes) : "—"}
            </Text>
          </View>
        </View>
        {/* Beschrijving */}
        {!!msg.content && (
          <Text style={styles.pdfCaption} numberOfLines={3}>{msg.content}</Text>
        )}
        {/* Analyse-indicator: agent is actief bezig */}
        {!!msg.delegationTaskId && taskStatus === "running" && (
          <View style={styles.pdfAnalysingBadge}>
            <ActivityIndicator size="small" color="#0891b2" style={{ marginRight: 6 }} />
            <Text style={styles.pdfAnalysingText}>
              {msg.assignedAgent ? `${msg.assignedAgent} analyseert uw document…` : "Higgins analyseert uw document…"}
            </Text>
          </View>
        )}
        {/* Delegatie badge: voltooid */}
        {!!msg.assignedAgent && taskStatus !== "running" && (
          <View style={[styles.pdfDelegationBadge, taskStatus === "error" && { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Text style={[styles.pdfDelegationText, taskStatus === "error" && { color: "#DC2626" }]}>
              {taskStatus === "stopped" ? `✅ ${msg.assignedAgent} heeft de analyse voltooid` :
               taskStatus === "error" ? `⚠️ ${msg.assignedAgent} heeft een fout gemeld` :
               `⚡ ${msg.assignedAgent} is geactiveerd`}
            </Text>
          </View>
        )}
        {/* Resultaat van de analyse (eerste 200 tekens) */}
        {!!taskResult && taskStatus === "stopped" && (
          <Text style={styles.pdfTaskResult} numberOfLines={4}>{taskResult}</Text>
        )}
        {/* Open knop */}
        <Pressable
          style={({ pressed }) => [styles.pdfOpenBtn, pressed && { opacity: 0.7 }]}
          onPress={handleOpen}
          disabled={isOpening}
        >
          {isOpening
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Text style={styles.pdfOpenBtnText}>Openen ↓</Text>
          }
        </Pressable>
      </View>
    );
  };

  // ─── Render bericht ───────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";

    if (item.type === "pdf") {
      return (
        <View style={[styles.messageRow]}>
          <HigginsAvatar size={32} />
          <PdfCard msg={item} />
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && <HigginsAvatar size={32} />}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
          {/* Delegation result tracker — polls and shows agent result inline */}
          {!isUser && !!item.delegationTaskId && !!item.assignedAgent && (
            <DelegationTracker
              taskId={item.delegationTaskId}
              agentName={item.assignedAgent}
              language={language}
              userName={userName ?? undefined}
              onComplete={(status, resultText) => {
                // Persist the result into the message for history
                setMessages(prev => {
                  const updated = prev.map(m =>
                    m.id === item.id
                      ? {
                          ...m,
                          content: m.content + (resultText ? `\n\n📋 Resultaat:\n${resultText}` : ""),
                          // Clear delegationTaskId so tracker won't re-poll on next load
                          delegationTaskId: undefined,
                        }
                      : m
                  );
                  // Persist immediately so result survives app restart
                  saveMessages(updated);
                  return updated;
                });
              }}
            />
          )}
          {/* Inline delegatie-bevestiging knoppen */}
          {!isUser && pendingDelegation && pendingDelegation.msgId === item.id && (
            <View style={styles.delegationConfirmRow}>
              <View style={styles.delegationInfoRow}>
                <Text style={styles.delegationInfoText}>
                  → {pendingDelegation.targetAgent}{pendingDelegation.targetDepartment ? ` (${pendingDelegation.targetDepartment})` : ""}
                </Text>
                {pendingDelegation.additionalTargets && pendingDelegation.additionalTargets.length > 0 && (
                  pendingDelegation.additionalTargets.map((t, idx) => (
                    <Text key={idx} style={styles.delegationInfoText}>
                      → {t.agent}{t.department ? ` (${t.department})` : ""}
                    </Text>
                  ))
                )}
              </View>
              <View style={styles.delegationBtnRow}>
                <Pressable
                  style={({ pressed }) => [styles.delegationBtnConfirm, pressed && { opacity: 0.7 }]}
                  onPress={confirmDelegation}
                >
                  <Text style={styles.delegationBtnConfirmText}>
                    {pendingDelegation.additionalTargets && pendingDelegation.additionalTargets.length > 0
                      ? `Alle ${1 + pendingDelegation.additionalTargets.length} activeren ✓`
                      : "Akkoord ✓"}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.delegationBtnReject, pressed && { opacity: 0.7 }]}
                  onPress={rejectDelegation}
                >
                  <Text style={styles.delegationBtnRejectText}>Nee</Text>
                </Pressable>
              </View>
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {isUser && item.status === "queued" && (
              <Text style={{ fontSize: 10, color: "#F59E0B" }}>⏳</Text>
            )}
            {isUser && item.status === "failed" && (
              <Text style={{ fontSize: 10, color: "#EF4444" }}>⚠️</Text>
            )}
            <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Controleer of er een recent assistant bericht is om PDF van te maken
  const hasRecentAssistantMessage = messages.some(m => m.role === "assistant" && m.type === "text");

  return (
    <ScreenContainer containerClassName="bg-background">
      <AppBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >

        {/* Header */}
        <View style={styles.header}>
          <HigginsAvatar size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{t.chat.title}</Text>
            <View style={styles.headerStatus}>
              <View style={[styles.headerStatusDot, { backgroundColor: "#34D399" }]} />
              <Text style={styles.headerStatusText}>{t.chat.statusOnline} · v{CLIENT_VERSION}</Text>
            </View>
          </View>
          {/* Taalwisselaar */}
          <LanguageSwitcher />
          {/* Vergadering opname knop in header */}
          {Platform.OS !== "web" && (
            <Animated.View style={{ transform: [{ scale: meetingPulseAnim }] }}>
              <Pressable
                style={[styles.meetingButton, isMeetingRecording && styles.meetingButtonActive]}
                onPress={handleMeetingPress}
              >
                <Text style={styles.meetingButtonIcon}>{isMeetingRecording ? "⏹" : "🎤"}</Text>
                <Text style={[styles.meetingButtonLabel, isMeetingRecording && { color: C.red }]}>
                  {isMeetingRecording ? formatDuration(meetingDuration) : t.chat.meetingButton}
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

        {/* Typing / transcribing / PDF indicator */}
        {(isLoading || isTranscribing || isGeneratingPdf || isUploading) && (
          <View style={styles.typingRow}>
            <HigginsAvatar size={32} />
            <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
              {isTranscribing
                ? <Text style={[styles.bubbleText, { fontSize: 12 }]}>🎙 Transcriberen...</Text>
                : isUploading
                  ? <Text style={[styles.bubbleText, { fontSize: 12 }]}>📎 {t.chat.uploadUploading}</Text>
                : isGeneratingPdf
                  ? <Text style={[styles.bubbleText, { fontSize: 12 }]}>📄 PDF genereren...</Text>
                  : <TypingDots color={C.cyan} />
              }
            </View>
          </View>
        )}

        {/* Vergadering opname banner */}
        {isMeetingRecording && (
          <View style={styles.meetingBanner}>
            <View style={styles.meetingBannerDot} />
            <Text style={styles.meetingBannerText}>
              {t.chat.meetingBannerText} · {formatDuration(meetingDuration)}
            </Text>
            <Pressable onPress={handleMeetingPress} style={styles.meetingBannerStop}>
              <Text style={styles.meetingBannerStopText}>{t.chat.meetingBannerStop}</Text>
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
                <Text style={styles.voiceButtonIcon}>{isRecording ? "⏹" : "🎤"}</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Paperclip / bijlage knop */}
          <Pressable
            style={({ pressed }) => [styles.attachButton, pressed && { opacity: 0.7 }, isUploading && { opacity: 0.4 }]}
            onPress={handleUploadPdf}
            disabled={isUploading || isLoading}
          >
            {isUploading
              ? <ActivityIndicator size="small" color={C.cyan} />
              : <Text style={styles.attachButtonIcon}>📎</Text>
            }
          </Pressable>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t.chat.placeholder}
            placeholderTextColor={C.muted}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={Platform.OS !== "web"}
          />

          {/* PDF genereer knop — zichtbaar als er een recent assistant bericht is */}
          {hasRecentAssistantMessage && !isLoading && (
            <Pressable
              style={({ pressed }) => [styles.pdfButton, pressed && { opacity: 0.7 }]}
              onPress={handleGeneratePdf}
              disabled={isGeneratingPdf}
            >
              <Text style={styles.pdfButtonIcon}>📄</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              !isLoading && !input.trim() && styles.sendButtonDisabled,
              isLoading && styles.sendButtonCancel,
              pressed && { opacity: 0.8 },
            ]}
            onPress={isLoading ? releaseSendLock : () => sendMessage()}
            disabled={!isLoading && !input.trim()}
            accessibilityLabel={isLoading ? "Annuleer wachtende aanvraag" : "Verstuur bericht"}
          >
            <Text style={[styles.sendButtonText, isLoading && styles.sendButtonCancelText]}>
              {isLoading ? "×" : "›"}
            </Text>
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
              <Text style={styles.modalTitle}>{t.chat.meetingModalTitle}</Text>
              <Text style={styles.modalSubtitle}>{t.chat.meetingModalSubtitle}</Text>
            </View>
            <Pressable onPress={() => setShowMeetingModal(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          {isProcessingMeeting ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={C.cyan} />
              <Text style={styles.modalLoadingText}>{t.chat.meetingModalProcessing}</Text>
              <Text style={styles.modalLoadingSubtext}>{t.chat.meetingModalProcessingSubtext}</Text>
            </View>
          ) : meetingResult ? (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>📋 {t.chat.meetingModalSummaryLabel}</Text>
                <Text style={styles.modalSectionText}>{meetingResult.summary}</Text>
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>📝 {t.chat.meetingModalTranscriptLabel}</Text>
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
                <Text style={styles.modalBtnText}>{t.chat.meetingModalSendToChat}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
      </AppBackground>
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
  bubbleAssistant: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.2)",
    borderBottomLeftRadius: 4,
    shadowColor: "#00D4D4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  bubbleUser: {
    backgroundColor: "rgba(0,212,212,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.4)",
    borderBottomRightRadius: 4,
    shadowColor: "#00D4D4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  bubbleText: { fontSize: 15, color: C.text, fontFamily: FONT, lineHeight: 22 },
  bubbleTextUser: { color: C.cyan },
  bubbleTime: { fontSize: 10, color: C.muted, marginTop: 4, fontFamily: FONT },
  bubbleTimeUser: { textAlign: "right" },
  typingRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: { paddingVertical: 10, paddingHorizontal: 16 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,212,212,0.2)",
    backgroundColor: "rgba(10,12,14,0.85)",
  },
  voiceButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.cyanBorder, alignItems: "center", justifyContent: "center" },
  voiceButtonActive: { backgroundColor: "rgba(255,77,106,0.2)", borderColor: C.red },
  voiceButtonIcon: { fontSize: 18 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
    fontFamily: FONT,
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.25)",
  },
  pdfButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.pdfBorder, alignItems: "center", justifyContent: "center" },
  pdfButtonIcon: { fontSize: 18 },
  attachButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.cyanBorder, alignItems: "center", justifyContent: "center" },
  attachButtonIcon: { fontSize: 18 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cyan, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border },
  sendButtonCancel: { backgroundColor: C.red, borderWidth: 1, borderColor: C.red },
  sendButtonText: { fontSize: 24, color: C.bg, fontWeight: "900", marginTop: -2 },
  sendButtonCancelText: { color: "#FFFFFF", marginTop: 0 },
  // PDF kaart — Manus witte documentkaart stijl
  pdfCard: { maxWidth: "88%", backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  pdfIconWrap: { width: 36, height: 36, backgroundColor: "#EBF4FF", borderRadius: 6, alignItems: "center", justifyContent: "center" },
  pdfIcon: { fontSize: 20 },
  pdfInfo: { flex: 1, gap: 2 },
  pdfName: { fontSize: 14, fontWeight: "700", color: "#111111", fontFamily: FONT_BOLD },
  pdfMeta: { fontSize: 11, color: "#888888", fontFamily: FONT },
  pdfCaption: { fontSize: 12, color: "#555555", fontFamily: FONT, lineHeight: 18, marginTop: 2, marginBottom: 4 },
  pdfAnalysingBadge: { flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 2, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#EFF6FF", borderRadius: 6, borderWidth: 1, borderColor: "#BFDBFE", alignSelf: "flex-start" },
  pdfAnalysingText: { fontSize: 11, color: "#1D4ED8", fontFamily: FONT },
  pdfDelegationBadge: { marginTop: 6, marginBottom: 2, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#F0FDF4", borderRadius: 6, borderWidth: 1, borderColor: "#BBF7D0", alignSelf: "flex-start" },
  pdfDelegationText: { fontSize: 11, color: "#15803D", fontWeight: "700", fontFamily: FONT_BOLD },
  pdfTaskResult: { fontSize: 11, color: "#374151", fontFamily: FONT, lineHeight: 16, marginTop: 6, marginBottom: 2, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: "#F9FAFB", borderRadius: 6, borderWidth: 1, borderColor: "#E5E7EB" },
  pdfOpenBtn: { alignSelf: "flex-end", marginTop: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "#0891b2", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pdfOpenBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", fontFamily: FONT_BOLD },
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
  // Delegation confirmation inline styles
  delegationConfirmRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.15)" },
  delegationInfoRow: { marginBottom: 6 },
  delegationInfoText: { fontSize: 12, color: C.cyan, fontFamily: FONT, opacity: 0.9 },
  delegationBtnRow: { flexDirection: "row", gap: 8 },
  delegationBtnConfirm: { backgroundColor: C.cyan, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  delegationBtnConfirmText: { fontSize: 13, fontWeight: "700", color: C.bg, fontFamily: FONT_BOLD },
  delegationBtnReject: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 0.5, borderColor: "rgba(255,255,255,0.2)" },
  delegationBtnRejectText: { fontSize: 13, fontWeight: "600", color: C.muted, fontFamily: FONT },
});
