#!/usr/bin/env python3
"""Vervang het seedblok in beide install-scripts door de v2.0 VALUES."""
import re, sys

with open("/tmp/seed_values.sql", "r", encoding="utf-8") as f:
    seed = f.read().rstrip("\n")

files = [
    "install_agent_edition_cloud.sh",
    "install_agent_edition_mc.sh",
]

for path in files:
    with open(path, "r", encoding="utf-8") as f:
        txt = f.read()

    # 1) Vervang alles tussen "VALUES\n" en "\nON DUPLICATE KEY UPDATE"
    pattern = re.compile(r"(VALUES\n).*?(\nON DUPLICATE KEY UPDATE)", re.DOTALL)
    new_block = r"\1" + seed.replace("\\", "\\\\") + r"\2"
    txt, n = pattern.subn(new_block, txt)
    if n != 1:
        print(f"FOUT: seedblok niet (uniek) gevonden in {path} (n={n})")
        sys.exit(1)

    # 2) Kop-comment 42/12 -> 66/10
    txt = txt.replace(
        "-- ── Seed: 42 agents / 12 afdelingen ──────────────────────────────────────────",
        "-- ── Seed: 66 agents / 10 afdelingen ──────────────────────────────────────────",
    )

    # 3) Verwijder de Task Force Ghost-staart-comments (bestaat niet meer in v2.0)
    txt = txt.replace(
        "-- Task Force Ghost (TFG) heeft GEEN zichtbare agents (operational security).\n",
        "",
    )
    txt = txt.replace(
        "-- Task Force Ghost (TFG) heeft GEEN zichtbare agents (operational security) —\n"
        "-- daarom geen rijen. De afdeling wordt in de UI als classified roster getoond.\n",
        "",
    )

    # 4) Header-comments boven in het script (42-agent / 12-afdeling)
    txt = txt.replace("de volledige 42-agent / 12-afdeling roster", "de volledige 66-agent / 10-afdeling roster")
    txt = txt.replace("Seed: 42 agents", "Seed: 66 agents")

    with open(path, "w", encoding="utf-8") as f:
        f.write(txt)
    print(f"OK: {path} bijgewerkt naar v2.0 roster.")
