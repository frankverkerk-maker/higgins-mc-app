import type { Translations } from "./nl";

export const en: Translations = {
  // ─── Common ──────────────────────────────────────────────────────────────────
  common: {
    loading: "Loading...",
    error: "An error occurred",
    retry: "Try again",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    close: "Close",
    back: "Back",
    next: "Next",
    done: "Done",
    yes: "Yes",
    no: "No",
    online: "Online",
    offline: "Offline",
    version: "Version",
  },

  // ─── Tabs ────────────────────────────────────────────────────────────────────
  tabs: {
    command: "Command",
    chat: "Chat",
    teamPulse: "Team Pulse",
    docs: "Documents",
    settings: "Settings",
  },

  // ─── Onboarding ──────────────────────────────────────────────────────────────
  onboarding: {
    welcome: "Welcome to",
    subtitle: "Your personal Chief of Staff",
    namePlaceholder: "Your name (e.g. Frank)",
    nameLabel: "How should Higgins address you?",
    startButton: "Start with Higgins",
    nameRequired: "Please enter your name to continue",
  },

  // ─── Dashboard / Command Center ──────────────────────────────────────────────
  dashboard: {
    title: "Command Center",
    morningBriefing: "MORNING BRIEFING",
    morningBriefingNew: "NEW",
    morningBriefLoading: "Higgins is preparing your briefing...",
    discussWithHiggins: "Discuss with Higgins →",
    awaitingApproval: "Awaiting your approval",
    approve: "Approve",
    reject: "Reject",
    prioritiesToday: "Today's priorities",
    urgent: "URGENT",
    teamStatus: "Team status",
    active: "Active",
    standby: "Standby",
    agents: "agents",
    minutesAgo: "min ago",
    hourAgo: "hr ago",
    hoursAgo: "hrs ago",
    justNow: "just now",
    morning: "GOOD MORNING",
    afternoon: "GOOD AFTERNOON",
    evening: "GOOD EVENING",
  },

  // ─── Chat ────────────────────────────────────────────────────────────────────
  chat: {
    title: "Higgins",
    statusOnline: "Chief of Staff · Online",
    statusOffline: "Chief of Staff · Offline",
    placeholder: "Ask Higgins a question...",
    meetingButton: "Meeting",
    meetingActive: "Recording active",
    meetingBannerText: "Meeting is being recorded",
    meetingBannerStop: "Stop",
    sendButton: "Send",
    typing: "Higgins is typing...",
    errorSend: "Could not send message. Please try again.",
    meetingModalTitle: "Meeting Processed",
    meetingModalSubtitle: "Higgins has analysed your meeting",
    meetingModalSummaryLabel: "HIGGINS SUMMARY",
    meetingModalTranscriptLabel: "FULL TRANSCRIPT",
    meetingModalProcessing: "Higgins is analysing the meeting...",
    meetingModalProcessingSubtext: "This may take a moment depending on the duration",
    meetingModalSendToChat: "Send summary to chat →",
    meetingRecordingError: "Recording failed. Please check microphone access.",
    meetingProcessingError: "Processing failed. Please try again.",
    // PDF upload
    uploadButton: "Attach",
    uploadPickerTitle: "Choose document",
    uploadUploading: "Uploading document...",
    uploadError: "Upload failed. Please try again.",
    uploadOpenBtn: "Open",
  },

  // ─── Agents / Team Pulse ─────────────────────────────────────────────────────
  agents: {
    title: "Team Pulse",
    subtitle: "Live status of your AI team",
    searchPlaceholder: "Search agent or department...",
    allDepartments: "All departments",
    activeAgents: "active agents",
    statusActive: "Active",
    statusStandby: "Standby",
    statusBusy: "Busy",
    statusOffline: "Offline",
    role: "Role",
    department: "Department",
    lastActivity: "Last activity",
    noResults: "No agents found",
    noResultsSubtext: "Try a different search query",
  },

  // ─── Settings ────────────────────────────────────────────────────────────────
  settings: {
    title: "Settings",
    profile: "Profile",
    name: "Name",
    language: "Language",
    languageNL: "Dutch",
    languageDE: "German",
    languageEN: "English",
    preferences: "Preferences",
    morningBriefing: "Morning Briefing",
    morningBriefingDesc: "Daily briefing from Higgins",
    hapticFeedback: "Haptic Feedback",
    hapticFeedbackDesc: "Vibration patterns on interactions",
    darkMode: "Dark Theme",
    darkModeDesc: "Automatic based on system",
    notifications: "Notifications",
    notificationsDesc: "Push notifications from Higgins",
    about: "About",
    appVersion: "App Version",
    higginsVersion: "Higgins Version",
    logout: "Log out",
    logoutConfirm: "Are you sure you want to log out?",
    logoutConfirmDesc: "Your name will be removed and you will return to the welcome screen.",
    logoutButton: "Log out",
    saveChanges: "Save changes",
    changesSaved: "Saved",
  },

  // ─── Push notifications ──────────────────────────────────────────────────────
  push: {
    approvalTitle: "Approval required",
    morningBriefTitle: "Good morning — Higgins Briefing",
    chatTitle: "Higgins has responded",
  },

  // ─── Higgins system prompt language ──────────────────────────────────────────
  higginsLanguage: "You always communicate in English, unless Frank explicitly requests another language.",
};
