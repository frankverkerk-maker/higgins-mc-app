# Chat Audit & Multi-Manager Architectuur — Technisch Ontwerp

**Versie:** 1.0  
**Datum:** 11 juli 2026  
**Project:** Higgins Mission Control — Native App  
**Auteur:** Manus AI

---

## Deel 1: Chat Audit Resultaten

### Samenvatting

De chat.tsx (1260 regels) is de kern van de app. Na volledige audit zijn **3 bugs gefixt** en **4 verbeterpunten** geïdentificeerd. De chat is functioneel solide — alle flows (tekst, spraak, PDF upload, vergadering opname, delegatie) werken end-to-end.

### Gevonden en Gefixte Bugs

| # | Bug | Ernst | Fix |
|---|-----|-------|-----|
| 1 | **Stale messages in confirmDelegation** — `saveMessages([...messages, assistantMsg])` gebruikte de closure-waarde van `messages` in plaats van de actuele state | Medium | Vervangen door `setMessages(prev => ...)` met inline save |
| 2 | **Hardcoded foutmelding** — Bij netwerk-/serverfout kreeg de gebruiker altijd Nederlands, ongeacht taalinstelling | Low | Vervangen door `t.chat.errorGeneric` met fallback |
| 3 | **blurOnSubmit={false}** — Op mobiel sloot het toetsenbord niet na verzenden, wat onnatuurlijk aanvoelt voor een chat-app | Low | Gewijzigd naar `Platform.OS !== "web"` zodat mobiel wél blur doet |

### Verbeterpunten (niet-blokkerend)

| # | Punt | Prioriteit | Toelichting |
|---|------|-----------|-------------|
| 1 | **DelegationTracker gebruikt raw fetch** in plaats van de gedeelde tRPC client met retry-logica | Low | Werkt, maar mist de automatische retry bij 502/503/504 die `lib/trpc.ts` biedt |
| 2 | **Chat is publicProcedure** — geen authenticatie op de backend | Medium | Acceptabel voor single-user (CEO-only), maar moet opgelost worden vóór multi-manager |
| 3 | **Message ID's op basis van Date.now()** — bij snelle opeenvolging kunnen ID's botsen | Low | Overweeg `crypto.randomUUID()` of een counter |
| 4 | **Geen offline queue** — als het netwerk wegvalt, verdwijnt het bericht zonder retry | Low | Voor een communicatie-app is een offline-queue wenselijk (AsyncStorage buffer → retry bij reconnect) |

### Conclusie Audit

De chat is **productie-waardig voor single-user gebruik**. Er zijn geen dead ends, alle knoppen werken, en de UX-flow is compleet. De drie gefixte bugs waren edge-cases die geen crash veroorzaakten maar wel ongewenst gedrag.

---

## Deel 2: Multi-Manager Architectuur — Technisch Ontwerp

### Visie

De Higgins MC app evolueert van een **single-user command interface** (CEO → Higgins) naar een **hiërarchisch communicatieplatform** waar meerdere managers binnen hetzelfde bedrijf kunnen communiceren met het AI-team, maar altijd via de juiste hiërarchische ingang.

### Kernprincipe: Hiërarchische Routing

```
┌─────────────────────────────────────────────────────┐
│                    HIGGINS                            │
│            (Chief Orchestrator)                       │
│         Ziet alles · Keurt alles goed                │
│         Onthoudt alles · Vindt verbanden             │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
    ┌──────────▼──────────┐  ┌───────▼────────────┐
    │   DIRECTE LIJN      │  │   VIA ELENA        │
    │   (CEO / Eigenaar)  │  │   (Office Manager) │
    │                     │  │                     │
    │   Frank → Higgins   │  │  Manager → Elena   │
    │   Volledige toegang │  │  → Higgins keurt   │
    │   Alle afdelingen   │  │    goed/onthoudt   │
    └─────────────────────┘  └─────────────────────┘
```

### Rollen en Rechten

| Rol | Ingang | Zichtbaarheid | Delegatie-rechten |
|-----|--------|---------------|-------------------|
| **owner** (CEO) | Higgins direct | Alles: alle gesprekken, alle delegaties, alle afdelingen | Onbeperkt — kan elke agent activeren |
| **manager** | Elena (Office Manager) | Eigen gesprekken + door Elena gedeelde updates | Beperkt — Elena filtert en Higgins keurt goed |
| **viewer** (toekomstig) | Alleen lezen | Dashboard/Tower read-only | Geen |

### Hoe Elena Functioneert

Elena is geen "chatbot" maar een **intelligent gateway**:

1. **Ontvangt** de opdracht van een manager
2. **Classificeert** de urgentie en het type (vraag, taak, escalatie)
3. **Deelt** de opdracht met Higgins (altijd, zonder uitzondering)
4. **Higgins keurt goed** — automatisch bij low-risk, handmatig bij high-risk
5. **Elena voert uit** of delegeert naar de juiste agent
6. **Rapporteert** terug aan de manager

> Het verschil met de CEO-flow: de CEO spreekt Higgins direct aan en kan agents direct activeren. Managers gaan via Elena, die als filter en organisator fungeert. Higgins ziet en onthoudt alles van beide kanalen.

### Goedkeuringsmodel

| Scenario | Goedkeuring | Voorbeeld |
|----------|-------------|-----------|
| **Informatie-vraag** | Automatisch (Elena beantwoordt zelf) | "Wanneer is de volgende boardmeeting?" |
| **Low-risk taak** | Trust-but-verify (Elena voert uit, Higgins krijgt log) | "Stuur het Q3-rapport naar het team" |
| **High-risk taak** | Expliciete goedkeuring door Higgins/CEO | "Maak €50.000 over naar leverancier X" |
| **Cross-department** | Altijd via Higgins | "Coördineer marketing + finance voor de lancering" |

### Database Uitbreiding (Nieuw Schema)

```sql
-- Organisatie en gebruikersrollen
CREATE TABLE org_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  role ENUM('owner', 'manager', 'viewer') NOT NULL DEFAULT 'manager',
  display_name VARCHAR(100) NOT NULL,
  department VARCHAR(50),           -- optioneel: beperkt zichtbaarheid
  gateway_agent VARCHAR(50) DEFAULT 'Elena',  -- wie is hun ingang
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- Gesprekken (channels)
CREATE TABLE conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL REFERENCES org_members(id),
  gateway_agent VARCHAR(50) NOT NULL,  -- 'Higgins' voor owner, 'Elena' voor managers
  title VARCHAR(200),
  status ENUM('active', 'archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- Berichten (server-side persistentie)
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES conversations(id),
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  message_type ENUM('text', 'pdf', 'voice', 'delegation') DEFAULT 'text',
  metadata JSON,  -- delegatie-info, PDF-url, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Goedkeuringslog (Higgins ziet alles)
CREATE TABLE approval_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES conversations(id),
  requested_by INT NOT NULL REFERENCES org_members(id),
  task_description TEXT NOT NULL,
  target_agent VARCHAR(50),
  risk_level ENUM('low', 'medium', 'high') NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'auto_approved') DEFAULT 'pending',
  approved_by VARCHAR(50),  -- 'Higgins' of 'Frank' (CEO)
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### Routing Architectuur (Server-side)

```
┌─────────────────────────────────────────────────────────┐
│                    Chat Mutation                          │
│                                                          │
│  1. Identificeer gebruiker (auth token → org_members)    │
│  2. Bepaal gateway_agent op basis van rol                │
│     - owner → routeCommand() (bestaande flow, Higgins)  │
│     - manager → routeViaElena() (nieuwe flow)           │
│  3. Sla bericht op in messages tabel                     │
│  4. Return reply + eventuele delegatie-status            │
└─────────────────────────────────────────────────────────┘
```

De **routeViaElena()** functie:

1. Bouwt een Elena-specifiek system prompt (professioneel, behulpzaam, maar altijd rapporterend aan Higgins)
2. Classificeert het risico-niveau van de opdracht
3. Bij low-risk: voert direct uit en logt naar `approval_log` met status `auto_approved`
4. Bij high-risk: stuurt een push-notificatie naar de CEO ("Elena vraagt goedkeuring voor: ...")
5. Higgins onthoudt alles via de `approval_log` — hij kan altijd terugvinden wie wat heeft gevraagd

### App-side Wijzigingen

De app zelf verandert **minimaal** voor managers:

- Zelfde chat-interface (het is immers een communicatie-app)
- Header toont "Elena — Office Manager" in plaats van "Higgins — Chief of Staff"
- Geen Tower-toegang (of read-only, afhankelijk van rol)
- Geen directe agent-activering (dat doet Elena/Higgins op de achtergrond)
- Push-notificaties wanneer Elena terugrapporteert

Voor de CEO verandert er **niets** — dezelfde directe lijn naar Higgins.

### Fasering

| Fase | Wat | Wanneer |
|------|-----|---------|
| **Fase 1** (nu) | Single-user CEO-app zoals nu. Audit-fixes doorgevoerd. | Gereed |
| **Fase 2** | Auth + org_members tabel + rol-detectie. Chat backend switcht gateway op basis van rol. Elena system prompt. | Wanneer eerste manager wordt toegevoegd |
| **Fase 3** | Server-side message persistence (conversations + messages tabellen). CEO kan alle gesprekken inzien. | Direct na Fase 2 |
| **Fase 4** | Goedkeuringsflow: high-risk taken vereisen CEO/Higgins approval via push. | Na Fase 3 |
| **Fase 5** (optioneel) | Manager-onderling berichten via Elena als tussenpersoon. Alleen als er een concrete use-case is. | Op verzoek |

### Siri / Voice Integratie

De architectuur is **Siri-ready**:

- Siri Shortcut: "Hey Siri, zeg tegen Higgins [opdracht]" → opent de app met pre-filled tekst (zoals Tower long-press nu al werkt)
- Voor managers: "Hey Siri, zeg tegen Elena [opdracht]" → zelfde flow maar via Elena-gateway
- Geen extra backend-wijzigingen nodig — de voice-to-text pipeline bestaat al

### Risico-mitigatie

| Risico | Mitigatie |
|--------|-----------|
| Elena als bottleneck | Async model: Elena voert direct uit bij low-risk, logt alles. Higgins reviewt achteraf. |
| Privacy tussen managers | Strikte channel-isolatie in DB. Geen shared conversations. CEO ziet alles, managers alleen eigen kanaal. |
| Higgins mist context | Alle messages worden server-side opgeslagen. Higgins heeft via approval_log + messages altijd het volledige beeld. |
| Complexiteit voor managers | De UX is identiek aan WhatsApp: open app → typ/spreek → krijg antwoord. Geen extra stappen. |
| Schaalbaarheid | Elena is een LLM-persona, geen bottleneck. Meerdere managers kunnen tegelijk communiceren. |

---

## Conclusie

De chat is na audit solide en productie-klaar voor single-user. Het multi-manager ontwerp respecteert het kernprincipe: **Higgins is de enige orchestrator, hij ziet en onthoudt alles**. Managers communiceren via Elena als professionele gateway, de CEO behoudt zijn directe lijn. De app blijft een simpele communicatie-interface — geen dashboard, geen complexiteit.
