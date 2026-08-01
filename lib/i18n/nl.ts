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
    tower: "Tower",
    docs: "Documenten",
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
    quickCommands: "Snelle opdrachten",
    speakWithHiggins: "Spreek met Higgins",
    speakWithHigginsSub: "Stel een vraag of geef een opdracht",
    via: "via",
    // Prioriteiten
    prio1: "Q2 financieel rapport goedkeuren",
    prio2: "Voorstel nieuwe partner clinic bekijken",
    prio3: "Agenda volgende week bevestigen",
    // Snelle opdrachten
    qcDailyBrief: "Dagbriefing",
    qcPlanMeeting: "Plan vergadering",
    qcSendReport: "Stuur rapport",
    qcDelegateEmail: "Delegeer e-mail",
    qcSearchInfo: "Zoek informatie",
    qcQuickAction: "Snelle actie",
    // Agent-taken (Team Pulse op dashboard)
    taskPrepBriefing: "Briefing voorbereiden",
    taskProcessEmails: "E-mails verwerken",
    taskAwaitingOrder: "Wacht op opdracht",
    // Mock goedkeuringen (fallback)
    approvalNathalieAction: "E-mail versturen naar 3 partner clinics over Q3-planning",
    approvalWarrenAction: "Portfolio herbalancering uitvoeren (€12.400)",
    timeMinAgo: "min geleden",
    timeHourAgo: "uur geleden",
    timeDayAgo: "dag geleden",
    timeJustNow: "zojuist",
    noApprovals: "Geen openstaande goedkeuringen",
    quoteLoading: "Spreuk van de dag wordt geladen…",
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
    errorGeneric: "Mijn excuses, ik kon uw bericht niet verwerken. Probeert u het nogmaals.",
    uploadOpenBtn: "Openen",
    speakerPlay: "Voorlezen",
    speakerStop: "Stop",
    speakerLoading: "Stem laden...",
    voiceMemo: "Spraakbericht",
    voiceMemoDuration: "Duur",
    voiceMemoTranscript: "Transcriptie",
    exportChat: "Exporteer chat",
    exportChatDesc: "Download gesprek als PDF",
    exportChatSuccess: "PDF succesvol geëxporteerd",
    exportChatError: "Export mislukt",
    exporting: "Exporteren...",
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
    departmentsPlural: "Departementen",
    lastActivity: "Laatste activiteit",
    noResults: "Geen agents gevonden",
    noResultsSubtext: "Probeer een andere zoekopdracht",
    reportsTo: "Rapporteert aan",
    pipelineTeam: "Content Pipeline",
    pipelineTeamSub: "7-agent productieteam · creatief beheer door Gary",
    classifiedRoster: "Afgeschermd team",
    classifiedRosterSub: "Agentnamen verborgen · operational security",
    sourceLive: "Live via Mission Control",
    sourceBuiltin: "Ingebouwde lijst",
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
    voiceAutoPlay: "Stem Auto-Play",
    voiceAutoPlayDesc: "Lees antwoorden van Higgins automatisch voor",
    about: "Over",
    appVersion: "App Versie",
    higginsVersion: "Higgins Versie",
    logout: "Uitloggen",
    logoutConfirm: "Weet u zeker dat u wilt uitloggen?",
    logoutConfirmDesc: "Uw naam wordt verwijderd en u keert terug naar het welkomstscherm.",
    logoutButton: "Uitloggen",
    saveChanges: "Wijzigingen opslaan",
    changesSaved: "Opgeslagen",
    edition: "Editie",
    editionInternal: "Intern (volledig FMC)",
    editionWhitelab: "Whitelab (klantweergave)",
    editionDesc: "Whitelab verbergt vertrouwelijke afdelingen voor klanten",
    editionOperatorNote: "Alleen beheerder · klanten kunnen dit niet wijzigen",
    connection: "Verbinding",
    mcFeedUrl: "MC Team-feed URL",
    mcFeedUrlDesc: "Adres van de Mission Control runtime (Mac Mini), bijv. http://100.x.x.x:3007/api/app/team-feed",
    mcFeedUrlPlaceholder: "http://<mac-mini>:3007/api/app/team-feed",
    mcFeedConnected: "Verbonden · live data",
    mcFeedFallback: "Niet bereikbaar · ingebouwde lijst",
    mcFeedEmpty: "Niet ingesteld · ingebouwde lijst",
    voiceClone: "Kloon Mijn Stem",
    voiceCloneDesc: "Upload een stemfragment om uw persoonlijke AI-stem te creëren",
    voiceCloneUpload: "Upload Audiofragment",
    voiceCloneUploading: "Stem wordt gekloond...",
    voiceCloneSuccess: "Stem succesvol gekloond!",
    voiceCloneError: "Stem klonen mislukt. Probeer opnieuw.",
    voiceCloneHint: "Neem 30+ seconden duidelijke spraak op voor het beste resultaat",
    voiceCloneName: "Stemnaam",
    voiceCloneNamePlaceholder: "Mijn Stem",
  },

  // ─── Tower ──────────────────────────────────────────────────────────────────
  tower: {
    title: "Higgins Tower",
    subtitle: "verdiepingen",
    agents: "agenten",
    departments: "afdelingen",
    sourceLive: "Live via database",
    sourceBuiltin: "Ingebouwde lijst",
    legendPublic: "Bovengronds (publiek)",
    legendClassified: "Basement (classified)",
    longPressHint: "Houd ingedrukt om Higgins een opdracht te geven over deze afdeling",
    commandPrefix: "Higgins, ik heb een opdracht voor de afdeling",
  },

  // ─── Document Detail ────────────────────────────────────────────────────────
  docDetail: {
    back: "← Terug",
    title: "Document Analyse",
    analysis: "Analyse",
    higginsAnalysis: "Higgins Analyse",
    noAnalysis: "Geen analyse beschikbaar",
    viewInManus: "Bekijk in Manus →",
    noTaskId: "Geen taak ID",
    noTaskIdDesc: "Dit document heeft geen Manus taak ID",
    viewAnalysis: "Analyse bekijken",
    viewAnalysisDesc: "Open manus.im om de volledige analyse te bekijken.",
    errorOpen: "Fout",
    errorOpenDesc: "Kan de analyse pagina niet openen",
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
  tower: Record<string, string>;
  docDetail: Record<string, string>;
  settings: Record<string, string>;
  push: Record<string, string>;
  higginsLanguage: string;
};
