import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

/**
 * Lightweight provider that tracks the number of unread Higgins replies.
 *
 * - `unread` increments when Higgins answers while the Chat screen is NOT focused.
 * - `markRead()` resets the counter (called when the Chat screen gains focus).
 * - `chatActiveRef` lets the chat screen flag itself as focused so a reply that
 *   arrives while the user is reading does not count as unread.
 */
type ChatUnreadContextValue = {
  unread: number;
  /** Increment unread count (only counts if chat is not currently active). */
  notifyReply: () => void;
  /** Reset unread count to zero. */
  markRead: () => void;
  /** Flag whether the Chat screen is currently focused/active. */
  setChatActive: (active: boolean) => void;
};

const ChatUnreadContext = createContext<ChatUnreadContextValue | undefined>(undefined);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const [unread, setUnread] = useState(0);
  const chatActiveRef = useRef(false);

  const notifyReply = useCallback(() => {
    // Only count as unread when the user is not actively viewing the chat.
    if (!chatActiveRef.current) {
      setUnread((n) => Math.min(n + 1, 99));
    }
  }, []);

  const markRead = useCallback(() => {
    setUnread(0);
  }, []);

  const setChatActive = useCallback((active: boolean) => {
    chatActiveRef.current = active;
    if (active) setUnread(0);
  }, []);

  return (
    <ChatUnreadContext.Provider value={{ unread, notifyReply, markRead, setChatActive }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread(): ChatUnreadContextValue {
  const ctx = useContext(ChatUnreadContext);
  if (!ctx) {
    // Safe no-op fallback so screens never crash if the provider is missing.
    return {
      unread: 0,
      notifyReply: () => {},
      markRead: () => {},
      setChatActive: () => {},
    };
  }
  return ctx;
}
