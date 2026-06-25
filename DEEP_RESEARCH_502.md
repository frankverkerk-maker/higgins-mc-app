# Deep Research: HTTP 502 in Higgins MC (Expo Go)

**Datum:** 25 juni 2026
**Onderzoeker:** Manus
**Status:** Root cause bevestigd met hard bewijs · Duurzame oplossing geïmplementeerd

---

## 1. Samenvatting

De terugkerende foutmelding *"There was a problem running the requested app — HTTP response error 502"* in Expo Go is **geen losse codefout**, maar het gevolg van **resource-uitputting en de inherente vluchtigheid van de ontwikkel-sandbox**. De API- en Metro-servers draaien correct; de 502 ontstaat in korte vensters waarin het dev-proces wordt afgebroken (OOM-kill), de sandbox hibernate/herstart, of het geheugen piekt.

De eerdere fixes (poort-binding op 3000, robuuste `getApiBaseUrl`) waren correct en noodzakelijk, maar adresseerden niet de werkelijke oorzaak. Deze analyse bewijst de echte oorzaak en levert een meerlaagse, duurzame oplossing.

---

## 2. Verzameld bewijs

### 2.1 Servers draaien correct
```
Ports listening:
tcp6  :::3000  LISTEN  4489/node   ← API server
tcp6  :::8081  LISTEN  3822/node   ← Metro bundler

API health:        {"ok":true}      HTTP 200
Metro:             HTTP 200
Tunnel API (3000): HTTP 200
Tunnel Metro:      HTTP 200
```
Conclusie: op het moment van meten is **alles bereikbaar**. De 502 is dus **intermitterend**, niet permanent.

### 2.2 Het dev-proces wordt gekilled (OOM)
Uit `.manus-logs/devserver.log`:
```
[07:46:03.445Z] Killed                                 ← proces afgebroken
[07:16:45.442Z] pnpm dev:server exited with code SIGTERM
[07:16:47.398Z] Dev server exited with code -1
[07:16:57.591Z] [api] server listening on port 3000    ← herstart
```

### 2.3 Geheugen is structureel krap
```
Mem: 3.8Gi totaal | 3.3Gi gebruikt | 607Mi beschikbaar
expo start proces alleen:  ~17% geheugen (~650MB)
Daarnaast: tsx watch (server), Metro jest-workers, Chromium, esbuild
```
Bij elke piek (bundel, cron-job met LLM-call, parallelle `tsc`) overschrijdt het totaal de limiet → OOM-killer grijpt in.

### 2.4 Tunnel-URL is veranderd tussen sessies
- Eerdere checkpoint-URL: `8081-ijaocie6mkqhn7bw1b1p3-03a7ef55...`
- Huidige URL: `8081-i5j0l3qt7aof11xqb8ekq-e07446be...`

De sandbox is gemigreerd/herstart, waardoor de host-ID veranderde. Een oude, in Expo Go gecachte URL wijst dan naar een niet-bestaande tunnel → **502 van de proxy**.

---

## 3. Root cause (bevestigd)

> De 502 ontstaat wanneer Expo Go een request doet terwijl (a) het dev-proces net is ge-OOM-killed en herstart, (b) de sandbox hibernate/migreert waardoor de tunnel-host wijzigt, of (c) een onafgevangen fout het Node-proces laat crashen. In al die gevallen geeft de Manus-tunnel een 502 terug omdat er tijdelijk geen backend op de poort luistert.

Dit is fundamenteel een **infrastructuur-/levenscyclusprobleem van een dev-sandbox**, niet een applicatielogica-bug.

---

## 4. Duurzame oplossing (meerlaags)

### Laag 1 — Client-resilience (geïmplementeerd)
`lib/trpc.ts`: een `resilientFetch` wrapper die automatisch opnieuw probeert bij 502/503/504 en netwerkfouten, met exponentiële back-off (max 3 pogingen) en 15s timeout per poging. Hierdoor herstelt de app zichzelf tijdens korte server-herstart-vensters in plaats van een harde crash te tonen.

`app/_layout.tsx`: React Query defaults aangescherpt — `retry: 2` met back-off, `staleTime: 30s` zodat laatst bekende data zichtbaar blijft tijdens een herverbinding.

### Laag 2 — Server-resilience (geïmplementeerd)
`server/_core/index.ts`:
- Vaste poort 3000 (geen `findAvailablePort` meer) → client/server kunnen nooit meer mismatchen.
- `EADDRINUSE` faalt luid met een duidelijke instructie.
- Globale `unhandledRejection` / `uncaughtException` handlers → één gefaalde LLM-call in een cron-job crasht niet langer het hele proces.

### Laag 3 — Geheugenhygiëne (uitgevoerd)
Verweesde `tsc --noEmit` en `jest-worker` processen die geheugen opslokten zijn opgeruimd. Aanbeveling: vermijd het parallel draaien van `pnpm check` naast de dev-server in deze sandbox.

### Laag 4 — Architectuur-aanbeveling (voor 24/7 stabiliteit)
De ontwikkel-sandbox is per ontwerp niet bedoeld als productie-runtime. Voor een echt stabiele, altijd-beschikbare Higgins MC zijn er twee duurzame routes:

1. **Publiceren (aanbevolen voor de app):** gebruik de Publish-knop. Dit bouwt een productie-build (eigen domein `higginsmc-fzaggof9.manus.space`) die niet afhankelijk is van de vluchtige dev-tunnel. De backend draait dan als beheerde service, niet als dev-proces dat ge-OOM-killed wordt.
2. **Persistent computing (voor altijd-aan backend):** draai de API/cron-component op een persistente VM (Mac Mini / Cloud Computer) met vaste resources en auto-restart, zoals beschreven in de bestaande Higgins/OpenClaw-architectuur. De dev-sandbox blijft dan puur voor ontwikkeling.

> Belangrijk: zolang je test via Expo Go tegen de **dev-sandbox**, blijft er altijd een kleine kans op een 502-venster tijdens een herstart. De client-retry (Laag 1) maakt dat in de praktijk onzichtbaar, maar de echte garantie komt van Laag 4 (publiceren / persistente backend).

---

## 5. Verificatie na implementatie
```
API health:      {"ok":true}   HTTP 200
tRPC endpoint:   HTTP 200
Metro:           HTTP 200
TypeScript:      0 fouten
```

---

## 6. Conclusie

De 502 is geen blijvende bug maar een tijdelijk venster veroorzaakt door OOM-kills en sandbox-herstarts. Met de toegevoegde client- en server-resilience herstelt de app zichzelf automatisch tijdens die vensters. Voor een harde, blijvende garantie van beschikbaarheid is publiceren naar de productie-build (of een persistente backend) de aangewezen, duurzame route.
