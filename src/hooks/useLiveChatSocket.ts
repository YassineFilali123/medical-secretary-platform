import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  realtime,
  type LiveChatEventMessage,
  type RealtimeStatus,
} from "@/lib/realtime";

/**
 * Subscribes to one live-chat conversation and reports connection state.
 *
 * Replaces the 3-second message poll. History still comes from
 * GET /livechat/messages; this only delivers what arrives afterwards.
 *
 * @param chatId       Conversation to watch, or null to watch nothing.
 * @param onMessage    Called once per newly delivered message.
 * @param onChatEvent  Called when the conversation itself changes (accepted /
 *                     closed), so the caller can refresh its own view.
 */
export function useLiveChatSocket(
  chatId: number | null,
  onMessage: (message: LiveChatEventMessage) => void,
  onChatEvent?: (event: "accepted" | "closed", chatId: number) => void,
) {
  const [status, setStatus] = useState<RealtimeStatus>(realtime.getStatus());
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => realtime.onStatus(setStatus), []);

  useEffect(() => {
    realtime.connect();

    const off = realtime.onEvent((event) => {
      switch (event.type) {
        case "message":
          // Only the conversation currently on screen.
          if (event.chatId === chatId) onMessage(event.data);
          // The lists carry last-message and unread counts, so they are stale
          // the moment any watched conversation receives anything.
          void queryClient.invalidateQueries({ queryKey: queryKeys.liveChat.all });
          break;

        case "accepted":
        case "closed":
          onChatEvent?.(event.type, event.chatId);
          void queryClient.invalidateQueries({ queryKey: queryKeys.liveChat.all });
          break;

        case "subscribe_error":
          if (event.chatId === chatId) setSubscribeError(event.error);
          break;

        case "subscribed":
          if (event.chatId === chatId) setSubscribeError(null);
          break;

        default:
          break;
      }
    });

    return off;
  }, [chatId, onMessage, onChatEvent, queryClient]);

  useEffect(() => {
    if (chatId === null) return;

    setSubscribeError(null);
    realtime.subscribe(chatId);

    return () => realtime.unsubscribe(chatId);
  }, [chatId]);

  return { status, subscribeError };
}

/**
 * Keeps the socket alive for a screen that shows conversation LISTS rather than
 * one transcript — the secretary queue and Active Conversations. Any live-chat
 * event invalidates the list queries, which is what used to need a 5s poll.
 */
export function useLiveChatListSocket() {
  const [status, setStatus] = useState<RealtimeStatus>(realtime.getStatus());
  const queryClient = useQueryClient();

  useEffect(() => realtime.onStatus(setStatus), []);

  useEffect(() => {
    realtime.connect();
    // Queue updates for conversations nobody is subscribed to yet. The server
    // grants this only to the secretary role.
    realtime.subscribeLobby();

    return realtime.onEvent((event) => {
      if (
        event.type === "message" ||
        event.type === "accepted" ||
        event.type === "closed" ||
        event.type === "waiting"
      ) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.liveChat.all });
      }
    });
  }, [queryClient]);

  return { status };
}
