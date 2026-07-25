export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

export type QuickAction = {
  id: string;
  label: string;
  description: string;
  icon: string;
  prompt: string;
};
