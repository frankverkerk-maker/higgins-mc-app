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
- [ ] iPad layout optimalisatie (grotere schermen, split-view)
- [ ] Voice-to-Higgins microfoon knop in chat
- [x] Naam personalisatie onboarding scherm (welkomst animatie + persoonlijke begroeting)
- [x] Naam integratie in Dashboard en Chat (Higgins spreekt gebruiker persoonlijk aan)
- [x] Volledig team overzicht verwerkt (36 agents, 7 departementen, officiële namen en rollen)
- [ ] Push notificaties (agent heeft bericht)
- [x] Haptic feedback op acties (goedkeuringen, navigatie, berichten)
- [x] Voice-to-Higgins microfoon knop in chat

## Fase 6: Live Backend Integratie
- [x] Server-side Higgins chat endpoint (ingebouwde LLM, geen externe API key nodig)
- [x] Whisper spraak transcriptie endpoint op server
- [x] Goedkeuringen verwerken via server (approve/reject met Higgins bevestiging)
- [x] Morning Briefing genereren via server LLM
- [ ] Chat scherm koppelen aan live server backend
- [ ] Goedkeuringen koppelen aan live server backend
- [ ] Morning Briefing koppelen aan live server backend
- [ ] Vergadering opname knop (Whisper transcriptie + Higgins samenvatting)
- [ ] Adviesrapport PDF bijwerken met kostenstructuur en architectuur

## Openstaande actiepunten (buiten app)
- [ ] Apple MDM installeren (Mosyle Business of Jamf Now aanbevolen)
- [ ] Apple Business Manager account aanmaken voor Carpe Diem
- [ ] iPad Command Bundle propositie uitwerken (MDM + app + Mission Control web)
- [ ] Adviesrapport PDF bijwerken met iPad architectuur en MDM notitie
- [x] Teamnamen verwerkt via aangeleverd team overzicht (36 agents, 7 departementen)
- [ ] Apple Developer Account aanmaken voor App Store publicatie (€99/jaar)
