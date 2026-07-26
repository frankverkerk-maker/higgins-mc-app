# Higgins MC — Mobile App Design

## Brand Identity

**Primaire kleur:** Teal/Cyan `#0D9488` (donker) / `#14B8A6` (accent)  
**Achtergrond (dark):** Deep slate `#0F1117`  
**Surface (dark):** `#1A1D27`  
**Tekst:** `#E2E8F0` (primair) / `#94A3B8` (muted)  
**Accent glow:** `rgba(20, 184, 166, 0.15)`  
**Font:** System font (SF Pro op iOS) — strak, professioneel, zakelijk  

Het visuele karakter is donker, minimalistisch en professioneel — vergelijkbaar met een premium enterprise dashboard. Denk aan Bloomberg Terminal meets Apple Design.

---

## Screen List

| # | Scherm | Doel |
|---|--------|------|
| 1 | **Splash / Onboarding** | Logo animatie, korte introductie |
| 2 | **Login** | Gebruiker logt in met e-mail + wachtwoord |
| 3 | **Dashboard (Home)** | Overzicht: agent status, recente activiteit, snelkoppelingen |
| 4 | **Chat (Higgins)** | Directe chat met Higgins (Manus API) |
| 5 | **Agents** | Overzicht van alle actieve agenten (Higgins, Nathalie, etc.) |
| 6 | **Agent Detail** | Status, rol, recente acties van één agent |
| 7 | **Taken** | Lijst van lopende en voltooide taken |
| 8 | **Instellingen** | Profiel, notificaties, verbindingsstatus |

---

## Key User Flows

**Flow 1 — Chat met Higgins:**  
Tab bar → Chat → Typ bericht → Verzend → Higgins antwoordt via Manus API → Bericht verschijnt in thread

**Flow 2 — Agent raadplegen:**  
Tab bar → Agents → Tik op agent → Detail scherm → Zie status + recente acties → Start chat

**Flow 3 — Taak opvolgen:**  
Dashboard → Recente activiteit kaart → Tik → Taken scherm → Filter op status

---

## Navigatiestructuur

**Tab Bar (4 tabs):**
- `house.fill` → Dashboard
- `bubble.left.fill` → Chat (Higgins)
- `person.2.fill` → Agents
- `gearshape.fill` → Instellingen

---

## Color Tokens (theme.config.js)

```
primary:    { light: '#0D9488', dark: '#14B8A6' }
background: { light: '#F8FAFC', dark: '#0F1117' }
surface:    { light: '#FFFFFF', dark: '#1A1D27' }
foreground: { light: '#0F172A', dark: '#E2E8F0' }
muted:      { light: '#64748B', dark: '#94A3B8' }
border:     { light: '#E2E8F0', dark: '#1E293B' }
success:    { light: '#10B981', dark: '#34D399' }
warning:    { light: '#F59E0B', dark: '#FBBF24' }
error:      { light: '#EF4444', dark: '#F87171' }
```
