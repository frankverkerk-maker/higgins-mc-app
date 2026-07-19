# Higgins MC — Native Command App

**AI-powered executive command center for iOS/Android.** Communicate with Higgins, your AI Chief of Staff, via text or voice. He orchestrates a team of 88 specialized agents across 11 departments.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 + React Native 0.81 |
| Language | TypeScript 5.9 |
| Routing | Expo Router 6 (file-based) |
| Styling | NativeWind 4 (Tailwind CSS) |
| State | React Context + AsyncStorage + TanStack Query |
| Backend | Express + tRPC |
| Database | TiDB (MySQL-compatible, cloud) |
| ORM | Drizzle |
| AI | Built-in LLM via Forge API |
| Voice | Whisper transcription |
| Notifications | Expo Push Notifications |

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│  iPhone / iPad (Expo Go or native build)    │
│                                             │
│  ┌─────────┐ ┌──────┐ ┌───────────────┐   │
│  │Command  │ │ Chat │ │  Team Pulse   │   │
│  │Center   │ │      │ │               │   │
│  └────┬────┘ └──┬───┘ └───────────────┘   │
│       │         │                           │
│  ┌────┴─────────┴──────────────────────┐   │
│  │         tRPC Client (lib/trpc.ts)   │   │
│  └─────────────────┬───────────────────┘   │
└────────────────────┼───────────────────────┘
                     │ HTTPS
┌────────────────────┼───────────────────────┐
│  Server (port 3000)│                       │
│  ┌─────────────────┴───────────────────┐   │
│  │  tRPC Router (server/routers.ts)    │   │
│  │  ├── higgins.chat (LLM + routing)   │   │
│  │  ├── higgins.transcribe (Whisper)   │   │
│  │  ├── higgins.getBuilding (Tower)    │   │
│  │  ├── higgins.getAgentStatus         │   │
│  │  └── documents.* (upload/analyze)   │   │
│  └─────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────────┐   │
│  │ Command      │  │  Push Service    │   │
│  │ Router (LLM) │  │  (Expo Push)     │   │
│  └──────────────┘  └──────────────────┘   │
│  ┌──────────────┐  ┌──────────────────┐   │
│  │ Task Watcher │  │  Manus Agent     │   │
│  │ (background) │  │  Service (API)   │   │
│  └──────────────┘  └──────────────────┘   │
└────────────────────────────────────────────┘
```

---

## Features

- **Chat with Higgins** — Text and voice commands, intelligent routing to agents
- **Command Center** — Morning briefing, weather, news, pending approvals
- **Team Pulse** — Real-time status of 88 agents across 11 departments
- **Higgins Tower** — Building visualization with floor-by-floor agent mapping
- **Document Management** — PDF generation, upload, AI analysis
- **Delegation & Approval** — Propose, approve, or reject agent tasks
- **Offline Queue** — Messages buffered when offline, auto-sent on reconnect
- **Push Notifications** — Chat replies and approval requests
- **Siri Shortcuts** — "Hey Siri, zeg tegen Higgins..." (prepared, needs native build)
- **i18n** — Dutch, German, English
- **Dark Mode** — Automatic based on system preference
- **Edition System** — Internal vs. whitelabel mode (hides classified content)

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- Expo Go app on your iPhone/iPad (for testing)
- Access to the `.env` file (request from project owner)

### Setup

```bash
# Clone the repository
git clone git@github.com:frankverkerk-maker/higgins-mc-app.git
cd higgins-mc-app

# Install dependencies
pnpm install

# Create .env file (get values from project owner)
cp .env.example .env
# Fill in DATABASE_URL and other required values

# Start development server (Metro + API)
pnpm dev
```

### Testing on Device

1. Start the dev server: `pnpm dev`
2. Open Expo Go on your iPhone
3. Scan the QR code shown in the terminal
4. The app loads and connects to the local API server

### Running Tests

```bash
# Run all tests
pnpm test

# Type checking
pnpm check
```

---

## Project Structure

```
app/                          # Screens (file-based routing)
├── _layout.tsx               # Root layout (providers, auth check)
├── onboarding.tsx            # First-run onboarding
├── (tabs)/
│   ├── _layout.tsx           # Tab bar configuration
│   ├── index.tsx             # Command Center (home)
│   ├── chat.tsx              # Chat with Higgins
│   ├── agents.tsx            # Team Pulse
│   ├── tower.tsx             # Higgins Tower
│   ├── docs.tsx              # Document list
│   ├── doc-detail.tsx        # Document viewer (hidden tab)
│   └── settings.tsx          # Settings
├── dev/
│   └── theme-lab.tsx         # Theme preview (dev only)

server/                       # Backend API
├── _core/                    # Framework (don't modify)
│   ├── index.ts              # Express + tRPC server
│   ├── llm.ts                # LLM invocation
│   └── voiceTranscription.ts # Whisper API
├── routers.ts                # tRPC procedures (main logic)
├── command-router.ts         # Intelligent command routing
├── push-service.ts           # Push notification delivery
├── task-watcher.ts           # Background task polling
├── manus-agent-service.ts    # Agent activation API
└── pdf-generator.ts          # PDF report generation

lib/                          # Shared utilities
├── i18n/                     # Translations (nl.ts, de.ts, en.ts)
├── language-provider.tsx     # Language context
├── edition-provider.tsx      # Internal/whitelabel edition
├── offline-queue.ts          # Offline message buffering
├── siri-shortcuts.ts         # Siri integration
└── trpc.ts                   # tRPC client

shared/                       # Shared between client & server
├── roster.ts                 # Agent roster (88 agents)
└── types.ts                  # Shared TypeScript types

hooks/                        # React hooks
├── use-offline-queue.ts      # Offline queue hook
├── use-siri-shortcuts.ts     # Siri shortcuts hook
└── use-colors.ts             # Theme colors

drizzle/                      # Database
├── schema.ts                 # Drizzle table definitions
└── *.sql                     # Migration files

docs/                         # Documentation
├── CHAT-AUDIT-AND-MULTI-MANAGER-DESIGN.md
├── APP-STORE-PUBLICATIE-HANDLEIDING.md
├── EAS-BUILD-TESTFLIGHT-GUIDE.md
└── AUDIT-REPORT-EN.md
```

---

## Environment Variables

Create a `.env` file in the project root. Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | TiDB connection string (MySQL protocol with SSL) |
| `EXPO_PUBLIC_API_BASE_URL` | Public URL of the API server |

The server also uses built-in Forge API credentials (provided by the hosting platform).

---

## Key Flows to Test

### 1. Chat Flow
- Send a text message → Higgins responds
- Use voice recording → transcription → Higgins responds
- Send a delegation command (e.g., "Laat Elena een rapport maken") → approval prompt appears
- Approve delegation → agent activates → push notification on completion

### 2. Command Center
- Morning briefing loads
- Weather and news sections render
- Pending approvals show with Approve/Reject buttons
- Approve/reject works and removes the item

### 3. Offline Behavior
- Disable network → send message → shows ⏳ indicator
- Re-enable network → message auto-sends → indicator clears

### 4. Settings
- Language switch (NL/DE/EN) → all screens update
- Dark/light mode toggle
- Logout → clears data → returns to onboarding

### 5. Tower
- Floors render with agent counts
- Tap to expand → shows agents with status dots
- Long-press → navigates to Chat with pre-filled Higgins command

---

## Coding Conventions

- **Styling**: NativeWind (Tailwind classes) via `className`. Never use `className` on `Pressable`.
- **Screens**: Always wrap in `<ScreenContainer>` for SafeArea handling.
- **Lists**: Use `FlatList`, never `ScrollView` with `.map()`.
- **Icons**: Add mapping in `icon-symbol.tsx` before using in tabs.
- **i18n**: All user-facing strings must use translation keys from `lib/i18n/`.
- **State**: Prefer AsyncStorage for persistence. Use `useEffect` to load on mount.
- **API**: All server calls go through tRPC (`lib/trpc.ts`).

---

## Known Limitations

- Siri Shortcuts only work after native build (not in Expo Go)
- Push notifications require device registration (not available in simulator)
- Voice recording requires microphone permission grant
- The app is optimized for iPhone; iPad shows the same layout (no split-view yet)

---

## Deployment

See `docs/EAS-BUILD-TESTFLIGHT-GUIDE.md` for full App Store deployment instructions.

Quick reference:
```bash
# Build for TestFlight
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios --latest

# OTA update (no rebuild needed)
eas update --branch production --message "Description"
```

---

## License

Proprietary — Carpe Diem GmbH. All rights reserved.
