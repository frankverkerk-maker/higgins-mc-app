# Remaining Audit Fixes — Design Notes

## R2 — Resume polling for active delegations on app restart
**Problem:** When app is killed/restarted, active DelegationTracker components unmount and polling stops. If the server-side TaskWatcher hasn't sent a push yet, the result is lost.

**Solution:** 
- Chat messages with `delegation.taskId` + status "activated" are already persisted in AsyncStorage (chat history).
- On chat mount, scan persisted messages for any delegation that hasn't reached terminal state.
- For those, re-mount DelegationTracker (already happens naturally because the component renders based on message.delegation).
- The key fix: ensure the `onComplete` callback persists the result into the message history so that on next load, it shows the result instead of re-polling.
- **Already partially working:** DelegationTracker already renders for messages with delegation.taskId. The missing piece is: when onComplete fires, the parent must update the persisted message with the result. Check if chat.tsx already does this.

## D2 — Fix Docs tab sync key mismatch with chat storage
**Problem:** The Docs tab stores uploaded documents under a different AsyncStorage key than the chat. When a PDF is uploaded via Docs, the chat doesn't know about it, and vice versa.
**Solution:** Use a shared constant for the storage key, or have Docs read from the same key as chat.

## T1 — Move agent context out of user message into separate field
**Problem:** When the command router adds agent context to the user message, it pollutes the chat history. The LLM sees "the user said X" when actually the system added context.
**Solution:** Use a `system` message or a separate `context` field in the LLM call instead of appending to the user message.

## D3 — Add confidence-based confirmation to document routing
**Problem:** PDF routing always auto-delegates without confirmation, even when confidence is low.
**Solution:** Mirror the text-command-router pattern: if confidence < 0.85, return a confirmation request to the app.

## S3 — Route meeting summary through command router as user message
**Problem:** Meeting summaries bypass the command router entirely and go straight to a hardcoded agent.
**Solution:** Feed the summary text through routeCommand() so Higgins can intelligently decide which agent(s) should handle it.
