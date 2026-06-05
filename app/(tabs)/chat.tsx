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
import { LanguageSwitcher } from "@/components/language-switcher";
import { AppBackground } from "@/components/app-background";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/lib/language-provider";

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
  pdfBg:      "#0D1A2A",
  pdfBorder:  "rgba(0,212,212,0.35)",
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
  // PDF bijlage velden
  pdfUrl?: string;
  pdfFileName?: string;
  pdfSizeBytes?: number;
};

const CHAT_STORAGE_KEY = "higgins_chat_history_v2";

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
  const [userName, setUserName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  // Dynamische agent statussen — bijgewerkt na echte Manus API activering
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
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
  const generatePdfMutation = trpc.higgins.generatePdf.useMutation();
  const activateAgentMutation = trpc.higgins.activateAgent.useMutation();

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

  // ─── Detecteer agent-activering intentie ─────────────────────────────────
  const detectAgentActivation = (text: string): { agentName: string; taskDescription: string } | null => {
    // Bekende agentnamen in het team
    const knownAgents = [
      "Elena", "Gary", "Bard", "Picasso", "Echo", "Anna", "Larry", "Flash",
      "Elon", "Oracle", "Nano", "Pixel", "Shield", "Sentinel",
      "Warren", "Abacus", "Closer", "Carson", "Strategos", "Fortuna",
      "Catharina", "Victoria", "Barbara", "Vera", "Rosi",
      "Justitia", "Adrian", "Isabelle", "Matteo", "Elena V.", "Dr. Nadia",
      "Hugo", "Atlas", "Max", "Oscar", "Felix", "Herald",
    ];

    // Activeringspatronen in NL/DE/EN
    const activationPatterns = [
      // Nederlands
      /(?:activeer|stuur|geef opdracht aan|zet|schakel in|laat)\s+([A-Z][a-zA-Z\s\.]+?)\s+(?:om|voor|met de taak|de taak|aan om)/i,
      /([A-Z][a-zA-Z\s\.]+?)\s+(?:moet|kan|zou moeten)\s+(.+)/i,
      // Duits
      /(?:aktiviere|beauftrage|schicke|lass)\s+([A-Z][a-zA-Z\s\.]+?)\s+(?:mit|für|um)/i,
      // Engels
      /(?:activate|assign|send|task|tell|ask)\s+([A-Z][a-zA-Z\s\.]+?)\s+(?:to|with|for)/i,
    ];

    const lowerText = text.toLowerCase();
    const hasActivationKeyword = [
      "activeer", "stuur door", "geef opdracht", "laat uitvoeren", "schakel in",
      "aktiviere", "beauftrage",
      "activate", "assign to", "task ", "delegate",
    ].some(kw => lowerText.includes(kw));

    if (!hasActivationKeyword) return null;

    // Zoek welke agent genoemd wordt
    for (const agentName of knownAgents) {
      if (text.includes(agentName)) {
        // Extraheer de taakomschrijving (alles na de agentnaam)
        const agentIdx = text.indexOf(agentName);
        const afterAgent = text.substring(agentIdx + agentName.length).trim();
        // Verwijder voorzetsels aan het begin
        const taskDescription = afterAgent
          .replace(/^(om|voor|met|to|with|for|mit|für|:)\s*/i, "")
          .trim() || text;
        return { agentName, taskDescription };
      }
    }

    return null;
  };

  // ─── Stuur bericht naar Higgins ───────────────────────────────────────────
  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;

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
      // ── Detecteer agent-activering intentie ──────────────────────────────
      const agentActivation = detectAgentActivation(text);

      if (agentActivation) {
        // Activeer de agent via de Manus API
        const activationResult = await activateAgentMutation.mutateAsync({
          agentName: agentActivation.agentName,
          taskDescription: agentActivation.taskDescription,
          language,
          userName: userName ?? undefined,
        });

        historyRef.current = [
          ...historyRef.current,
          { role: "user" as const, content: text },
          { role: "assistant" as const, content: activationResult.higginsResponse },
        ].slice(-20);

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: activationResult.higginsResponse,
          timestamp: new Date(),
          type: "text",
        };

        // Bijwerken van de dynamische agent status na succesvolle activering
        if (activationResult.success) {
          setAgentStatuses(prev => ({
            ...prev,
            [agentActivation.agentName]: {
              status: "busy",
              task: agentActivation.taskDescription.substring(0, 60) + (agentActivation.taskDescription.length > 60 ? "..." : ""),
              taskId: activationResult.taskId,
            },
          }));
        }

        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updatedMessages = [...newMessages, assistantMsg];
        setMessages(updatedMessages);
        await saveMessages(updatedMessages);
      } else {
        // ── Normaal chat bericht naar Higgins ────────────────────────────────
        // Voeg agent context toe aan het bericht voor eerlijke antwoorden
        const agentContext = buildAgentContext();
        const messageWithContext = text + agentContext;

        const result = await chatMutation.mutateAsync({
          message: messageWithContext,
          history: history.map(h => ({ role: h.role, content: String(h.content) })),
          userName: userName ?? undefined,
          language,
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
          type: "text",
        };

        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updatedMessages = [...newMessages, assistantMsg];
        setMessages(updatedMessages);
        await saveMessages(updatedMessages);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Mijn excuses, ik kon uw bericht niet verwerken. Probeert u het nogmaals.",
        timestamp: new Date(),
        type: "text",
      };
      const updatedMessages = [...newMessages, errorMsg];
      setMessages(updatedMessages);
      await saveMessages(updatedMessages);
    }

    setIsLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, isLoading, userName, chatMutation, activateAgentMutation, messages, language, saveMessages]);

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
    const summaryMessage = `📋 Vergadering samenvatting:\n\n${meetingResult.summary}`;
    const assistantMsg: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: summaryMessage,
      timestamp: new Date(),
      type: "text",
    };
    const updatedMessages = [...messages, assistantMsg];
    setMessages(updatedMessages);
    await saveMessages(updatedMessages);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [meetingResult, messages, saveMessages]);

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

    const handleOpen = async () => {
      if (!msg.pdfUrl) return;
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsOpening(true);
      try {
        // Bouw de volledige URL op (server-relative pad naar absolute URL)
        const baseUrl = "https://3000-ijaocie6mkqhn7bw1b1p3-03a7ef55.us2.manus.computer";
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
        <View style={styles.pdfIconWrap}>
          <Text style={styles.pdfIcon}>📄</Text>
        </View>
        <View style={styles.pdfInfo}>
          <Text style={styles.pdfName} numberOfLines={1}>
            {msg.pdfFileName ?? "Higgins Rapport.pdf"}
          </Text>
          <Text style={styles.pdfMeta}>
            PDF · {msg.pdfSizeBytes ? formatFileSize(msg.pdfSizeBytes) : "—"} · {formatTime(msg.timestamp)}
          </Text>
          <Text style={styles.pdfCaption} numberOfLines={2}>{msg.content}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.pdfOpenBtn, pressed && { opacity: 0.7 }]}
          onPress={handleOpen}
          disabled={isOpening}
        >
          {isOpening
            ? <ActivityIndicator size="small" color={C.bg} />
            : <Text style={styles.pdfOpenBtnText}>Openen</Text>
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
          <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
            {formatTime(item.timestamp)}
          </Text>
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
              <Text style={styles.headerStatusText}>{t.chat.statusOnline}</Text>
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
        {(isLoading || isTranscribing || isGeneratingPdf) && (
          <View style={styles.typingRow}>
            <HigginsAvatar size={32} />
            <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
              {isTranscribing
                ? <Text style={[styles.bubbleText, { fontSize: 12 }]}>🎙 Transcriberen...</Text>
                : isGeneratingPdf
                  ? <Text style={[styles.bubbleText, { fontSize: 12 }]}>📄 PDF genereren...</Text>
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
                <Text style={styles.voiceButtonIcon}>{isRecording ? "⏹" : "🎙"}</Text>
              </Pressable>
            </Animated.View>
          )}

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t.chat.placeholder}
            placeholderTextColor={C.muted}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
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
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cyan, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border },
  sendButtonText: { fontSize: 24, color: C.bg, fontWeight: "900", marginTop: -2 },
  // PDF kaart
  pdfCard: { flex: 1, maxWidth: "85%", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.pdfBg, borderRadius: 16, borderWidth: 1, borderColor: C.pdfBorder, padding: 12 },
  pdfIconWrap: { width: 40, height: 48, backgroundColor: "rgba(0,212,212,0.1)", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pdfIcon: { fontSize: 22 },
  pdfInfo: { flex: 1, gap: 3 },
  pdfName: { fontSize: 13, fontWeight: "700", color: C.text, fontFamily: FONT_BOLD },
  pdfMeta: { fontSize: 11, color: C.muted, fontFamily: FONT },
  pdfCaption: { fontSize: 12, color: C.muted, fontFamily: FONT, lineHeight: 17, marginTop: 2 },
  pdfOpenBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.cyan, borderRadius: 10, alignItems: "center", justifyContent: "center", minWidth: 64 },
  pdfOpenBtnText: { fontSize: 12, fontWeight: "800", color: C.bg, fontFamily: FONT_BOLD },
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
