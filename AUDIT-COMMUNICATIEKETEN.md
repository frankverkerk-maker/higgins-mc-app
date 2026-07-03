# Higgins MC Native App — Diepgaande Audit Communicatieketen

**Datum:** 3 juli 2026  
**Scope:** Alle communicatielijnen, transferpaden en transformatieprocessen van de native app als command center naar Higgins Mission Control.

---

## Samenvatting

De app fungeert als het primaire communicatieplatform waarmee de directeur via Higgins (Chief of Staff) het volledige managementteam aanstuurt. Elke zwakke schakel in deze keten betekent dat opdrachten niet aankomen, verkeerd worden vertaald, of dat resultaten in een zwart gat verdwijnen.

Na systematische doorlichting van alle bronbestanden zijn **12 zwakke schakels** geïdentificeerd, verdeeld over 5 communicatielijnen. Hieronder de volledige analyse per lijn, gevolgd door een geprioriteerd reparatieplan.

---

## De 5 Communicatielijnen

| # | Lijn | Richting | Functie |
|---|------|----------|---------|
| 1 | **Tekst-naar-Agent** | Jij → Higgins → Agent | Getypte opdracht wordt gerouteerd en gedelegeerd |
| 2 | **Spraak-naar-Agent** | Jij → Whisper → Higgins → Agent | Ingesproken opdracht wordt getranscribeerd, gerouteerd en gedelegeerd |
| 3 | **Document-naar-Agent** | Jij → PDF upload → Higgins → Agent | Document wordt geanalyseerd, gerouteerd en gedelegeerd |
| 4 | **Resultaat-terugkoppeling** | Agent → Manus API → App | Agent voltooit taak, resultaat komt terug in de chat |
| 5 | **Push-notificatie** | Server → Expo Push → Apparaat | Proactieve melding dat er actie nodig is of resultaat klaar is |

---

## Bevindingen per Communicatielijn

### Lijn 1: Tekst-naar-Agent (GEREPAREERD — nu solide)

De nieuwe command router (`server/command-router.ts`) werkt correct. De keten is: app stuurt tekst → server classificeert intent via LLM → bij hoge zekerheid directe delegatie, bij twijfel bevestigingsvoorstel → Manus API `task.create`.

**Resterende zwakke schakel:**

| ID | Zwakte | Ernst | Impact |
|----|--------|-------|--------|
| T1 | **Agent-context wordt aan het bericht geplakt** (regel 459 chat.tsx). De `buildAgentContext()` voegt een blok "GEACTIVEERDE AGENTS" toe aan de gebruikerstekst. De command router ontvangt dit als onderdeel van het "user command" en kan het verwarren met de opdracht zelf. | Gemiddeld | Router kan een statusupdate interpreteren als een delegatieopdracht, of de confidence verlagen door ruis. |
| T2 | **Geen retry bij LLM-fout in de router.** Als de LLM-aanroep in `routeCommand()` faalt (timeout, rate limit), valt het systeem terug op `intent: "question"` — de opdracht wordt dan beantwoord als vraag in plaats van gedelegeerd. De gebruiker krijgt een antwoord maar de taak wordt niet uitgevoerd. Er is geen indicatie dat de delegatie is mislukt. | Hoog | Stille mislukking — jij denkt dat het is gedelegeerd, maar het is alleen beantwoord. |

---

### Lijn 2: Spraak-naar-Agent

De keten is: microfoon → audio opname → base64 → server Whisper transcriptie → tekst in inputveld → gebruiker drukt op verzenden → Lijn 1.

**Zwakke schakels:**

| ID | Zwakte | Ernst | Impact |
|----|--------|-------|--------|
| S1 | **Transcriptie vult alleen het inputveld, verzendt niet automatisch.** Na spraakherkenning moet je nog handmatig op "verzenden" drukken. Bij een command center verwacht je: inspreken → klaar. | Laag | Extra handeling, geen dataverlies. |
| S2 | **Geen foutherkenning bij slechte transcriptie.** Als Whisper de opdracht verkeerd transcribeert (bijv. "activeer Justitia" wordt "activeer Justina"), gaat de verkeerde tekst naar de router. Er is geen bevestigingsstap tussen transcriptie en verzending. | Gemiddeld | Verkeerde agent kan worden geactiveerd bij hoge confidence op een fout-getranscribeerde naam. |
| S3 | **Vergadering-samenvatting wordt niet door de command router gestuurd.** De "Stuur naar chat" knop na een vergaderopname plaatst de samenvatting als een assistant-bericht, niet als een user-bericht. Het passeert dus nooit de router en kan geen delegatie triggeren. | Gemiddeld | Vergaderresultaten worden niet automatisch doorgestuurd naar de juiste afdeling. |

---

### Lijn 3: Document-naar-Agent (KRITIEK)

De keten is: paperclip-knop → document picker → base64 → server `uploadPdf` → LLM routing → `activateAgent`.

**Zwakke schakels:**

| ID | Zwakte | Ernst | Impact |
|----|--------|-------|--------|
| D1 | **De PDF-router gebruikt een VEROUDERDE, HARDCODED agentlijst van 6 namen** (Warren, Elena, Dr. David Sinclair, Justitia, Marcus, Sophia). Dit is de oude v1-lijst. De v2.0-roster (66 agenten, 10 afdelingen) wordt NIET gebruikt. De `shared/roster.ts` die we net hebben gebouwd wordt hier compleet genegeerd. | **Kritiek** | Documenten die thuishoren bij de 60 andere agenten (bijv. Ultra Trust Agency, Sales, Enterprise Operations) worden altijd naar één van de 6 oude agenten gestuurd. Een estate-planning document gaat naar "Warren" in plaats van naar de juiste UTA-specialist. |
| D2 | **Dubbele upload-pipeline.** De Documenten-tab (`docs.tsx`) heeft een eigen upload-flow die dezelfde `uploadPdf` mutation aanroept, maar de resultaten opslaat in een apart AsyncStorage-key (`higgins_docs_library`) dat niet synchroniseert met de chat. | Gemiddeld | Documenten geüpload via de Docs-tab verschijnen niet in de chat-historie, en vice versa (de sync leest `higgins_chat_messages` maar chat slaat op als `higgins_chat_history_v2`). |
| D3 | **Geen bevestigingsstap bij document-delegatie.** In tegenstelling tot Lijn 1 (waar de command router bij twijfel bevestiging vraagt), delegeert de PDF-router ALTIJD direct — ongeacht confidence. Er is geen "Akkoord/Nee" mechanisme. | Gemiddeld | Een verkeerd gerouteerd document wordt direct naar de verkeerde agent gestuurd zonder dat jij het kunt corrigeren. |

---

### Lijn 4: Resultaat-terugkoppeling (KRITIEK)

De keten is: Manus API taak voltooid → app pollt `getTaskStatus` → toont resultaat in chat.

**Zwakke schakels:**

| ID | Zwakte | Ernst | Impact |
|----|--------|-------|--------|
| R1 | **Polling bestaat ALLEEN voor PDF-delegaties, NIET voor tekst-delegaties.** De `PdfCard` component pollt elke 5 seconden de taakstatus. Maar wanneer een agent wordt geactiveerd via de tekst-command-router (Lijn 1), is er GEEN polling. De chat toont "Agent geactiveerd" en daarna niets meer. Het resultaat komt nooit terug. | **Kritiek** | De belangrijkste communicatielijn (tekst-opdrachten) heeft geen terugkoppeling. Je geeft een opdracht, de agent werkt, maar het resultaat verdwijnt in een zwart gat. |
| R2 | **Polling stopt bij app-sluiting.** Als je de app sluit terwijl een agent bezig is, stopt de polling. Bij heropenen wordt deze niet hervat (de PdfCard mount opnieuw, maar tekst-delegaties hebben geen polling-component). | Hoog | Resultaten van langlopende taken (>5 min) worden gemist als de app tussentijds is gesloten. |
| R3 | **Geen push-notificatie bij taakafronding.** De server stuurt geen push-melding wanneer een Manus-taak de status "stopped" bereikt. De enige manier om het resultaat te zien is actief de app open hebben met polling actief. | Hoog | Je mist resultaten tenzij je toevallig de app open hebt op het juiste moment. |

---

### Lijn 5: Push-notificatie (FRAGIEL)

De keten is: server wil notificatie sturen → leest push-token uit geheugen → stuurt via Expo Push Service → apparaat ontvangt.

**Zwakke schakels:**

| ID | Zwakte | Ernst | Impact |
|----|--------|-------|--------|
| P1 | **Push-tokens worden ALLEEN in geheugen opgeslagen** (`pushTokenStore = new Map()`). Bij elke server-herstart (deploy, crash, cold start) zijn alle tokens weg. De app registreert het token opnieuw bij volgende start, maar tot die tijd is de push-lijn dood. | Hoog | Na elke deployment ontvang je geen notificaties totdat je de app opnieuw opent. |
| P2 | **Token-registratie op native gebruikt een RELATIEVE fetch** (`fetch("/api/trpc/...")`). Dit werkt alleen op web (waar de browser de base-URL aanvult). Op iOS/Android is er geen base-URL — de fetch gaat naar `localhost` of faalt stil. | **Kritiek** | Push-notificaties werken waarschijnlijk NIET op het fysieke apparaat. De registratie faalt stil (catch-blok slikt de fout). |
| P3 | **Geen retry/reconcile bij mislukte registratie.** Als de eerste registratie faalt (P2), wordt er nooit opnieuw geprobeerd. De app slaat het token lokaal op maar de server weet er niets van. | Hoog | Eenmalige fout = permanent geen push tot app-herinstallatie. |

---

## Prioritering en Reparatieplan

De zwakke schakels zijn gerangschikt op impact (hoe erg het de communicatie breekt) en frequentie (hoe vaak het voorkomt):

| Prioriteit | ID | Fix | Complexiteit |
|------------|-----|-----|-------------|
| **1 (KRITIEK)** | R1 | Polling/terugkoppeling toevoegen voor ALLE delegaties (niet alleen PDF) — een `DelegationTracker` component die actieve taken bijhoudt en resultaten terugkoppelt in de chat | Gemiddeld |
| **2 (KRITIEK)** | D1 | PDF-router in `uploadPdf` vervangen door de shared roster (dezelfde `buildRoutingTable()` als de command router) | Laag |
| **3 (KRITIEK)** | P2 | Relatieve fetch in `use-push-notifications.ts` vervangen door `getApiBaseUrl()` | Laag |
| **4 (HOOG)** | R3 | Server-side taak-completion webhook/polling die push-notificatie stuurt bij status "stopped" | Gemiddeld |
| **5 (HOOG)** | P1 | Push-tokens opslaan in de database (drizzle schema uitbreiden) i.p.v. in-memory Map | Laag |
| **6 (HOOG)** | T2 | Retry-logica in command router (max 2 pogingen bij LLM-fout) + duidelijke foutmelding aan gebruiker als routing mislukt | Laag |
| **7 (HOOG)** | P3 | Retry-mechanisme bij token-registratie (exponential backoff, max 3 pogingen) | Laag |
| **8 (HOOG)** | R2 | Bij app-herstart: check AsyncStorage voor actieve delegaties en hervat polling | Laag |
| **9 (GEMIDDELD)** | D2 | Docs-tab synchronisatie fixen: lees uit `higgins_chat_history_v2` (de correcte key) | Laag |
| **10 (GEMIDDELD)** | T1 | Agent-context verplaatsen van het user-bericht naar een apart `context`-veld in de mutation input | Laag |
| **11 (GEMIDDELD)** | D3 | Bevestigingsstap toevoegen aan document-routing (dezelfde confidence-logica als tekst) | Gemiddeld |
| **12 (GEMIDDELD)** | S3 | Vergadering-samenvatting als user-bericht door de router sturen (optioneel: "Wilt u dit delegeren?") | Laag |
| **13 (LAAG)** | S1 | Optie: auto-verzenden na transcriptie (instelbaar in Settings) | Laag |
| **14 (LAAG)** | S2 | Transcriptie-bevestigingsscherm vóór verzending bij spraak-naar-agent | Gemiddeld |

---

## Visueel: De Communicatieketen met Zwakke Schakels

```
┌─────────────────────────────────────────────────────────────────────┐
│                        JIJ (Directeur)                               │
│   Tekst │ Spraak │ Document                                         │
└────┬────┴────┬───┴────┬─────────────────────────────────────────────┘
     │         │        │
     ▼         ▼        ▼
┌─────────┐ ┌──────┐ ┌──────────┐
│ Inputveld│ │Whisper│ │Doc Picker│
│         │ │ [S2] │ │          │
└────┬────┘ └──┬───┘ └────┬─────┘
     │    [S1]  │          │
     ▼         ▼          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    SERVER: Command Router                             │
│   ┌─────────────────┐    ┌──────────────────────────────────┐       │
│   │ routeCommand()  │    │ uploadPdf() ← VEROUDERD [D1]     │       │
│   │ [T1] [T2]       │    │ [D3] geen bevestiging            │       │
│   └────────┬────────┘    └──────────────┬───────────────────┘       │
│            │                            │                            │
│            ▼                            ▼                            │
│   ┌─────────────────────────────────────────────────┐               │
│   │         activateAgent() → Manus API             │               │
│   │         task.create                             │               │
│   └────────────────────────┬────────────────────────┘               │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    MANUS API (extern)                                 │
│   Agent werkt... → status: "stopped" → resultaat klaar               │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                    ─────────┼─────────
                   │ ZWART GAT [R1]    │  ← Tekst-delegaties: GEEN polling
                   │ [R2] App dicht    │  ← Polling stopt
                   │ [R3] Geen push    │  ← Geen notificatie bij afronding
                    ─────────┼─────────
                             │
                             ▼ (alleen PDF-delegaties)
┌──────────────────────────────────────────────────────────────────────┐
│                    APP: PdfCard polling (5s)                          │
│   Toont resultaat in chat                                            │
└──────────────────────────────────────────────────────────────────────┘

PUSH-LIJN (parallel):
┌──────────────────────────────────────────────────────────────────────┐
│   Server wil notificatie sturen                                      │
│   → pushTokenStore (in-memory) [P1]                                  │
│   → token geregistreerd via relatieve fetch [P2] [P3]                │
│   → Expo Push Service → apparaat                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Conclusie

De drie **kritieke** zwakke schakels (R1, D1, P2) vormen samen het kernprobleem: de app kan opdrachten goed **versturen** (Lijn 1 werkt nu), maar de **terugkoppeling** (Lijn 4) en de **document-routing** (Lijn 3) zijn gebroken. Het communicatieplatform is daarmee een "éénrichtingsstraat" — opdrachten gaan de deur uit, maar resultaten komen niet betrouwbaar terug.

De reparatie van de top-8 items (prioriteit 1–8) maakt de keten volledig bidirectioneel en betrouwbaar. De complexiteit is overwegend laag — het gaat niet om nieuwe features bouwen, maar om bestaande logica correct aansluiten op de juiste bronnen en paden.

---

*Audit uitgevoerd door Manus AI — 3 juli 2026*
