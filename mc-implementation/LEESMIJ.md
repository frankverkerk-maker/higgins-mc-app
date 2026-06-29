# Higgins MC — Agent & Edition Management (MC-kant)

Dit pakket bevat één **pan-klaar** script dat aan de **Mission Control-kant** (Mac Mini)
de besturing voor agents en editie installeert. De slanke iPhone-app verandert hier
niet door — die **leest** alleen het resultaat uit.

## Wat krijg je?

1. **Twee tabellen** in de MC-database:
   - `agent_registry` — de volledige roster (42 agents, 12 afdelingen) met de vlaggen
     `is_active` (agent aan/uit) en `is_classified` (geheime afdeling).
   - `edition_config` — de actieve editie: `internal` (alles) of `whitelab` (zonder classified).
2. **De volledige roster geseed** — in development staat alles op actief.
3. **Drie endpoints**:
   - `GET /api/app/team-feed` — leesbaar voor de app; geeft alleen **actieve** agents,
     en in `whitelab` worden de classified afdelingen automatisch weggelaten.
   - `POST /api/mc/agent/toggle` — agent aan/uit (alleen operator, met token).
   - `POST /api/mc/edition` — editie wisselen (alleen operator, met token).

## Hoe draai je het? (één commando)

Op de Mac Mini, in een terminal:

```bash
bash install_agent_edition_mc.sh
```

Staat het MC-project ergens anders dan `/home/ubuntu/higgins-mission-control`? Dan:

```bash
MC_DIR=/jouw/pad/higgins-mission-control bash install_agent_edition_mc.sh
```

Het script is **idempotent**: je kunt het veilig opnieuw draaien. Een agent die jij
handmatig hebt uitgezet, blijft uit (een herinstallatie zet 'm niet terug op actief).

## Eénmalige koppeling in de server

Voeg in de opstart van de MC-server deze twee regels toe (waar `app` je Express-app is
en `db` je mysql2-pool):

```ts
import { registerAgentEditionRoutes } from "./routes/agent-edition";
registerAgentEditionRoutes(app, db);
```

## Beveiliging (klanten kunnen niets wijzigen)

De schakel-endpoints vereisen de header `x-operator-token`. Dat token wordt automatisch
aangemaakt in `.operator-token` in de MC-projectmap. Alleen jij (operator) kent het;
de app gebruikt het niet en kan dus niets aan- of uitzetten.

## Hoe sluit dit aan op de app?

De app heeft al een editie-bewust teammodel. Zodra de MC-feed live is, laat je de app
`GET /api/app/team-feed` gebruiken als bron i.p.v. de ingebouwde lijst — dan volgt de
app automatisch jouw keuzes (welke agents actief, welke editie). Dat is een kleine,
latere app-aanpassing; de MC-kant staat met dit script volledig klaar.
