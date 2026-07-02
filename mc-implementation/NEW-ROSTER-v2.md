# Higgins MC v2.0 — Nieuwe roster (uit Pasted_content_41.txt)

Bron: SwiftUI-update script (native app). We nemen alleen de DATA over
(afdelingen + agents) en implementeren die in onze bestaande Expo-app + scripts.
De Swift/tRPC/OAuth/SSE-code is NIET van toepassing op onze app.

## 10 departments (nieuwe indeling)
| id | name | short | icon | color | agents |
|----|------|-------|------|-------|--------|
| executive | Executive Office | EXEC | 🏛️ | #0D9488 | 3 |
| technology | Technology Division | TECH | ⚡ | #7C3AED | 6 |
| marketing | Marketing & Creative | GMD | 📣 | #EA580C | 6 |
| wtd | Warren Trading Desk | WTD | 💹 | #059669 | 2 (CLASSIFIED) |
| fmc | Functional Medicine Center | FMC | 🏥 | #2E7D32 | 5 |
| uta | Ultra Trust Agency | UTA | 👑 | #D4AF37 | 17 (CLASSIFIED) |
| jlc | Justitia Legal Council | JLC | ⚖️ | #1A237E | 6 |
| sales | Sales & Revenue | SALES | 🎯 | #DC2626 | 3 |
| enterprise | Enterprise Operations | ENT | 🏢 | #0891B2 | 14 |
| specialists | Cross-Functional Specialists | SPEC | 🌟 | #6366F1 | 4 |

Totaal opgeteld: 3+6+6+2+5+17+6+3+14+4 = 66. (Config zegt 66; Swift test zegt 65 —
de agent-array bevat 65 rijen omdat Technology 5 rijen heeft ipv 6, of andersom.
WE TELLEN de daadwerkelijke agent-rijen = 65. Departement 'technology' agentCount=6
maar er staan 6 tech agents: elon, jenkins, sid, forge, nexus, da-vinci = 6. 
Herteld: exec3+tech6+mkt6+wtd2+fmc5+uta17+jlc6+sales3+ent14+spec4 = 66.
Swift-test verwacht 65 → discrepantie in bronbestand. WE gebruiken de FEITELIJKE
lijst hieronder als bron van waarheid en zetten counts daarop af.)

## Agents (feitelijke lijst uit Models.swift)
Executive (3): Higgins(COO,opus), Elena(Exec Assistant), Rosi(Community Manager)
Technology (6): Elon(CTO,opus), Jenkins(Backend), Sid(Security), Forge(Creative Eng), Nexus(Integration Architect), Da Vinci(Digital Architect DVDA)
Marketing (6): Gary(CMO,opus), Bard(Content), Picasso(Visual), Echo(Social), Anna(Market Analyst), Larry(SEO)
WTD (2) CLASSIFIED: Warren(Head of Trading,opus), Abacus(Financial Analyst)
FMC (5): David Sinclair(Longevity,opus), Vladimir Khavinson(Bioregulation), Samuel Hahnemann(Integrative), Rosalind Franklin(Molecular Diag,opus), Maria Blasco(Telomere, gemini-2.5-pro/google)
UTA (17) CLASSIFIED: Victoria Sterling(Head,opus), Alexander Whitfield(Senior Trust Counsel), Arabella Blackwood(Intl Tax), Benedict Hargreaves(Corp Structuring), Charlotte Pemberton(Family Governance), Eleanor Ashworth(Wealth Transfer), Helena von Liechtenstein(Private Banking), Isabelle Ritter(Compliance), James Worthington(Real Estate Trust), Lukas van der Berg(Cross-Border Benelux), Margaret Frick(Liechtenstein Foundation), Maximilian von Hessen(German Tax), Oliver Hartmann(Swiss Holding), Philippa Cavendish(Art & Collectibles), Raphael Zimmermann(Digital Assets & Crypto), Sebastian Kessler(Insurance & Risk), Theodore Brunner(Philanthropic)
JLC (6): Justitia(CLO,opus), Adrian(Corporate Law), Elena Vasquez(Intl Law), Isabelle(Contract Review), Matteo(IP & Tech Law), Nadia(Data Protection GDPR)
Sales (3): Closer(Head of Sales), Carson(Product Intelligence), Strategos(Revenue Strategy)
Enterprise (14): Atlas(Ops Director), Bridge(Integration Coord), Felix(QA), Flora(Wellness), Herald(Communications), Hugo(HR), Iris(Patient Experience), Max(Facility Ops), Mentor(Training), Nova(Innovation R&D), Oscar(Supply Chain), Quinn(Data Analytics), Vera(Regulatory), Vita(Vitality Programs)
Specialists (4): Sophia(CMO,opus), Catharina(Research Director), Barbara(Intl Relations), Susi(Customer Success)

Actual agent count = 3+6+6+2+5+17+6+3+14+4 = 66 rows.

## Classified afdelingen (whitelab verbergt deze)
- WTD (Warren Trading Desk)
- UTA (Ultra Trust Agency)
(Task Force Ghost bestaat niet meer in v2.)

## MC domain (uit config)
higgins-dash-bbdpujw2.manus.space
- feed zou worden: https://higgins-dash-bbdpujw2.manus.space/api/app/team-feed

## Implementatieplan
1. Herschrijf constants/team.ts naar deze 10 departments + 66 agents (edition-aware).
2. Update i18n waar afdelingsnamen hardcoded zijn (pipelineTeam sub etc — check).
3. Update tests/team.structure.test.ts naar 10 depts, nieuwe counts, UTA=17, WTD classified.
4. Update install_agent_edition_mc.sh + install_agent_edition_cloud.sh seed naar nieuwe roster.
5. Verify tsc + vitest, checkpoint, deliver.
