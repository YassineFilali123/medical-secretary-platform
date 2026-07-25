/** Chat / AI Assistant API service – delegates to the mock AI assistant service. */
import { aiAssistantService as mockAi } from "@/services/ai-assistant";

export const chatService = {
  QUICK_ACTIONS: mockAi.QUICK_ACTIONS,

  SUGGESTED_QUESTIONS: mockAi.SUGGESTED_QUESTIONS,

  getConversations: () => mockAi.getConversations(),

  getConversation: (id: string) => mockAi.getConversation(id),

  createConversation: (firstMessage: string) => mockAi.createConversation(firstMessage),

  generateAssistantResponse: (conversationId: string) => mockAi.generateAssistantResponse(conversationId),

  sendMessage: (conversationId: string, content: string) => mockAi.sendMessage(conversationId, content),

  deleteConversation: (id: string) => mockAi.deleteConversation(id),

  renameConversation: (id: string, newTitle: string) => mockAi.renameConversation(id, newTitle),

  searchConversations: (query: string) => mockAi.searchConversations(query),

  clearAllConversations: () => mockAi.clearAllConversations(),
};
