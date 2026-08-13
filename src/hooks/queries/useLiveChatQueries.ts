import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { liveChatService } from "@/services/live-chat";
import { queryKeys } from "@/lib/query-keys";

/**
 * React Query bindings for the live-chat LISTS.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *   The message stream. `liveChatService.poll(chatId, since)` is an incremental
 *   cursor fetch — each call returns only messages newer than the last id the
 *   client holds, and the page appends them. React Query caches whole
 *   responses, so wrapping a delta feed in it would mean either re-fetching the
 *   entire transcript on every tick or hand-rolling a merge inside the query
 *   function. Neither is an improvement, and the message loop is also the seam
 *   the WebSocket now serves. The lists below are plain snapshots, which is
 *   exactly what useQuery is good at.
 *
 * These lists are refreshed by WebSocket events (a patient joining the queue,
 * an accept, a close, a new message) rather than on a timer — see
 * useLiveChatListSocket, which invalidates these keys.
 */

/** Secretary: patients waiting for anyone to accept. */
export function useWaitingChatsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.liveChat.waiting(),
    queryFn: () => liveChatService.waitingQueue(),
    enabled,
  });
}

/** Secretary: conversations assigned to the signed-in secretary. */
export function useMyActiveChatsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.liveChat.active(),
    queryFn: () => liveChatService.myActiveChats(),
    enabled,
  });
}

/** Patient: their own open chat, if any. */
export function useMyChatQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.liveChat.mine(),
    queryFn: () => liveChatService.myChat(),
    enabled,
  });
}

function useInvalidateLiveChat() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.liveChat.all });
  };
}

/**
 * Accepting moves a chat out of the waiting queue and into the caller's active
 * list, so both must be refreshed. Rejects with `status === 409` when another
 * secretary won the race.
 */
export function useAcceptChatMutation() {
  const invalidate = useInvalidateLiveChat();

  return useMutation({
    mutationFn: (chatId: number) => liveChatService.accept(chatId),
    onSuccess: invalidate,
  });
}

/** Closing removes the chat from the active list. */
export function useCloseChatMutation() {
  const invalidate = useInvalidateLiveChat();

  return useMutation({
    mutationFn: (chatId: number) => liveChatService.close(chatId),
    onSuccess: invalidate,
  });
}

/**
 * Sending a message changes the "last message" and unread count carried by the
 * active list, so that list is refreshed. The transcript itself is appended by
 * the caller from the returned message — it is not cached here.
 */
export function useSendChatMessageMutation() {
  const invalidate = useInvalidateLiveChat();

  return useMutation({
    mutationFn: ({ chatId, content }: { chatId: number; content: string }) =>
      liveChatService.sendMessage(chatId, content),
    onSuccess: invalidate,
  });
}
