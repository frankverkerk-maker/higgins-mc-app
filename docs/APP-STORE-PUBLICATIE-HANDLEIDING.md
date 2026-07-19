# Higgins MC — App Store Publicatie Handleiding

**Versie:** 1.0  
**Datum:** 11 juli 2026  
**Doel:** De Higgins MC app publiceren in de Apple App Store (iOS) en Google Play Store (Android)

---

## Vereisten Vooraf

Voordat je begint, zorg dat je het volgende hebt:

| Wat | Waar te krijgen | Kosten |
|-----|-----------------|--------|
| Apple Developer Account | [developer.apple.com](https://developer.apple.com) | €99/jaar |
| Google Play Developer Account | [play.google.com/console](https://play.google.com/console) | €25 eenmalig |
| EAS CLI geïnstalleerd | `npm install -g eas-cli` | Gratis |
| Expo account | [expo.dev](https://expo.dev) | Gratis (of betaald voor meer builds) |
| Mac met Xcode (alleen voor handmatige signing) | Apple Mac | — |

---

## Stap 1: EAS Project Aanmaken

Open een terminal op je computer (niet de sandbox) en navigeer naar de projectmap:

```bash
# 1. Installeer EAS CLI globaal
npm install -g eas-cli

# 2. Log in bij Expo
eas login

# 3. Initialiseer het EAS project (koppelt aan je Expo account)
eas init
```

Dit genereert een `projectId` die automatisch in `app.config.ts` wordt gezet via de `EXPO_PUBLIC_EAS_PROJECT_ID` env var.

---

## Stap 2: EAS Build Configuratie

Het project bevat al een `eas.json`. Controleer dat deze er zo uitziet:

```json
{
  "cli": {
    "version": ">= 15.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "JOUW_APPLE_ID@email.com",
        "ascAppId": "JOUW_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "JOUW_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json"
      }
    }
  }
}
```

> Vervang de placeholder-waarden met je eigen Apple Developer gegevens.

---

## Stap 3: Apple Certificaten & Provisioning (Automatisch)

EAS regelt dit volledig automatisch. Bij de eerste build vraagt het om je Apple Developer credentials:

```bash
# Dit doet ALLES automatisch: certificaten, provisioning profiles, signing
eas build --platform ios --profile production
```

Je hoeft **niets** handmatig in Xcode of Apple Developer Portal te doen. EAS maakt automatisch:
- Distribution Certificate
- App ID (met Siri capability)
- Provisioning Profile

---

## Stap 4: Eerste TestFlight Build (iOS)

```bash
# Bouw de iOS app voor TestFlight
eas build --platform ios --profile production
```

Dit duurt 15-30 minuten. Je krijgt een link naar de build op expo.dev.

---

## Stap 5: Upload naar TestFlight

```bash
# Submit de build naar App Store Connect (TestFlight)
eas submit --platform ios --profile production
```

Of als je de build-ID wilt specificeren:

```bash
eas submit --platform ios --latest
```

Na 5-10 minuten verschijnt de build in [App Store Connect](https://appstoreconnect.apple.com) → TestFlight.

---

## Stap 6: TestFlight Testen

1. Open **App Store Connect** → jouw app → **TestFlight**
2. Voeg jezelf toe als **Internal Tester**
3. Open de **TestFlight app** op je iPhone
4. Installeer Higgins MC
5. Test alle functies:
   - Chat met Higgins (tekst + spraak)
   - Ochtend briefing
   - Vergadering opname
   - Siri Shortcuts (ga naar Instellingen → Siri → tik op "+ Siri")
   - Push notificaties
   - PDF generatie

---

## Stap 7: App Store Metadata Invullen

In **App Store Connect** → jouw app → **App Store** tab:

| Veld | Waarde |
|------|--------|
| **App Naam** | Higgins MC |
| **Ondertitel** | AI Executive Command Center |
| **Categorie** | Productiviteit |
| **Subcategorie** | Zakelijk |
| **Beschrijving** | Higgins Mission Control is your personal AI-powered executive command center. Communicate with your AI chief of staff via text or voice. Get daily briefings, delegate tasks to specialized AI agents, record and summarize meetings, and generate professional reports — all from one elegant interface. |
| **Trefwoorden** | AI, assistant, executive, command, briefing, meeting, productivity, delegate, voice |
| **Privacy Policy URL** | https://higginsmc-fzaggof9.manus.space/privacy |
| **Support URL** | https://higginsmc-fzaggof9.manus.space/terms |

---

## Stap 8: Screenshots Maken

Apple vereist screenshots voor deze formaten:

| Apparaat | Resolutie | Aantal |
|----------|-----------|--------|
| iPhone 6.9" (15 Pro Max) | 1320 × 2868 | Minimaal 3 |
| iPhone 6.7" (14 Pro Max) | 1290 × 2796 | Minimaal 3 |
| iPad Pro 13" | 2064 × 2752 | Minimaal 3 (als je iPad ondersteunt) |

Maak screenshots van:
1. **Chat met Higgins** (het hart van de app)
2. **Command Center** (ochtend briefing)
3. **Vergadering opname** (meeting recorder in actie)

> Tip: Gebruik de iPhone Simulator in Xcode of je echte device via TestFlight.

---

## Stap 9: App Review Indienen

```bash
# Of via de CLI:
eas submit --platform ios --profile production
```

Of handmatig in App Store Connect:
1. Ga naar **App Store** tab → versie 1.0.0
2. Klik **Add for Review**
3. Beantwoord de review-vragen:
   - **Gebruikt de app encryptie?** → Nee (al geconfigureerd in app.config.ts)
   - **Bevat de app advertenties?** → Nee
   - **Is dit een kindvriendelijke app?** → Nee (17+, zakelijk gebruik)
4. Klik **Submit for Review**

Apple review duurt gemiddeld **24-48 uur**.

---

## Stap 10: Android Build & Play Store (Optioneel)

```bash
# Android production build
eas build --platform android --profile production

# Submit naar Google Play
eas submit --platform android --profile production
```

Voor Google Play heb je een **Service Account Key** nodig:
1. Ga naar [Google Cloud Console](https://console.cloud.google.com)
2. Maak een Service Account met "Service Account User" rol
3. Download de JSON key
4. Sla op als `google-service-account.json` in de projectroot
5. Koppel in Google Play Console → Setup → API access

---

## Siri Shortcuts na Installatie

Na installatie via TestFlight/App Store werken de Siri Shortcuts automatisch:

1. Open Higgins MC → **Instellingen** → scroll naar **Siri Shortcuts**
2. Tik op **"+ Siri"** naast elke shortcut
3. Spreek je gewenste activatiezin in (of gebruik de standaard)
4. Klaar — zeg nu "Hey Siri, zeg tegen Higgins" en de app opent met de chat

De drie beschikbare shortcuts:

| Shortcut | Wat het doet |
|----------|-------------|
| "Zeg tegen Higgins" | Opent de Chat — spreek je opdracht |
| "Ochtend Briefing" | Opent het Command Center met je briefing |
| "Start Vergadering" | Opent de Chat en start direct de vergadering-opname |

---

## Veelgestelde Vragen

**Hoe lang duurt de eerste build?**  
15-30 minuten voor iOS, 10-20 minuten voor Android.

**Moet ik een Mac hebben?**  
Nee. EAS Build draait in de cloud. Je hebt alleen een Mac nodig als je lokaal wilt builden.

**Wat als Apple de app afwijst?**  
Je krijgt een bericht met de reden. Meestal gaat het om screenshots, metadata, of privacy policy. Fix het en dien opnieuw in.

**Kan ik updaten zonder opnieuw in te dienen?**  
Nee, elke update moet door Apple Review. Maar na de eerste goedkeuring gaat het meestal sneller (6-24 uur).

**Hoe update ik de app na wijzigingen?**  
```bash
# Verhoog de versie in app.config.ts, dan:
eas build --platform ios --profile production
eas submit --platform ios --latest
```

---

## Samenvatting: De 5 Commando's

Na de eenmalige setup (stap 1-2) is het publicatieproces altijd dezelfde 5 commando's:

```bash
# 1. Bouw
eas build --platform ios --profile production

# 2. Submit naar TestFlight
eas submit --platform ios --latest

# 3. Test via TestFlight op je iPhone

# 4. Dien in voor review (via App Store Connect UI)

# 5. Na goedkeuring: live in de App Store
```

Dat is alles.
