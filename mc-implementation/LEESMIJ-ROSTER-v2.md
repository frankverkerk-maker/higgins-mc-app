# Higgins MC — Roster v2.0 (juli 2026)

Deze update brengt de app en de installatiescripts in lijn met de **nieuwe Higgins MC-opzet**: 10 afdelingen, 66 agenten, met **Warren Trading Desk (WTD)** én **Ultra Trust Agency (UTA)** als classified. Task Force Ghost bestaat niet meer.

## Wat er gewijzigd is

| Onderdeel | Van (v1) | Naar (v2.0) |
|---|---|---|
| Afdelingen | 12 | **10** |
| Agenten | 42 | **66** |
| Classified afdelingen | UTA + WTD (deels leeg) | **WTD (2) + UTA (17)** |
| Task Force Ghost | lege classified afdeling | **verwijderd** |

## Afdelingen en aantallen (v2.0)

| Afdeling | Short | Agenten | Classified |
|---|---|---|---|
| Executive Office | EXEC | 3 | nee |
| Technology Division | TECH | 6 | nee |
| Marketing & Creative | MKT | 6 | nee |
| Functional Medicine Center | FMC | 5 | nee |
| Justitia Legal Council | JLC | 6 | nee |
| Sales & Revenue | SALES | 3 | nee |
| Enterprise Operations | ENT | 14 | nee |
| Cross-Functional Specialists | SPEC | 4 | nee |
| Warren Trading Desk | WTD | 2 | **ja** |
| Ultra Trust Agency | UTA | 17 | **ja** |
| **Totaal** | | **66** | 19 classified |

In de **whitelab**-editie worden de 2 classified afdelingen en 19 classified agenten automatisch verborgen (blijft 8 afdelingen / 47 agenten).

## Bijgewerkte bestanden

- `constants/team.ts` — volledige v2.0-roster (bron van waarheid voor de app).
- `app/(tabs)/agents.tsx` — kleur-mapping per afdeling + placeholder-logica (geen TFG meer).
- `lib/i18n/{nl,de,en}.ts` — bron-labels ongewijzigd, roster komt uit de feed/constants.
- `tests/team.structure.test.ts` + `tests/team-feed.test.ts` — vastgezet op v2.0 (32 tests groen).
- `mc-implementation/server.mjs` — lokale test-feed met v2.0-roster.
- `mc-implementation/install_agent_edition_mc.sh` — Mac Mini-installatie, seed = 66/10.
- `mc-implementation/install_agent_edition_cloud.sh` — Cloud-installatie, seed = 66/10.

De app-roster, de lokale test-feed en beide installatiescripts zijn **deterministisch uit dezelfde bron** gegenereerd, zodat de live feed exact overeenkomt met de ingebouwde lijst.

## Draaien

Cloud:
```
bash install_agent_edition_cloud.sh
```
Mac Mini:
```
bash install_agent_edition_mc.sh
```
Beide scripts zijn idempotent; een handmatig uitgezette agent (`is_active=0`) blijft uit bij herinstallatie.
