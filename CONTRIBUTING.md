# Contributing to Higgins MC

Thank you for helping audit and improve the Higgins MC Native Command App. This document covers everything you need to get started.

---

## Getting Started

### 1. Clone and Install

```bash
git clone git@github.com:frankverkerk-maker/higgins-mc-app.git
cd higgins-mc-app
pnpm install
```

### 2. Environment Setup

Request the `.env` file from the project owner. It contains:
- `DATABASE_URL` — TiDB cloud database connection string
- `EXPO_PUBLIC_API_BASE_URL` — API server URL (use `http://localhost:3000` for local dev)

Place the `.env` file in the project root.

### 3. Start Development

```bash
# Start both Metro bundler (port 8081) and API server (port 3000)
pnpm dev
```

### 4. Test on Device

- Install **Expo Go** on your iPhone (App Store)
- Scan the QR code from the terminal output
- The app connects to your local API server

### 5. Test on Web (quick preview)

Open `http://localhost:8081` in your browser. Note: some native features (haptics, voice, push) won't work on web.

---

## Development Workflow

### Branch Strategy

```bash
# Create a feature/fix branch
git checkout -b fix/chat-offline-indicator

# Make changes, then commit
git add -A
git commit -m "fix: resolve stale message state in offline queue flush"

# Push and create PR
git push origin fix/chat-offline-indicator
```

### Commit Message Format

Use conventional commits:
- `fix:` — Bug fixes
- `feat:` — New features
- `refactor:` — Code restructuring without behavior change
- `docs:` — Documentation only
- `test:` — Adding or updating tests

### Pull Requests

1. Create a PR against `main`
2. Describe what you changed and why
3. Include steps to reproduce (for bug fixes)
4. Tag the project owner for review

---

## Running Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
npx vitest

# TypeScript type checking
pnpm check

# Lint
pnpm lint
```

### Current Test Coverage

- Auth/logout flow
- API health endpoint
- Team structure validation (88 agents, 11 departments)
- Command routing logic

### Writing New Tests

Place test files in `tests/` with the naming convention `*.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something specific", () => {
    expect(true).toBe(true);
  });
});
```

---

## Audit Focus Areas

When reviewing the codebase, please pay attention to:

### Critical Paths
1. **Chat flow** — `app/(tabs)/chat.tsx` → `server/routers.ts` (higgins.chat mutation)
2. **Command routing** — `server/command-router.ts` (LLM-based intent classification)
3. **Delegation** — Approve/reject flow, task activation via Manus API
4. **Offline queue** — `lib/offline-queue.ts` + `hooks/use-offline-queue.ts`

### Security
- No secrets in client-side code
- API input validation (zod schemas in `server/routers.ts`)
- Auth token handling (`hooks/use-auth.ts`)

### Performance
- FlatList usage (no `.map()` in ScrollViews for lists)
- Unnecessary re-renders (check memo/useMemo usage)
- Large bundle imports

### UX/Accessibility
- All buttons have working `onPress` handlers (no dead ends)
- Loading states shown during async operations
- Error states handled gracefully
- i18n completeness (all strings in `lib/i18n/nl.ts`, `de.ts`, `en.ts`)

---

## Architecture Notes

### Communication Flow

```
User → Chat → tRPC mutation → Command Router (LLM) → Response
                                    ↓ (if delegation)
                              Manus Agent API → Task Watcher → Push Notification
```

### Key Design Decisions

1. **Higgins is the sole orchestrator** — All commands go through Higgins. Users never communicate directly with individual agents. Higgins routes, delegates, and reports back.

2. **Offline-first** — Messages are queued in AsyncStorage when offline and automatically flushed when connectivity returns.

3. **Edition system** — The app supports "internal" (full access, classified content visible) and "whitelabel" (restricted, client-safe) modes via `lib/edition-provider.tsx`.

4. **i18n** — Three languages (NL/DE/EN). The `useLanguage()` hook returns translation object `t` used as `t.section.key`.

5. **No dashboard complexity** — This is a communication app (like WhatsApp for AI). Keep it simple. The dashboard lives separately on iPad/web.

---

## File Reference

| File | Purpose |
|------|---------|
| `app/(tabs)/chat.tsx` | Main chat interface (1260 lines) |
| `app/(tabs)/index.tsx` | Command Center / home screen |
| `server/routers.ts` | All tRPC API endpoints |
| `server/command-router.ts` | LLM-based command classification |
| `server/push-service.ts` | Push notification delivery |
| `shared/roster.ts` | Agent definitions (88 agents) |
| `lib/i18n/*.ts` | Translation files |
| `lib/offline-queue.ts` | Offline message buffering |
| `drizzle/schema.ts` | Database schema |
| `todo.md` | Feature tracking and history |

---

## Reporting Issues

When reporting bugs, please include:
1. **Device**: iPhone model + iOS version (or "web")
2. **Steps to reproduce**: Exact sequence of actions
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Screenshots/logs**: If applicable

Create an Issue on GitHub with the label `bug` or `audit-finding`.

---

## Questions?

Contact the project owner directly for:
- `.env` credentials
- Access to the TiDB database dashboard
- Clarification on business logic or Higgins behavior
- Manus API documentation
