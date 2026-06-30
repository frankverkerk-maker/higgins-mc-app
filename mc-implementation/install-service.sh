#!/usr/bin/env bash
# Higgins MC — maak het Agent & Edition runtime-servertje een permanente launchd-dienst.
# Idempotent: kan veilig opnieuw gedraaid worden.
set -euo pipefail

LABEL="com.higgins.agent-edition"
SCRIPT="$HOME/higgins/agent-edition/server.mjs"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOGDIR="$HOME/.higgins/logs"
NODE_BIN="$(command -v node || true)"
AE_PORT="${AE_PORT:-3007}"

echo "=== Higgins MC — Agent & Edition dienst-installatie ==="

if [ -z "${NODE_BIN}" ]; then
  echo "FOUT: 'node' niet gevonden in PATH. Installeer Node of pas PATH aan."
  exit 1
fi
if [ ! -f "${SCRIPT}" ]; then
  echo "FOUT: ${SCRIPT} bestaat niet. Download eerst server.mjs."
  exit 1
fi

mkdir -p "${LOGDIR}" "$HOME/Library/LaunchAgents"

cat > "${PLIST}" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${SCRIPT}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>AE_PORT</key>
    <string>${AE_PORT}</string>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOGDIR}/agent-edition.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOGDIR}/agent-edition.err.log</string>
</dict>
</plist>
PLIST_EOF

echo "[1/3] launchd-plist geschreven: ${PLIST}"

# Herladen (eerst eventueel oude versie verwijderen)
launchctl unload "${PLIST}" 2>/dev/null || true
launchctl load "${PLIST}"
echo "[2/3] Dienst geladen (RunAtLoad + KeepAlive = start automatisch, herstart bij crash)."

sleep 2
echo "[3/3] Verificatie:"
if curl -s "http://localhost:${AE_PORT}/api/app/health" | grep -q '"ok":true'; then
  echo "    OK — servertje draait als dienst op poort ${AE_PORT}."
else
  echo "    LET OP — health-check nog niet positief. Check log: ${LOGDIR}/agent-edition.err.log"
fi

echo
echo "=== KLAAR ==="
echo "De dienst start nu automatisch bij elke herstart en herstart zichzelf bij een crash."
echo "Stoppen:   launchctl unload \"${PLIST}\""
echo "Starten:   launchctl load \"${PLIST}\""
echo "Logs:      ${LOGDIR}/agent-edition.out.log  /  .err.log"
echo "Token:     $HOME/.higgins/agent-edition.token"
