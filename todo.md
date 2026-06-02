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
