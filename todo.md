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
