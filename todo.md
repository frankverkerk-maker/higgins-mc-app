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
- [ ] Chat scherm in luxury dark stijl
- [ ] Team Pulse scherm in luxury dark stijl
- [ ] Instellingen scherm in luxury dark stijl

## Fase 5: Uitbreidingen
- [ ] iPad layout optimalisatie (grotere schermen, split-view)
- [ ] Voice-to-Higgins microfoon knop in chat
- [ ] Naam personalisatie onboarding scherm
- [ ] Push notificaties (agent heeft bericht)
- [ ] Haptic feedback op acties

## Openstaande actiepunten (buiten app)
- [ ] Apple MDM installeren (Mosyle Business of Jamf Now aanbevolen)
- [ ] Apple Business Manager account aanmaken voor Carpe Diem
- [ ] iPad Command Bundle propositie uitwerken (MDM + app + Mission Control web)
- [ ] Adviesrapport PDF bijwerken met iPad architectuur en MDM notitie
- [ ] Teamnamen ophalen uit Higgins MC ontwikkel Sandbox (login vereist)
- [ ] Apple Developer Account aanmaken voor App Store publicatie (€99/jaar)
