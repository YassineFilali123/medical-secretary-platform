import type { Conversation, Message, QuickAction } from "@/types/ai-assistant";

const STORAGE_KEY = "medisecretary_conversations";

const QUICK_ACTIONS: QuickAction[] = [
  { id: "book", label: "Book Appointment", description: "Schedule a visit with a doctor", icon: "CalendarPlus", prompt: "I want to book an appointment." },
  { id: "find", label: "Find Doctor", description: "Search for specialists near you", icon: "Stethoscope", prompt: "I need to find a doctor." },
  { id: "appointments", label: "View Appointments", description: "Check your upcoming visits", icon: "CalendarCheck", prompt: "Show me my upcoming appointments." },
  { id: "contact", label: "Contact Secretary", description: "Reach the medical secretary", icon: "Phone", prompt: "How can I contact the secretary?" },
];

const SUGGESTED_QUESTIONS = [
  "I want to book an appointment.",
  "I need to cancel my appointment.",
  "What documents should I bring?",
  "When is Dr. Ahmed available?",
  "I have a fever, what should I do?",
  "What are the clinic working hours?",
  "Can I reschedule my appointment?",
  "What insurance do you accept?",
];

const AI_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["book", "appointment", "schedule", "visit"],
    response: "I'd be happy to help you book an appointment. You can schedule an appointment by:\n\n1. Going to the **Appointments** section in your dashboard\n2. Clicking **Book Appointment**\n3. Selecting your preferred doctor, date, and time\n4. Providing a reason for your visit\n\nWould you like me to help you with anything specific about the booking process?",
  },
  {
    keywords: ["cancel", "cancellation"],
    response: "To cancel an appointment, please follow these steps:\n\n1. Navigate to **My Appointments**\n2. Find the appointment you wish to cancel\n3. Click the **Cancel** button\n4. Provide a reason for cancellation\n\nPlease note that cancellations should be made at least **24 hours** before the scheduled appointment time. Is there anything else I can help with?",
  },
  {
    keywords: ["document", "bring", "papers", "records"],
    response: "For your appointment, we recommend bringing the following documents:\n\n- **Valid ID** (national ID or passport)\n- **Insurance card** (if applicable)\n- **Previous medical records** (if this is a follow-up)\n- **Referral letter** (if referred by another doctor)\n- **List of current medications**\n- **Allergy information**\n\nPlease arrive **15 minutes** early to complete any necessary paperwork.",
  },
  {
    keywords: ["dr.", "doctor", "ahmed", "available", "availability", "schedule"],
    response: "You can check a doctor's availability by:\n\n1. Going to the **Find Doctor** section\n2. Selecting the doctor you're interested in\n3. Viewing their schedule and available time slots\n\nOur doctors typically have availability during:\n- **Morning**: 9:00 AM - 12:00 PM\n- **Afternoon**: 2:00 PM - 5:00 PM\n\nWould you like me to help you find a specific specialist?",
  },
  {
    keywords: ["fever", "temperature", "sick", "ill", "symptoms", "cold", "flu"],
    response: "I'm sorry to hear you're not feeling well. Here are some general recommendations for fever:\n\n**Immediate care:**\n- Rest and stay hydrated\n- Take over-the-counter fever reducers (acetaminophen or ibuprofen)\n- Monitor your temperature regularly\n\n**Seek medical attention if:**\n- Temperature exceeds **39.4°C (103°F)**\n- Symptoms persist for more than **3 days**\n- You experience difficulty breathing\n\nWould you like me to help you book an appointment with a doctor?",
  },
  {
    keywords: ["hours", "working", "open", "close", "time"],
    response: "Our clinic operating hours are:\n\n**Weekdays (Monday - Friday)**\n- Morning: 8:00 AM - 12:00 PM\n- Afternoon: 2:00 PM - 6:00 PM\n\n**Saturday**\n- 9:00 AM - 1:00 PM\n\n**Sunday**\n- Closed\n\n**Emergency services** are available **24/7**. Is there anything else you'd like to know?",
  },
  {
    keywords: ["reschedule", "change", "move", "postpone"],
    response: "You can reschedule your appointment by:\n\n1. Going to **My Appointments**\n2. Finding the appointment you want to reschedule\n3. Clicking **Reschedule**\n4. Selecting a new date and time\n\nPlease note that rescheduling should be done at least **48 hours** before the original appointment time. If you need immediate assistance, please contact our secretary.",
  },
  {
    keywords: ["insurance", "coverage", "payment", "pay"],
    response: "We accept a wide range of insurance plans:\n\n**Accepted Insurance Providers:**\n- Blue Cross Blue Shield\n- Aetna\n- Cigna\n- United Healthcare\n- Medicare\n\n**Payment Methods:**\n- Cash\n- Credit/Debit cards\n- Insurance direct billing\n\nFor specific coverage questions, we recommend contacting your insurance provider directly. Would you like to know more about our payment options?",
  },
  {
    keywords: ["find", "specialist", "specialty", "recommend"],
    response: "We have specialists in the following departments:\n\n- **Cardiology** - Heart and cardiovascular system\n- **Dermatology** - Skin, hair, and nails\n- **Pediatrics** - Children's health\n- **Orthopedics** - Bones, joints, and muscles\n- **Neurology** - Brain and nervous system\n- **Ophthalmology** - Eye care\n\nYou can find a doctor by navigating to the **Find Doctor** section. Would you like a recommendation based on your symptoms?",
  },
  {
    keywords: ["thank", "thanks", "appreciate"],
    response: "You're welcome! I'm here to help whenever you need assistance. Don't hesitate to ask if you have any other questions about our medical services. Take care! 😊",
  },
  {
    keywords: ["hello", "hi", "hey", "greetings"],
    response: "Hello! Welcome to MediSecretary AI Assistant. I'm here to help you with:\n\n- Booking and managing appointments\n- Finding the right doctor\n- Understanding our services\n- Medical information and guidance\n\nHow can I assist you today?",
  },
  {
    keywords: ["emergency", "urgent", "help"],
    response: "⚠️ **If this is a medical emergency, please call 911 immediately.**\n\nFor urgent but non-emergency situations:\n- Our emergency line is available 24/7\n- You can visit our emergency department anytime\n- For urgent appointments, we offer same-day slots\n\nWould you like me to help you get in touch with someone right away?",
  },
];

function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getStoredConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function findResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const entry of AI_RESPONSES) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.response;
    }
  }
  return "Thank you for your question. I understand you're looking for information. Let me help you with that.\n\nFor personalized assistance, you can:\n1. **Book an appointment** with one of our specialists\n2. **Contact our secretary** for immediate support\n3. **Visit our FAQ section** for common questions\n\nIs there something specific I can help you with?";
}

function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/[^\w\s]/g, "").trim();
  if (cleaned.length <= 40) return cleaned;
  return cleaned.slice(0, 40).trim() + "...";
}

export const aiAssistantService = {
  QUICK_ACTIONS,
  SUGGESTED_QUESTIONS,

  getConversations(): Conversation[] {
    return getStoredConversations().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  getConversation(id: string): Conversation | undefined {
    return getStoredConversations().find((c) => c.id === id);
  },

  createConversation(firstMessage: string): Conversation {
    const now = new Date().toISOString();
    const userMessage: Message = {
      id: generateMessageId(),
      conversationId: "",
      role: "user",
      content: firstMessage,
      timestamp: now,
    };

    const conversation: Conversation = {
      id: generateId(),
      title: generateTitle(firstMessage),
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    userMessage.conversationId = conversation.id;
    conversation.messages.push(userMessage);

    const conversations = getStoredConversations();
    conversations.push(conversation);
    saveConversations(conversations);

    return conversation;
  },

  generateAssistantResponse(conversationId: string): Promise<Message> {
    return new Promise((resolve) => {
      const delay = 1000 + Math.random() * 1500;
      setTimeout(() => {
        const conversations = getStoredConversations();
        const conversation = conversations.find((c) => c.id === conversationId);
        if (!conversation) return;

        const lastUserMessage = [...conversation.messages]
          .reverse()
          .find((m) => m.role === "user");

        const responseText = findResponse(lastUserMessage?.content ?? "");

        const assistantMessage: Message = {
          id: generateMessageId(),
          conversationId,
          role: "assistant",
          content: responseText,
          timestamp: new Date().toISOString(),
        };

        conversation.messages.push(assistantMessage);
        conversation.updatedAt = assistantMessage.timestamp;
        saveConversations(conversations);

        resolve(assistantMessage);
      }, delay);
    });
  },

  sendMessage(conversationId: string, content: string): Message {
    const now = new Date().toISOString();
    const userMessage: Message = {
      id: generateMessageId(),
      conversationId,
      role: "user",
      content,
      timestamp: now,
    };

    const conversations = getStoredConversations();
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return userMessage;

    conversation.messages.push(userMessage);
    conversation.updatedAt = now;
    saveConversations(conversations);

    return userMessage;
  },

  deleteConversation(id: string): void {
    const conversations = getStoredConversations().filter((c) => c.id !== id);
    saveConversations(conversations);
  },

  renameConversation(id: string, newTitle: string): void {
    const conversations = getStoredConversations();
    const conversation = conversations.find((c) => c.id === id);
    if (conversation) {
      conversation.title = newTitle;
      conversation.updatedAt = new Date().toISOString();
      saveConversations(conversations);
    }
  },

  searchConversations(query: string): Conversation[] {
    const q = query.toLowerCase();
    return this.getConversations().filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  },

  clearAllConversations(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
