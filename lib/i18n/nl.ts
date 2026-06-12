export const nl = {
  // ─── Algemeen ───────────────────────────────────────────────────────────────
  common: {
    loading: "Laden...",
    error: "Er is een fout opgetreden",
    retry: "Opnieuw proberen",
    cancel: "Annuleren",
    confirm: "Bevestigen",
    save: "Opslaan",
    close: "Sluiten",
    back: "Terug",
    next: "Volgende",
    done: "Klaar",
    yes: "Ja",
    no: "Nee",
    online: "Online",
    offline: "Offline",
    version: "Versie",
  },

  // ─── Tabs ────────────────────────────────────────────────────────────────────
  tabs: {
    command: "Command",
    chat: "Chat",
    teamPulse: "Team Pulse",
    settings: "Instellingen",
  },

  // ─── Onboarding ──────────────────────────────────────────────────────────────
  onboarding: {
    welcome: "Welkom bij",
    subtitle: "Uw persoonlijke Chief of Staff",
    namePlaceholder: "Uw naam (bijv. Frank)",
    nameLabel: "Hoe mag Higgins u aanspreken?",
    startButton: "Start met Higgins",
    nameRequired: "Voer uw naam in om door te gaan",
  },

  // ─── Dashboard / Command Center ──────────────────────────────────────────────
  dashboard: {
    title: "Command Center",
    morningBriefing: "OCHTEND BRIEFING",
    morningBriefingNew: "NIEUW",
    morningBriefLoading: "Higgins bereidt uw briefing voor...",
    discussWithHiggins: "Bespreek met Higgins →",
    awaitingApproval: "Wacht op uw goedkeuring",
    approve: "Goedkeuren",
    reject: "Afwijzen",
    prioritiesToday: "Prioriteiten vandaag",
    urgent: "URGENT",
    teamStatus: "Teamstatus",
    active: "Actief",
    standby: "Stand-by",
    agents: "agents",
    minutesAgo: "min geleden",
    hourAgo: "uur geleden",
    hoursAgo: "uur geleden",
    justNow: "zojuist",
    morning: "GOEDEMORGEN",
    afternoon: "GOEDEMIDDAG",
    evening: "GOEDENAVOND",
  },

  // ─── Chat ────────────────────────────────────────────────────────────────────
  chat: {
    title: "Higgins",
    statusOnline: "Chief of Staff · Online",
    statusOffline: "Chief of Staff · Offline",
    placeholder: "Stel een vraag aan Higgins...",
    meetingButton: "Vergadering",
    meetingActive: "Opname actief",
    meetingBannerText: "Vergadering wordt opgenomen",
    meetingBannerStop: "Stop",
    sendButton: "Verstuur",
    typing: "Higgins typt...",
    errorSend: "Kon bericht niet versturen. Probeer opnieuw.",
    // Vergadering modal
    meetingModalTitle: "Vergadering Verwerkt",
    meetingModalSubtitle: "Higgins heeft uw vergadering geanalyseerd",
    meetingModalSummaryLabel: "SAMENVATTING VAN HIGGINS",
    meetingModalTranscriptLabel: "VOLLEDIGE TRANSCRIPTIE",
    meetingModalProcessing: "Higgins analyseert de vergadering...",
    meetingModalProcessingSubtext: "Dit kan even duren afhankelijk van de duur",
    meetingModalSendToChat: "Stuur samenvatting naar chat →",
    meetingRecordingError: "Opname mislukt. Controleer microfoon toegang.",
    meetingProcessingError: "Verwerking mislukt. Probeer opnieuw.",
    // PDF upload
    uploadButton: "Bijlage",
    uploadPickerTitle: "Document kiezen",
    uploadUploading: "Document uploaden...",
    uploadError: "Upload mislukt. Probeer opnieuw.",
    uploadOpenBtn: "Openen",
  },

  // ─── Agents / Team Pulse ─────────────────────────────────────────────────────
  agents: {
    title: "Team Pulse",
    subtitle: "Live status van uw AI-team",
    searchPlaceholder: "Zoek agent of departement...",
    allDepartments: "Alle departementen",
    activeAgents: "actieve agents",
    statusActive: "Actief",
    statusStandby: "Stand-by",
    statusBusy: "Bezig",
    statusOffline: "Offline",
    role: "Rol",
    department: "Departement",
    lastActivity: "Laatste activiteit",
    noResults: "Geen agents gevonden",
    noResultsSubtext: "Probeer een andere zoekopdracht",
  },

  // ─── Settings / Instellingen ─────────────────────────────────────────────────
  settings: {
    title: "Instellingen",
    profile: "Profiel",
    name: "Naam",
    language: "Taal",
    languageNL: "Nederlands",
    languageDE: "Duits",
    languageEN: "Engels",
    preferences: "Voorkeuren",
    morningBriefing: "Ochtend Briefing",
    morningBriefingDesc: "Dagelijkse briefing van Higgins",
    hapticFeedback: "Haptische Feedback",
    hapticFeedbackDesc: "Trilpatronen bij interacties",
    darkMode: "Donker Thema",
    darkModeDesc: "Automatisch op basis van systeem",
    notifications: "Notificaties",
    notificationsDesc: "Push notificaties van Higgins",
    about: "Over",
    appVersion: "App Versie",
    higginsVersion: "Higgins Versie",
    logout: "Uitloggen",
    logoutConfirm: "Weet u zeker dat u wilt uitloggen?",
    logoutConfirmDesc: "Uw naam wordt verwijderd en u keert terug naar het welkomstscherm.",
    logoutButton: "Uitloggen",
    saveChanges: "Wijzigingen opslaan",
    changesSaved: "Opgeslagen",
  },

  // ─── Push notificaties ───────────────────────────────────────────────────────
  push: {
    approvalTitle: "Goedkeuring vereist",
    morningBriefTitle: "Goedemorgen — Higgins Briefing",
    chatTitle: "Higgins heeft gereageerd",
  },

  // ─── Higgins system prompt taal ──────────────────────────────────────────────
  higginsLanguage: "Je communiceert altijd in het Nederlands, tenzij Frank expliciet een andere taal vraagt.",
} as const;

// Gebruik een flexibel type zodat vertalingen niet gebonden zijn aan exacte NL strings
export type Translations = {
  common: Record<string, string>;
  tabs: Record<string, string>;
  onboarding: Record<string, string>;
  dashboard: Record<string, string>;
  chat: Record<string, string>;
  agents: Record<string, string>;
  settings: Record<string, string>;
  push: Record<string, string>;
  higginsLanguage: string;
};
