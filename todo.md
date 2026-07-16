# Higgins MC App — TODO

## Fase 1: Fundament
- [x] Project initialiseren (Expo + React Native scaffold)
- [x] App logo genereren en branding toepassen (cilinderhoed logo)
- [x] Design tokens (kleuren, typografie) instellen
- [x] app.config.ts bijwerken met naam en branding

## Fase 2: Navigatie & Schermen
- [x] Tab bar navigatie (4 tabs: Command, Chat, Team Pulse, Instellingen)
- [x] Dashboard / Command Center scherm
- [x] Chat scherm (Higgins conversatie interface)
- [x] Team Pulse scherm (agent activiteit tijdlijn)
- [x] Instellingen scherm

## Fase 3: Functionaliteit
- [x] Manus API service aangemaakt (lib/manus-api.ts)
- [x] Live Manus API chat integratie met API key modal
- [x] Demo modus fallback zonder API key
- [x] Live/Demo status indicator in chat header
- [x] Agent status weergave (actief/inactief)
- [x] Berichten persistentie (AsyncStorage)
- [x] Splash screen animatie (fade-in + spring + fade-out)
- [x] Higgins cilinderhoed avatar in alle schermen
- [x] Executive Command Center redesign (Morning Brief, Goedkeuringen, Prioriteiten, Snelle Opdrachten, Team Pulse)

## Fase 4: Luxury Dark Redesign (in uitvoering)
- [x] Kleurenschema omzetten naar deep black + cyaan
- [x] Avenir lettertype instellen (iOS native, web fallback)
- [x] Tab bar hoogte gefixd (iconen volledig zichtbaar)
- [x] Dashboard herbouwd in luxury dark stijl
- [x] Chat scherm in luxury dark stijl
- [x] Team Pulse scherm in luxury dark stijl
- [x] Instellingen scherm in luxury dark stijl

## Fase 5: Uitbreidingen
- [x] iPad layout optimalisatie — sidebar navigatie op iPad (≥768pt), tab bar op iPhone
- [ ] Voice-to-Higgins microfoon knop in chat
- [x] Naam personalisatie onboarding scherm (welkomst animatie + persoonlijke begroeting)
- [x] Naam integratie in Dashboard en Chat (Higgins spreekt gebruiker persoonlijk aan)
- [x] Volledig team overzicht verwerkt (36 agents, 7 departementen, officiële namen en rollen)
- [ ] Push notificaties (agent heeft bericht)
- [x] Haptische experience verfijnd — tab bar (iOS+Android), agents (tik voor details), settings (toggle Medium, logout Warning)
- [x] Settings scherm uitgebreid met Ochtend Briefing toggle en Haptische Feedback toggle
- [x] Morning Brief cron endpoint — POST /api/scheduled/morning-brief (AI nieuws, crypto, prioriteiten, teamstatus)
- [x] Morning Brief cron job geconfigureerd — dagelijks 07:00 CET, activeert na deployment
- [x] Haptic feedback op acties (goedkeuringen, navigatie, berichten)
- [x] Voice-to-Higgins microfoon knop in chat

## Fase 6: Live Backend Integratie
- [x] Server-side Higgins chat endpoint (ingebouwde LLM, geen externe API key nodig)
- [x] Whisper spraak transcriptie endpoint op server
- [x] Goedkeuringen verwerken via server (approve/reject met Higgins bevestiging)
- [x] Morning Briefing genereren via server LLM
- [x] Chat scherm koppelen aan live server backend
- [x] Goedkeuringen koppelen aan live server backend (live Higgins reactie + verdwijnt na 3s)
- [x] Morning Briefing koppelen aan live server backend
- [x] Vergadering opname knop (Whisper transcriptie + Higgins samenvatting) — in Chat header
- [x] Adviesrapport PDF bijwerken met kostenstructuur, iPad architectuur en MDM

## Openstaande actiepunten (buiten app)
- [ ] Apple MDM installeren (Mosyle Business of Jamf Now aanbevolen)
- [ ] Apple Business Manager account aanmaken voor Carpe Diem
- [ ] iPad Command Bundle propositie uitwerken (MDM + app + Mission Control web)
- [x] Adviesrapport PDF bijwerken met iPad architectuur en MDM notitie
- [x] Teamnamen verwerkt via aangeleverd team overzicht (36 agents, 7 departementen)
- [ ] Apple Developer Account aanmaken voor App Store publicatie (€99/jaar)

## Fase 7: Push Notificaties & Spraakherkenning Fix
- [x] Whisper vocabulary fix — 'Higgins' correct herkennen in spraak (vocabulary prompt uitgebreid)
- [x] Push notificaties — token registratie (iOS + Android)
- [x] Push notificaties — server-side Expo Push Service delivery (push-service.ts)
- [x] Push notificaties — notificatie bij nieuwe goedkeuring (sendApprovalNotification)
- [x] Push notificaties — notificatie bij Higgins chat bericht (sendChatNotification)
- [x] Push notificaties — morning brief push om 07:00 (sendMorningBriefNotification)
- [x] Push notificaties — deep link navigatie (tik → juist scherm, use-push-notifications.ts)
- [x] Push notificaties — Android notification channel instellen (higgins-default + higgins-approvals)

## Fase 8: Meertaligheid (NL / DE / EN)
- [x] i18n vertaalbestanden aanmaken (NL, DE, EN) — alle UI strings
- [x] useTranslation hook + LanguageContext implementeren
- [x] Taalinstelling opslaan in AsyncStorage
- [x] Dashboard vertalen (NL/DE/EN)
- [x] Chat scherm vertalen (NL/DE/EN)
- [x] Agents scherm vertalen (NL/DE/EN)
- [x] Settings scherm vertalen + taalwisselaar UI
- [x] Onboarding scherm vertalen (NL/DE/EN)
- [x] Higgins system prompt aanpassen op basis van gekozen taal
- [x] Push notificatie teksten vertalen — NL/DE/EN in push-service.ts

## Fase 9: i18n Verfijning
- [x] Ochtend briefing genereren in gekozen taal (NL/DE/EN) — language param in morningBrief query
- [x] Taalwisselaar op onboarding scherm (vóór naam invoer) — 🇬🇧 🇩🇪 🇬🇧 knoppen rechtsboven
- [x] Push notificaties in de juiste taal — per taalgroep, token slaat taal op

## Fase 10: Messenger Architectuur Upgrade
- [ ] Higgins system prompt corrigeren — eerlijk over capabilities, geen valse agent-delegatie
- [ ] Agent-statussen realtime meesturen in Higgins context (wie is online/offline)
- [ ] PDF generatie endpoint op server (pdfkit)
- [ ] PDF berichttype in chat UI — kaart met download knop
- [ ] Rijke berichttypen: tekst, PDF, afbeelding, bestand
- [ ] Chat berichten persistent opslaan in AsyncStorage
- [ ] Bestand uploaden knop in chat input bar (📎)

## Fase 11: Agent-Activering via Manus API (v3.1)
- [x] Manus agent service aanmaken (server/manus-agent-service.ts) — activateAgent + getTaskStatus
- [x] activateAgent tRPC endpoint — POST /api/trpc/higgins.activateAgent (Manus API task.create)
- [x] getTaskStatus tRPC endpoint — GET /api/trpc/higgins.getTaskStatus (Manus API task.listMessages)
- [x] Higgins system prompt bijgewerkt — eerlijk: KAN agents activeren via Manus API
- [x] Chat.tsx: intent detectie voor agent-activering (NL/DE/EN patronen)
- [x] Chat.tsx: activateAgent mutation geïntegreerd — echte Manus taak aanmaken
- [x] PDF font gewijzigd van Helvetica naar Nunito (Avenir-equivalent) — TTF fonts in server/fonts/
- [x] pdfkit toegevoegd aan package.json dependencies (fix deployment failure)
- [x] Metro blockList toegevoegd — voorkomt ENOENT crash bij tijdelijke pnpm mappen

## Fase 12: Luxury UI Polish + Circuit Achtergrond
- [x] Circuit/stroomschema SVG achtergrond component aangemaakt (components/circuit-background.tsx)
- [x] Circuit achtergrond op Command Center scherm
- [x] Circuit achtergrond op Chat scherm
- [x] Circuit achtergrond op Team Pulse scherm
- [x] Circuit achtergrond op Instellingen scherm
- [x] Higgins logo (avatar) in Command Center header naast titel
- [x] Taalwisselaar (NL/DE/EN) in header van Command Center
- [x] Taalwisselaar in header van Chat scherm
- [x] Taalwisselaar in header van Team Pulse scherm
- [x] iPad sidebar: taalwisselaar + i18n nav labels
- [x] Pulserende status dot animatie op dashboard

## Fase 13: Locatie, Push Notificaties & App Store
- [ ] Locatie instelling in Instellingen voor weersdata (stad + land)
- [ ] Weer endpoint bijwerken om locatie parameter te accepteren
- [ ] Push notificaties bij baanbrekend AI/blockchain nieuws
- [ ] App Store voorbereiding: metadata en build configuratie

## Fase 14: PDF Upload in Chat
- [x] uploadPdf tRPC endpoint op server — base64 ontvangen, S3 upload, publieke URL teruggeven
- [x] Paperclip-knop (📎) in chat input bar — document picker (PDF + alle bestanden)
- [x] Upload indicator in chat (Higgins typt... → "Document uploaden...")
- [x] Higgins bevestigingsbericht als PDF-kaart met "Openen" knop
- [x] PdfCard open URL fix — hardcoded sandbox URL vervangen door getApiBaseUrl()
- [x] i18n upload labels toegevoegd (NL/DE/EN)

## Fase 15: Manus-stijl PDF lay-out en verbeteringen

- [x] PDF generator herschreven naar Manus-stijl (witte pagina, grote titel, geen aparte titelpagina, bullets, tabellen, codeblokken)
- [x] PDF chat-kaart bijgewerkt naar witte documentkaart stijl (zoals Manus — blauw icoon, naam, grootte, beschrijving, teal open-knop)
- [x] Higgins analyseert automatisch geüploade PDF's (LLM samenvatting op basis van bestandsnaam + vervolgvraag)
- [x] Weerbadge in Command Center header (icoon + temperatuur + stad naast Higgins logo)
- [x] Locatie-instelling was al aanwezig in Instellingen scherm (bevestigd)

## Fase 16: Volledige PDF Intelligentie Keten

- [x] pdf-parse installeren op server voor tekst extractie
- [x] uploadPdf endpoint: volledige PDF tekst extraheren uit base64
- [x] Higgins leest de volledige inhoud en begrijpt het document
- [x] Higgins selecteert het juiste teamlid op basis van documentinhoud
- [x] Agent delegatie via Manus API met PDF-inhoud als context
- [x] Resultaat van agent-analyse terugkoppelen in chat (delegatie badge + Higgins bericht)

## Fase 17: Agent Resultaat, Batch Upload, Analyse-indicator, Document Bibliotheek

- [ ] Agent resultaat polling: check Manus taakstatus na delegatie
- [ ] "Bekijk analyse" knop in PDF-kaart die Manus taak opent
- [ ] Analyse-indicator "Higgins analyseert uw document..." tijdens verwerking
- [ ] Meerdere PDF's tegelijk uploaden (batch)
- [ ] Document bibliotheek tabblad met alle geüploade documenten en analyses

## Fase 18: Zoekbalk, Analyse-link en Weerbadge

- [x] Zoekbalk in Documenten tabblad (filter op naam en inhoud)
- [x] "Bekijk volledige analyse" knop die Manus-taakpagina opent in browser
- [x] Weerbadge in Command Center header actief via locatie-instelling (was al correct gekoppeld)

## Fase 19: Intelligente Command Router (data-entree keten)

- [x] Create shared/roster.ts as single source of truth for agent names, departments, and routing metadata
- [x] Update Higgins system prompt (server/routers.ts) to v2.0 roster (10 depts, 66 agents)
- [x] Build server-side command router with LLM-based intent classification + confidence scoring
- [x] Confidence ≥0.85: direct delegation without confirmation
- [x] Confidence <0.85: return confirmation request to app with proposed agent/dept
- [x] Slim down app-side detectAgentActivation — server does all routing now (no hardcoded names)
- [x] Add inline confirmation UX in Chat for ambiguous commands (one-tap Akkoord/Nee)
- [x] Update PDF routing prompt to use v2.0 roster from shared source
- [x] Verify full chain with tests (32 passed, 0 errors)

## Fase 20: Audit Reparaties — Communicatieketen

- [x] R1: Delegation result tracker voor ALLE delegaties (tekst + PDF) — polling + terugkoppeling in chat
- [x] D1: PDF-router vervangen door shared v2.0 roster (geen hardcoded 6-agenten lijst meer)
- [x] P2: Push token registratie fixen — absolute URL via getApiBaseUrl() op native
- [x] R3: Server-side taak-completion polling + push notificatie bij afronding
- [x] P1: Push tokens persistent opslaan in database i.p.v. in-memory Map
- [x] T2: Retry-logica in command router bij LLM-fout + duidelijke foutmelding
- [x] P3: Retry/reconcile mechanisme bij push token registratie
- [x] R2: Bij app-herstart actieve delegaties hervatten (polling resumeren)
- [x] D2: Docs-tab sync key fixen (higgins_chat_messages → higgins_chat_history_v2)
- [x] T1: Agent-context verplaatsen uit user-bericht naar apart veld
- [x] D3: Confidence-based bevestiging toevoegen aan document-routing
- [x] S3: Vergadering-samenvatting door command router sturen als user-bericht

## Fase 21: Multi-Delegatie

- [x] Command router detecteert multi_delegation intent en retourneert additionalTargets
- [x] Server chat mutation activeert alle targets parallel bij hoge confidence
- [x] Server confirmDelegation handler activeert alle targets bij bevestiging
- [x] App toont alle voorgestelde agents in de bevestigingsrij
- [x] Eén "Alle X activeren" knop bevestigt alles in één tik

## Fase 22: Roster Sync + Tower + Script Publicatie

- [x] shared/roster.ts bijgewerkt naar v2.1 (88 agenten, 11 afdelingen, correcte routing-keywords)
- [x] Higgins Tower visualisatie-scherm gebouwd (11 verdiepingen, tap-to-expand, classified indicators)
- [x] Tower tab toegevoegd aan tab bar + iPad sidebar
- [x] Installatiescript gepubliceerd als downloadbaar endpoint: GET /api/mc/install-script
- [x] Alle tests groen (34 passed), TypeScript 0 fouten

## Fase 23: Tower Refinements + doc-detail Tab Fix

- [x] doc-detail tab verborgen uit tab bar (href: null, screen-only navigeerbaar)
- [x] Tower gekoppeld aan live building API via tRPC (higgins.getBuilding query, building_floors DB tabel)
- [x] Edition-filtering in Tower: restricted basements (B1–B3) verborgen in whitelabel-modus
- [x] Source indicator in Tower header (groen = live via database, grijs = built-in lijst)
- [x] Legend past zich aan aan editie (classified-legenda alleen zichtbaar in internal mode)
- [x] Alle tests groen (34 passed), TypeScript 0 fouten

## Fase 24: Tower UX Verbeteringen

- [x] Tower i18n: verdiepingsnamen, legenda, source-indicator vertaald naar NL/DE/EN
- [x] Tower agent-status dots per verdieping (actief/idle indicator via getAgentStatus)
- [x] Tower long-press → Chat: lang indrukken op verdieping opent Chat met pre-filled Higgins-opdracht over die afdeling
- [x] Chat.tsx: useLocalSearchParams + prefill effect voor Tower-navigatie
- [x] Alle tests groen (34 passed), TypeScript 0 fouten

## Fase 25: Chat Audit + Multi-Manager Technisch Ontwerp

- [x] Chat.tsx volledig geaudit (1260 regels)
- [x] Bug fix: stale messages in confirmDelegation (closure → functional setState)
- [x] Bug fix: hardcoded foutmelding → i18n (errorGeneric key NL/DE/EN)
- [x] Bug fix: blurOnSubmit voor mobiel (toetsenbord sluit na verzenden)
- [x] Technisch ontwerp multi-manager architectuur geschreven (docs/CHAT-AUDIT-AND-MULTI-MANAGER-DESIGN.md)
- [x] TypeScript 0 fouten

## Fase 26: Siri Shortcut Integratie + App Store Publicatie Guide

- [x] Siri Shortcut config-plugin geïnstalleerd en geconfigureerd (react-native-siri-shortcut + @config-plugins)
- [x] App Intent handler: "Zeg tegen Higgins" → deep link naar Chat met pre-filled tekst
- [x] Deep link routing in app: siri-intent → Chat tab met voice/text prefill + startMeeting
- [x] Siri Shortcuts settings sectie in Instellingen ("+ Siri" knoppen)
- [x] App Store publicatie stap-voor-stap handleiding geschreven (docs/APP-STORE-PUBLICATIE-HANDLEIDING.md)
- [x] TypeScript 0 fouten

## Fase 27: Volledige App Audit + Bug Fixes

- [x] Volledige code-audit uitgevoerd (12 schermen + server)
- [x] BUG-1 FIXED: Logout-knop werkt nu (wist data + navigeert naar onboarding)
- [x] BUG-2 FIXED: doc-detail.tsx dead client-side API call verwijderd
- [x] BUG-3 FIXED: Settings toggles worden nu gepersisteerd in AsyncStorage
- [x] BUG-4 FIXED: docs.tsx gebruikt nu USER_NAME_KEY constant i.p.v. hardcoded string
- [x] MED-1 FIXED: Onboarding flash voorkomen (Stack pas renderen na check)
- [x] LOW-1 FIXED: Siri Shortcuts sectie boven logout geplaatst
- [x] LOW-3 FIXED: Ongebruikte SIDEBAR_WIDTH import verwijderd
- [x] Siri config-plugin error gefixt (broken build path gecommentarieerd)
- [x] Audit rapport geschreven (docs/AUDIT-FINDINGS.md)
- [x] 34 tests groen, TypeScript 0 fouten

## Fase 28: i18n Fixes + Offline Queue + Haptic Voice Feedback

- [x] MED-3: doc-detail.tsx hardcoded Dutch strings → i18n (NL/DE/EN)
- [x] MED-4: settings.tsx Alert messages → i18n (NL/DE/EN) — logout alerts localized
- [ ] MED-5: index.tsx weather/news inline ternaries → i18n keys (deferred)
- [x] Offline message queue: lib/offline-queue.ts + hooks/use-offline-queue.ts gebouwd
- [x] Haptic voice feedback: al aanwezig in chat.tsx (Success notification bij elk Higgins-antwoord)
- [x] Audit rapport als Engelse PDF opgeleverd (Higgins-MC-Full-Audit-Report.pdf)

## Fase 29: Offline Queue Integratie + Push Notifications + EAS Build

- [x] Offline queue geïntegreerd in chat.tsx (isOnline check, enqueue, flush-on-focus, ⏳/⚠️ indicator)
- [x] Push notifications server-side geactiveerd: sendChatNotification bij elk Higgins-antwoord, sendApprovalNotification bij pending delegatie
- [x] EAS Build configuratie compleet + stap-voor-stap handleiding (docs/EAS-BUILD-TESTFLIGHT-GUIDE.md)
- [x] TypeScript 0 fouten, 34 tests groen
