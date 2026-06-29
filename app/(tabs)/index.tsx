"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AppBackground } from "@/components/app-background";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { USER_NAME_KEY } from "@/app/onboarding";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/lib/language-provider";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        "#0A0C0E",
  surface:   "#111418",
  surface2:  "#161B21",
  border:    "#1E2530",
  cyan:      "#00D4D4",
  cyanDim:   "rgba(0,212,212,0.15)",
  cyanBorder:"rgba(0,212,212,0.25)",
  text:      "#E8EDF2",
  muted:     "#5A6472",
  red:       "#FF4D6A",
  redDim:    "rgba(255,77,106,0.15)",
  green:     "#00D4A0",
  greenDim:  "rgba(0,212,160,0.15)",
  amber:     "#F5A623",
};

const FONT      = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

// ─── Mock data (vertaald via builders zodat alles meedraait met de taal) ────────
type Approval = { id: string; agent: string; action: string; time: string };

function buildPriorities(t: any) {
  return [
    { id: "p1", label: t.dashboard.prio1, agent: "Warren", urgent: true },
    { id: "p2", label: t.dashboard.prio2, agent: "Justitia", urgent: false },
    { id: "p3", label: t.dashboard.prio3, agent: "Elena", urgent: false },
  ];
}

function buildQuickCommands(t: any) {
  return [
    { id: "q1", icon: "📋", label: t.dashboard.qcDailyBrief },
    { id: "q2", icon: "📅", label: t.dashboard.qcPlanMeeting },
    { id: "q3", icon: "📊", label: t.dashboard.qcSendReport },
    { id: "q4", icon: "✉️", label: t.dashboard.qcDelegateEmail },
    { id: "q5", icon: "🔍", label: t.dashboard.qcSearchInfo },
    { id: "q6", icon: "⚡", label: t.dashboard.qcQuickAction },
  ];
}

function buildApprovals(t: any): Approval[] {
  return [
    { id: "a1", agent: "Elena",  action: t.dashboard.approvalElenaAction,  time: `14 ${t.dashboard.timeMinAgo}` },
    { id: "a2", agent: "Warren", action: t.dashboard.approvalWarrenAction, time: `1 ${t.dashboard.timeHourAgo}` },
  ];
}

function buildAgentPulse(t: any) {
  return [
    { id: "ag1", name: "Higgins", status: "active", task: t.dashboard.taskPrepBriefing },
    { id: "ag2", name: "Elena",   status: "active", task: t.dashboard.taskProcessEmails },
    { id: "ag3", name: "Warren",  status: "idle",   task: t.dashboard.taskAwaitingOrder },
    { id: "ag4", name: "Justitia",status: "idle",   task: t.dashboard.taskAwaitingOrder },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const PRIORITIES = buildPriorities(t);
  const QUICK_COMMANDS = buildQuickCommands(t);
  const AGENT_PULSE = buildAgentPulse(t);
  const [userName, setUserName] = useState<string | null>(null);
  const [approvalFeedback, setApprovalFeedback] = useState<Record<string, string>>({});
  const [weatherLocation, setWeatherLocation] = useState<{ lat: number; lon: number; name: string } | undefined>(undefined);

  // Subtiele puls animatie op de status dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Live Morning Briefing via server
  const briefQuery = trpc.higgins.morningBrief.useQuery(
    { userName: userName ?? undefined, language },
    { enabled: true, staleTime: 5 * 60 * 1000 }
  );

  // Daily Briefing: weer, nieuws, spreuk
  const dailyQuery = trpc.higgins.dailyBriefing.useQuery(
    { lang: language, location: weatherLocation },
    { staleTime: 30 * 60 * 1000, enabled: true }
  );

  // Live approvals from server
  const approvalsQuery = trpc.higgins.getPendingApprovals.useQuery(
    { userName: userName ?? undefined },
    { staleTime: 30 * 1000, refetchInterval: 30 * 1000 }
  );

  // Use live approvals from server, fallback to localized mock if loading
  const [approvals, setApprovals] = useState<Approval[]>(() => buildApprovals(t));

  // Houd fallback-goedkeuringen in sync met de taal zolang er geen live data is
  useEffect(() => {
    if (!approvalsQuery.data) setApprovals(buildApprovals(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    if (approvalsQuery.data) {
      setApprovals(approvalsQuery.data);
    }
  }, [approvalsQuery.data]);

  // Uitklapbare secties
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const toggleSection = (id: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  // Approval mutation
  const approvalMutation = trpc.higgins.processApproval.useMutation();

  useEffect(() => {
    AsyncStorage.getItem(USER_NAME_KEY).then((name) => {
      if (name) setUserName(name);
    });
    AsyncStorage.getItem("@higgins_weather_coords").then((val) => {
      if (val) {
        try { setWeatherLocation(JSON.parse(val)); } catch (_) {}
      }
    });
  }, []);

  useEffect(() => {
    if (userName) {
      approvalsQuery.refetch();
    }
  }, [userName, approvalsQuery]);

  const handleApproval = useCallback(async (item: Approval, action: "approve" | "reject") => {
    if (Platform.OS !== "web") {
      action === "approve"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    try {
      const result = await approvalMutation.mutateAsync({
        approvalId: item.id,
        action,
        agentName: item.agent,
        actionDescription: item.action,
        userName: userName ?? undefined,
      });
      const higginsReply = typeof result.higginsResponse === "string"
        ? result.higginsResponse
        : "Begrepen.";
      setApprovalFeedback((prev) => ({ ...prev, [item.id]: higginsReply }));
      setTimeout(() => {
        setApprovals((prev) => prev.filter((a) => a.id !== item.id));
      }, 3000);
    } catch (_) {
      setApprovalFeedback((prev) => ({ ...prev, [item.id]: "Actie verwerkt." }));
      setTimeout(() => {
        setApprovals((prev) => prev.filter((a) => a.id !== item.id));
      }, 2000);
    }
  }, [userName, approvalMutation]);

  const now = new Date();
  const hour = now.getHours();
  const greetingWord = hour < 12 ? t.dashboard.morning : hour < 18 ? t.dashboard.afternoon : t.dashboard.evening;
  const greeting = userName ? `${greetingWord}, ${userName}` : greetingWord;

  return (
    <ScreenContainer containerClassName="bg-background">
      <AppBackground>
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header met logo + taalwisselaar ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <HigginsAvatar size={36} />
            <View style={{ marginLeft: 10 }}>
              <Text style={s.title}>{t.dashboard.title}</Text>
            </View>
            {/* Weerbadge naast logo */}
            {dailyQuery.data?.weather && (
              <View style={s.weatherBadge}>
                <Text style={s.weatherBadgeIcon}>{dailyQuery.data.weather.icon ?? "🌡️"}</Text>
                <Text style={s.weatherBadgeText}>
                  {dailyQuery.data.weather.temperature}°  {dailyQuery.data.weather.location}
                </Text>
              </View>
            )}
          </View>
          <View style={s.headerRight}>
            <LanguageSwitcher />
            <View style={s.statusBadge}>
              <Animated.View style={[s.statusDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={s.statusText}>{t.common.online}</Text>
            </View>
          </View>
        </View>

        {/* ── Morning Brief ── */}
        <View style={s.briefCard}>
          <View style={s.briefHeader}>
            <HigginsAvatar size={38} />
            <View style={{ flex: 1 }}>
              <Text style={s.briefLabel}>{t.dashboard.morningBriefing}</Text>
              <Text style={s.briefDate}>{briefQuery.data?.date ?? ""}</Text>
            </View>
            <View style={s.newBadge}>
              <Text style={s.newBadgeText}>{t.dashboard.morningBriefingNew}</Text>
            </View>
          </View>
          <Text style={s.briefSummary}>
            {briefQuery.isLoading ? t.dashboard.morningBriefLoading : briefQuery.data?.brief ?? ""}
          </Text>
          <Pressable
            style={({ pressed }) => [s.briefCta, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              router.push("/chat");
            }}
          >
            <Text style={s.briefCtaText}>{t.dashboard.discussWithHiggins}</Text>
          </Pressable>
        </View>

        {/* ── Weer ── */}
        <Pressable onPress={() => toggleSection("weather")} style={s.infoCard}>
          <View style={s.infoCardHeader}>
            <Text style={s.infoCardIcon}>
              {dailyQuery.data?.weather?.icon ?? "🌡️"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={s.infoCardTitle}>
                {language === "de" ? "Wetter heute" : language === "en" ? "Today's Weather" : "Weer vandaag"}
              </Text>
              {dailyQuery.data?.weather && (
                <Text style={s.infoCardSubtitle}>
                  {dailyQuery.data.weather.temperature}°C · {dailyQuery.data.weather.description} · {dailyQuery.data.weather.location}
                </Text>
              )}
            </View>
            <Text style={[s.chevron, expandedSection === "weather" && s.chevronOpen]}>›</Text>
          </View>
          {expandedSection === "weather" && dailyQuery.data?.weather && (
            <View style={s.infoCardBody}>
              <View style={s.weatherGrid}>
                <View style={s.weatherItem}>
                  <Text style={s.weatherValue}>{dailyQuery.data.weather.tempMax}°/{dailyQuery.data.weather.tempMin}°</Text>
                  <Text style={s.weatherLabel}>{language === "de" ? "Max/Min" : "Max/Min"}</Text>
                </View>
                <View style={s.weatherItem}>
                  <Text style={s.weatherValue}>{dailyQuery.data.weather.feelsLike}°C</Text>
                  <Text style={s.weatherLabel}>{language === "de" ? "Gefühlt" : language === "en" ? "Feels like" : "Gevoeld"}</Text>
                </View>
                <View style={s.weatherItem}>
                  <Text style={s.weatherValue}>{dailyQuery.data.weather.windSpeed} km/h</Text>
                  <Text style={s.weatherLabel}>{language === "de" ? "Wind" : "Wind"}</Text>
                </View>
                <View style={s.weatherItem}>
                  <Text style={s.weatherValue}>{dailyQuery.data.weather.humidity}%</Text>
                  <Text style={s.weatherLabel}>{language === "de" ? "Luftfeuchtigkeit" : language === "en" ? "Humidity" : "Vochtigheid"}</Text>
                </View>
                <View style={s.weatherItem}>
                  <Text style={s.weatherValue}>UV {dailyQuery.data.weather.uvIndex}</Text>
                  <Text style={s.weatherLabel}>{language === "de" ? "UV-Index" : "UV-index"}</Text>
                </View>
                <View style={s.weatherItem}>
                  <Text style={s.weatherValue}>{dailyQuery.data.weather.precipitation} mm</Text>
                  <Text style={s.weatherLabel}>{language === "de" ? "Niederschlag" : language === "en" ? "Precipitation" : "Neerslag"}</Text>
                </View>
              </View>
            </View>
          )}
        </Pressable>

        {/* ── Wereldnieuws ── */}
        <Pressable onPress={() => toggleSection("news")} style={s.infoCard}>
          <View style={s.infoCardHeader}>
            <Text style={s.infoCardIcon}>🌍</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.infoCardTitle}>
                {language === "de" ? "Weltnachrichten" : language === "en" ? "World News" : "Wereldnieuws"}
              </Text>
              <Text style={s.infoCardSubtitle}>
                {language === "de" ? "Top 3 heute" : language === "en" ? "Top 3 today" : "Top 3 vandaag"}
              </Text>
            </View>
            <Text style={[s.chevron, expandedSection === "news" && s.chevronOpen]}>›</Text>
          </View>
          {expandedSection === "news" && (
            <View style={s.infoCardBody}>
              {(dailyQuery.data?.worldNews ?? []).map((headline: string, i: number) => (
                <View key={i} style={s.newsItem}>
                  <View style={s.newsDot} />
                  <Text style={s.newsText}>{headline}</Text>
                </View>
              ))}
              {dailyQuery.isLoading && <Text style={s.loadingText}>…</Text>}
            </View>
          )}
        </Pressable>

        {/* ── AI & Blockchain ── */}
        <Pressable onPress={() => toggleSection("tech")} style={s.infoCard}>
          <View style={s.infoCardHeader}>
            <Text style={s.infoCardIcon}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.infoCardTitle}>
                {language === "de" ? "KI & Blockchain" : language === "en" ? "AI & Blockchain" : "AI & Blockchain"}
              </Text>
              <Text style={s.infoCardSubtitle}>
                {language === "de" ? "Neueste Innovationen" : language === "en" ? "Latest innovations" : "Laatste innovaties"}
              </Text>
            </View>
            <Text style={[s.chevron, expandedSection === "tech" && s.chevronOpen]}>›</Text>
          </View>
          {expandedSection === "tech" && (
            <View style={s.infoCardBody}>
              {(dailyQuery.data?.techNews ?? []).map((headline: string, i: number) => (
                <View key={i} style={s.newsItem}>
                  <View style={[s.newsDot, { backgroundColor: C.cyan }]} />
                  <Text style={s.newsText}>{headline}</Text>
                </View>
              ))}
              {dailyQuery.isLoading && <Text style={s.loadingText}>…</Text>}
            </View>
          )}
        </Pressable>

        {/* ── Spreuk van de dag ── */}
        <View style={s.quoteCard}>
          <Text style={s.quoteIcon}>💡</Text>
          <Text style={s.quoteText}>
            "{dailyQuery.data?.quote?.text ?? ""}"
          </Text>
          <Text style={s.quoteAuthor}>— {dailyQuery.data?.quote?.author ?? ""}</Text>
        </View>

        {/* ── Goedkeuringen ── */}
        {approvals.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>{t.dashboard.awaitingApproval}</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{approvals.length}</Text>
              </View>
            </View>
            {approvals.map((item) => (
              <View key={item.id} style={s.approvalCard}>
                <View style={s.approvalTop}>
                  <Text style={s.approvalAgent}>{item.agent}</Text>
                  <Text style={s.approvalTime}>{item.time}</Text>
                </View>
                <Text style={s.approvalAction}>{item.action}</Text>
                {approvalFeedback[item.id] ? (
                  <View style={[s.briefHighlight, { marginTop: 8 }]}>
                    <Text style={[s.briefHighlightText, { fontSize: 13 }]}>💬 {approvalFeedback[item.id]}</Text>
                  </View>
                ) : (
                  <View style={s.approvalButtons}>
                    <Pressable
                      style={({ pressed }) => [s.btnApprove, pressed && { opacity: 0.75 }, approvalMutation.isPending && { opacity: 0.5 }]}
                      onPress={() => handleApproval(item, "approve")}
                      disabled={approvalMutation.isPending}
                    >
                      <Text style={s.btnApproveText}>✓  {t.dashboard.approve}</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [s.btnReject, pressed && { opacity: 0.75 }, approvalMutation.isPending && { opacity: 0.5 }]}
                      onPress={() => handleApproval(item, "reject")}
                      disabled={approvalMutation.isPending}
                    >
                      <Text style={s.btnRejectText}>✕  {t.dashboard.reject}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Prioriteiten ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.dashboard.prioritiesToday}</Text>
          {PRIORITIES.map((item, index) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [s.priorityItem, pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] }]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                router.push("/chat");
              }}
            >
              <View style={[s.priorityNum, item.urgent && s.priorityNumUrgent]}>
                <Text style={[s.priorityNumText, item.urgent && { color: C.cyan }]}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.priorityLabel}>{item.label}</Text>
                <Text style={s.priorityAgent}>{t.dashboard.via} {item.agent}</Text>
              </View>
              {item.urgent && (
                <View style={s.urgentTag}>
                  <Text style={s.urgentTagText}>{t.dashboard.urgent}</Text>
                </View>
              )}
              <Text style={s.arrow}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Snelle Opdrachten ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.dashboard.quickCommands}</Text>
          <View style={s.commandGrid}>
            {QUICK_COMMANDS.map((cmd) => (
              <Pressable
                key={cmd.id}
                style={({ pressed }) => [
                  s.commandCard,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                ]}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                  router.push("/chat");
                }}
              >
                <Text style={s.commandIcon}>{cmd.icon}</Text>
                <Text style={s.commandLabel}>{cmd.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Team Pulse ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.tabs.teamPulse}</Text>
          {AGENT_PULSE.map((agent) => (
            <View key={agent.id} style={s.pulseItem}>
              <View style={[s.pulseDot, { backgroundColor: agent.status === "active" ? C.green : C.muted }]} />
              <Text style={s.pulseName}>{agent.name}</Text>
              <Text style={s.pulseTask} numberOfLines={1}>{agent.task}</Text>
              <View style={[s.pulseTag, { backgroundColor: agent.status === "active" ? C.greenDim : "rgba(90,100,114,0.2)" }]}>
                <Text style={[s.pulseTagText, { color: agent.status === "active" ? C.green : C.muted }]}>
                  {agent.status === "active" ? t.dashboard.active : t.dashboard.standby}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── CTA ── */}
        <Pressable
          style={({ pressed }) => [s.chatCta, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={() => router.push("/chat")}
        >
          <HigginsAvatar size={42} />
          <View style={{ flex: 1 }}>
            <Text style={s.chatCtaTitle}>{t.dashboard.speakWithHiggins}</Text>
            <Text style={s.chatCtaSub}>{t.dashboard.speakWithHigginsSub}</Text>
          </View>
          <Text style={s.chatCtaArrow}>›</Text>
        </Pressable>
      </ScrollView>
      </AppBackground>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    fontFamily: FONT_BOLD,
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.greenDim,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,212,160,0.3)",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
  },
  statusText: {
    fontSize: 10,
    color: C.green,
    fontWeight: "700",
    fontFamily: FONT,
    letterSpacing: 0.5,
  },

  // Weerbadge in header
  weatherBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 4,
    marginLeft: 8,
  },
  weatherBadgeIcon: {
    fontSize: 13,
  },
  weatherBadgeText: {
    fontSize: 11,
    color: C.muted,
    fontFamily: FONT,
    fontWeight: "600",
  },

  // Brief card — glassmorphism
  briefCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "rgba(0,212,212,0.06)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.35)",
    gap: 12,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  briefHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  briefLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: C.cyan,
    fontFamily: FONT_BOLD,
    letterSpacing: 2,
  },
  briefDate: { fontSize: 11, color: C.muted, marginTop: 2, fontFamily: FONT },
  newBadge: {
    backgroundColor: C.cyanDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.cyanBorder,
  },
  newBadgeText: {
    fontSize: 9,
    color: C.cyan,
    fontWeight: "800",
    fontFamily: FONT_BOLD,
    letterSpacing: 1.5,
  },
  briefSummary: {
    fontSize: 13,
    color: C.text,
    lineHeight: 21,
    fontFamily: FONT,
    opacity: 0.85,
  },
  briefHighlight: {
    backgroundColor: C.cyanDim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderLeftWidth: 3,
    borderLeftColor: C.cyan,
  },
  briefHighlightText: {
    fontSize: 12,
    color: C.cyan,
    fontWeight: "700",
    fontFamily: FONT_BOLD,
  },
  briefCta: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: C.cyan,
    borderRadius: 12,
  },
  briefCtaText: {
    fontSize: 13,
    color: "#0A0C0E",
    fontWeight: "800",
    fontFamily: FONT_BOLD,
  },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    fontFamily: FONT_BOLD,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  countBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "800",
    fontFamily: FONT_BOLD,
  },

  // Approvals — glassmorphism
  approvalCard: {
    backgroundColor: "rgba(255,77,106,0.06)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,77,106,0.35)",
    gap: 8,
    marginBottom: 10,
    shadowColor: "#FF4D6A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  approvalTop: { flexDirection: "row", justifyContent: "space-between" },
  approvalAgent: {
    fontSize: 12,
    fontWeight: "800",
    color: C.cyan,
    fontFamily: FONT_BOLD,
    letterSpacing: 0.5,
  },
  approvalTime: { fontSize: 11, color: C.muted, fontFamily: FONT },
  approvalAction: {
    fontSize: 13,
    color: C.text,
    lineHeight: 19,
    fontFamily: FONT,
  },
  approvalButtons: { flexDirection: "row", gap: 8, marginTop: 4 },
  btnApprove: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: C.greenDim,
    borderWidth: 1,
    borderColor: "rgba(0,212,160,0.3)",
  },
  btnApproveText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.green,
    fontFamily: FONT_BOLD,
  },
  btnReject: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: C.redDim,
    borderWidth: 1,
    borderColor: "rgba(255,77,106,0.3)",
  },
  btnRejectText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.red,
    fontFamily: FONT_BOLD,
  },

  // Priorities — glassmorphism
  priorityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.18)",
    marginBottom: 8,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  priorityNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  priorityNumUrgent: {
    borderColor: C.cyanBorder,
    backgroundColor: C.cyanDim,
  },
  priorityNumText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.muted,
    fontFamily: FONT_BOLD,
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    lineHeight: 18,
    fontFamily: FONT,
  },
  priorityAgent: { fontSize: 11, color: C.muted, marginTop: 2, fontFamily: FONT },
  urgentTag: {
    backgroundColor: C.redDim,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,77,106,0.3)",
  },
  urgentTagText: {
    fontSize: 9,
    color: C.red,
    fontWeight: "800",
    fontFamily: FONT_BOLD,
    letterSpacing: 1,
  },
  arrow: { fontSize: 22, color: C.muted, fontWeight: "300" },

  // Quick commands
  commandGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  commandCard: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: "rgba(0,212,212,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.22)",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  commandIcon: { fontSize: 22 },
  commandLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    fontFamily: FONT_BOLD,
    letterSpacing: 0.2,
  },

  // Team Pulse
  pulseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.15)",
    marginBottom: 8,
  },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  pulseName: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    width: 72,
    fontFamily: FONT_BOLD,
  },
  pulseTask: { flex: 1, fontSize: 12, color: C.muted, fontFamily: FONT },
  pulseTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pulseTagText: { fontSize: 10, fontWeight: "700", fontFamily: FONT_BOLD },

  // Chat CTA
  chatCta: {
    marginHorizontal: 20,
    backgroundColor: C.cyan,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  chatCtaTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0A0C0E",
    fontFamily: FONT_BOLD,
  },
  chatCtaSub: {
    fontSize: 12,
    color: "rgba(10,12,14,0.65)",
    marginTop: 2,
    fontFamily: FONT,
  },
  chatCtaArrow: {
    fontSize: 26,
    color: "rgba(10,12,14,0.5)",
    fontWeight: "300",
  },

  // Info cards (weer, nieuws, spreuk)
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "rgba(17,20,24,0.85)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.18)",
    overflow: "hidden",
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  infoCardIcon: {
    fontSize: 24,
    width: 32,
    textAlign: "center",
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    fontFamily: FONT_BOLD,
  },
  infoCardSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
    fontFamily: FONT,
  },
  chevron: {
    fontSize: 22,
    color: C.muted,
    fontWeight: "300",
    transform: [{ rotate: "0deg" }],
  },
  chevronOpen: {
    transform: [{ rotate: "90deg" }],
    color: C.cyan,
  },
  infoCardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,212,212,0.1)",
    paddingTop: 12,
  },

  // Weer grid
  weatherGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  weatherItem: {
    width: "30%",
    backgroundColor: "rgba(0,212,212,0.06)",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.12)",
  },
  weatherValue: {
    fontSize: 15,
    fontWeight: "800",
    color: C.cyan,
    fontFamily: FONT_BOLD,
  },
  weatherLabel: {
    fontSize: 10,
    color: C.muted,
    marginTop: 3,
    fontFamily: FONT,
    textAlign: "center",
  },

  // Nieuws items
  newsItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  newsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.amber,
    marginTop: 5,
    flexShrink: 0,
  },
  newsText: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    lineHeight: 19,
    fontFamily: FONT,
  },
  loadingText: {
    fontSize: 20,
    color: C.muted,
    textAlign: "center",
    paddingVertical: 8,
  },

  // Spreuk card
  quoteCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "rgba(245,166,35,0.06)",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.25)",
    alignItems: "center",
    gap: 10,
  },
  quoteIcon: {
    fontSize: 28,
  },
  quoteText: {
    fontSize: 14,
    color: C.text,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: FONT,
  },
  quoteAuthor: {
    fontSize: 12,
    color: C.amber,
    fontWeight: "700",
    fontFamily: FONT_BOLD,
    letterSpacing: 0.3,
  },
});
