# Werknotities — Team Pulse-identiteit (6 oktober 2026)

## Vastgestelde systeemfeiten

- Command Center-project: `/home/ubuntu/higgins-mc-app`, Fase 44-checkpoint `2fbeb023`; productie `higginsmc-fzaggof9.manus.space` draait een andere bundel (`entry-265a23e7671c61d3f9d1cc1f100d726c.js`, Last-Modified 3 oktober 2026). Een symbolencheck in geminificeerde code is geen sluitend bewijs van checkpointidentiteit. Publieke browserweergave `/agents` bleef op 6 oktober leeg (root zonder React-content), terwijl browser `readyState=interactive` aangaf; netwerk aan dit domein was wisselvallig.
- MC-cloud heeft een JSON-roster op `https://higgins-dash-bbdpujw2.manus.space/api/app/team-feed` met `directorySource: drizzle.agent_team`, `directoryVersion: 1`, `edition: internal`, 92 records (waarneming 4 oktober). MC-cloud vraagt soms meer dan 16 seconden en kan time-out geven.
- Bronrecords: `Elena`, rol Office Manager / Receptioniste, afdeling Executive Office en `displayName: Elena`; `Nathalie`, dezelfde rol, afdeling Executive en `displayName: Nathalie`. Beide `department_id: executive` en `is_active: 1`. Apart JLC-record `Elena Vasquez` heeft in de bron `displayName: Nathalie Vasquez`; nóg een JLC-record `Nathalie Vasquez` bestaat. Deze zijn niet zonder identiteitsbewijzen te versmelten.
- De Command Center-mapper (Fase 44) hernoemt de oude Office Manager Elena naar Nathalie, maar vindt het echte Nathalie-record slechts wanneer `department === 'Executive Office'`. Het live record noemt de afdeling `Executive` en ontsnapt daardoor aan de bedoelde deduplicatie. De UI gebruikt bovendien alleen exact overeenkomende ingebouwde afdelingsnamen. Er is geen standaard-livefeed ingesteld zonder operator-URL of build-env. In de app-roster worden status en roster via verschillende calls geladen.
- MC-cloud zelf is een *afzonderlijk* WebDev-project. Voor het Command Center-project bestaat `webdev_save_checkpoint`, maar in deze sessie is geen afzonderlijk `webdev_publish`-instrument ontdekt. Het apparaat met bronprojectcode is niet als switchbaar blootgesteld; de externe browserroute was niet bruikbaar zonder een actieve lokale browsersessie.

## Primaire bronnen en implicaties

1. Prisma, “Using the expand and contract pattern for schema changes”: https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern — eerst compatibele nieuwe identificatie/schema, daarna gegevensmigratie en verifiëren, pas later oude velden/records uitfaseren.
2. Zod, “Basic usage”: https://zod.dev/basics — `parse`/`safeParse` valideren onbetrouwbare JSON aan de runtime-grens en rapporteren fouten; TypeScript-casts alleen zijn geen validatie.
3. Martin Fowler, “Legacy Mimic”: https://martinfowler.com/articles/patterns-legacy-displacement/legacy-mimic.html — zoekresultaat, browser gaf time-out; nog geen inhoudelijk bewijs voor een claim gebruiken.

## Open checks

- Verifieer officiële bron voor veilige identiteitssleutels/aliasregistratie, en rechtstreeks afgeleide MC-records op enig stabiel ID; publieke feed bevat geen `id`.
- Ontwerp en test canonicalisatie op `department_id`, uniek `agentId`/alias, deterministische prioriteit voor echte Nathalie, JLC ongemoeid.
- Ontwerp één same-origin Command Center-proxy met begrensde timeout, validatie, expliciete stale/fallback-toestand, niet automatisch een foutieve ingebouwde lijst als zogenaamd live presenteren.
- Maak onderscheid tussen *opgeleverd in checkpoint*, *gepubliceerd* en *live gezien*; publicatie kan niet worden afgeleid uit git- of asset-tijdstempel alleen.

## Bevestigde afwijkingen uit de 92 live agent-records (6 oktober)

`department_id=executive` heeft 9 rijen verdeeld over `Executive` (3) en `Executive Office` (6). `fmc` bevat één `Functional Medicine Council` versus acht `Functional Medicine Center`; `technology` één `Technology` versus zes `Technology Division`; `jlc` één `Jlc` versus zes `Justitia Legal Council`. Er zijn geen dubbele ruwe `name`-velden; de Office Manager is logisch dubbel door twee verschillende namen met identieke rol en hetzelfde `department_id`. De twee JLC-naamrecords zijn eveneens verschillend en mogen niet blind worden samengevoegd.

Het oude `mc-implementation/migrate-elena-to-nathalie.sql` richt zich op een **andere** rol (`Executive Assistant`) en op tabel `agents`, terwijl de echte bron `drizzle.agent_team` en rol `Office Manager / Receptioniste` gebruikt. Het script vervangt bovendien tekst in chatgeschiedenis. Uitvoeren op de huidige MC-bron zou onveilig zijn. De historische installer gebruikt `agent_registry` en komt evenmin overeen met de live directory.

4. Drizzle ORM, “Indexes & Constraints”: https://orm.drizzle.team/docs/indexes-constraints — unieke sleutels behoren in de database te worden afgedwongen, niet slechts in de UI. De live feed toont geen stabiel `id`/`slug`, dus nieuwe clientkeys worden voorlopig afgeleid en niet als database-ID gepresenteerd.

**Besluit:** de toegankelijke Command Center-app krijgt één same-origin, read-only directorygrens voor MC-cloud met JSON-validatie, deterministische canonieke mapping op `department_id`, beperkte achtergrondverversing en eerlijk herkenbare stale/builtin status. De niet-toegankelijke MC-cloud-DB blijft onveranderd totdat bronprojectrechten en referenties naar de twee agentrecords controleerbaar zijn. Geen algemene `Elena`-naar-`Nathalie`-rename en geen mutatie van JLC-geschiedenis.
