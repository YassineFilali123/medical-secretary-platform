import { PatientAiChat } from "@/components/ai-assistant/PatientAiChat";

/**
 * Retained for existing direct links. Patients normally access this same chat
 * through the persistent floating launcher instead of sidebar navigation.
 */
export default function AiAssistantPage() {
  return <PatientAiChat />;
}
