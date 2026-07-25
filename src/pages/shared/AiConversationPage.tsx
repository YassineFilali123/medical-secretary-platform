import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Menu, Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiAssistantService } from "@/services/ai-assistant";
import {
  ChatMessage,
  ChatInput,
  TypingIndicator,
  ConversationSidebar,
  EmptyChatState,
} from "@/components/ai-assistant";
import type { Conversation } from "@/types/ai-assistant";
import { ROUTES } from "@/constants/routes";

export default function AiConversationPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversation, setConversation] = useState<Conversation | undefined>(
    conversationId ? aiAssistantService.getConversation(conversationId) : undefined
  );
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allConversations, setAllConversations] = useState(() =>
    aiAssistantService.getConversations()
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages.length, isTyping, scrollToBottom]);

  useEffect(() => {
    if (conversationId) {
      const conv = aiAssistantService.getConversation(conversationId);
      setConversation(conv);
      setAllConversations(aiAssistantService.getConversations());
    } else {
      setConversation(undefined);
    }
  }, [conversationId]);

  const refreshConversations = () => {
    setAllConversations(aiAssistantService.getConversations());
  };

  const handleSend = async (content: string) => {
    let conv = conversation;

    if (!conv) {
      conv = aiAssistantService.createConversation(content);
      setConversation(conv);
      refreshConversations();
      navigate(`${ROUTES.AI_ASSISTANT_CHAT}/${conv.id}`, { replace: true });
    } else {
      aiAssistantService.sendMessage(conv.id, content);
      conv = aiAssistantService.getConversation(conv.id);
      setConversation(conv);
    }

    setIsTyping(true);
    try {
      const assistantMsg = await aiAssistantService.generateAssistantResponse(conv!.id);
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, assistantMsg],
          updatedAt: assistantMsg.timestamp,
        };
      });
      refreshConversations();
    } finally {
      setIsTyping(false);
    }
  };

  const handleRegenerate = async () => {
    if (!conversation) return;
    setIsTyping(true);
    try {
      const assistantMsg = await aiAssistantService.generateAssistantResponse(conversation.id);
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, assistantMsg],
          updatedAt: assistantMsg.timestamp,
        };
      });
      refreshConversations();
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setConversation(undefined);
    navigate(ROUTES.AI_ASSISTANT_CHAT);
    refreshConversations();
  };

  const handleDelete = (id: string) => {
    aiAssistantService.deleteConversation(id);
    refreshConversations();
    if (conversationId === id) {
      navigate(ROUTES.AI_ASSISTANT_CHAT, { replace: true });
    }
  };

  const handleRename = (id: string, title: string) => {
    aiAssistantService.renameConversation(id, title);
    refreshConversations();
    if (conversationId === id) {
      setConversation((prev) => (prev ? { ...prev, title } : prev));
    }
  };

  const messages = conversation?.messages ?? [];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <ConversationSidebar
        conversations={allConversations}
        activeId={conversationId}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
        onRename={handleRename}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(ROUTES.AI_ASSISTANT_HOME)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-health">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">AI Assistant</p>
              <p className="text-[11px] text-muted-foreground">
                {isTyping ? "Thinking..." : "Online"}
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={handleNewChat}
            >
              <Plus className="mr-1 h-3 w-3" /> New Chat
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isTyping ? (
            <EmptyChatState
              quickActions={aiAssistantService.QUICK_ACTIONS}
              suggestedQuestions={aiAssistantService.SUGGESTED_QUESTIONS}
              onSelectAction={handleSend}
              onSelectQuestion={handleSend}
            />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isLatest={
                    i === messages.length - 1 && msg.role === "assistant"
                  }
                  onRegenerate={handleRegenerate}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput
          onSend={handleSend}
          disabled={isTyping}
          placeholder="Ask about appointments, symptoms, doctors..."
        />
      </div>
    </div>
  );
}
