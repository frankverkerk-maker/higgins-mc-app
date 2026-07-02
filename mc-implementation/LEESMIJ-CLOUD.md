# Higgins MC — Agent & Edition Management (CLOUD-kant)

Dit is de **pan-klare** tegenhanger van het Mac Mini-script, maar dan voor de
Mission Control **Cloud**-omgeving (Manus webdev-project met MySQL). Eén commando,
geen handmatige stappen, en idempotent (veilig om vaker te draaien).

## Wat doet het?

1. **Twee tabellen** in de cloud-database:
   - `agent_registry` — de volledige roster (42 agents, 12 afdelingen) met de
     vlaggen `is_active` (agent aan/uit) en `is_classified` (geheime afdeling).
   - `edition_config` — de actieve editie: `internal` (alles) of `whitelab`
     (zonder classified afdelingen). Eén singleton-rij.
2. **De volledige roster geseed** — in development staat alles op actief.
3. **Drie endpoints** (identiek aan de Mac Mini-kant):
   - `GET /api/app/team-feed` — read-only voor de app; geeft alleen **actieve**
     agents, en in `whitelab` worden classified afdelingen automatisch weggelaten.
   - `POST /api/mc/agent/toggle` — agent aan/uit (alleen operator, met token).
   - `POST /api/mc/edition` — editie wisselen (alleen operator, met token).
4. **Drizzle-schema** aangevuld (nooit via introspect — dat genereert kapotte TS).

## Hoe draai je het? (één commando)

In de cloud-sandbox van het MC-project, in een terminal:

```bash
bash install_agent_edition_cloud.sh
```

Staat het cloud-project ergens anders dan `/home/ubuntu/higgins-mission-control`?

```bash
MC_DIR=/jouw/pad/higgins-mission-control bash install_agent_edition_cloud.sh
```

Het script detecteert de database automatisch via `pnpm db:sql`, `DATABASE_URL`
(mysql client of mysql2 in Node), of losse `MYSQL_*` variabelen. Lukt dat niet,
dan toont het het SQL-bestand zodat je het in het Database-paneel kunt plakken.

## Eénmalige koppeling in de server

Voeg in de opstart van de cloud MC-server deze twee regels toe (waar `app` je
Express-app is en `db` je mysql2-pool):

```ts
import { registerAgentEditionRoutes } from "./routes/agent-edition";
registerAgentEditionRoutes(app, db);
```

## Beveiliging (klanten kunnen niets wijzigen)

De schakel-endpoints vereisen de header `x-operator-token`. In de cloud kun je het
token zetten via de env var `OPERATOR_TOKEN` (aanrader op een gedeelde runtime),
of via het bestand `.operator-token` in de projectmap. De app gebruikt dit token
niet en kan dus niets aan- of uitzetten — alleen de operator (jij) kan dat.

## Koppeling met de iPhone-app

De app leest de feed live. Zet de cloud-URL in de app onder
**Instellingen → Verbinding → "MC Team-feed URL"**, bijvoorbeeld:

```
https://<jouw-mc-cloud-domein>/api/app/team-feed
```

De app test de URL direct bij opslaan en toont "Verbonden · live data" of valt
netjes terug op de ingebouwde lijst als de cloud even niet bereikbaar is. In
Team Pulse zie je bovenaan een indicator (groene stip = live via Mission Control).

## Cloud vs. Mac Mini

| | Mac Mini-script | Cloud-script |
|---|---|---|
| Bestand | `install_agent_edition_mc.sh` | `install_agent_edition_cloud.sh` |
| DB-toegang | lokaal / `pnpm db:sql` / `MYSQL_*` | + `DATABASE_URL` via mysql2 |
| Operator-token | bestand `.operator-token` | env `OPERATOR_TOKEN` of bestand |
| Endpoints | identiek | identiek |
| Roster & schema | identiek | identiek |

Beide schrijven dezelfde tabellen en endpoints; je kunt dus per omgeving kiezen
welke de "bron van waarheid" voor de app is door simpelweg de juiste feed-URL in
de app-instellingen te zetten.
