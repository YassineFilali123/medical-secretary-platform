import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type {
  MonitoringConversation,
  CallQueueItem,
  EmergencyQueueItem,
  DashboardStats,
  MonitoringEvent,
} from "@/types/monitoring";
import { monitoringService } from "@/services/monitoring";

type MonitoringState = {
  stats: DashboardStats;
  conversations: MonitoringConversation[];
  callQueue: CallQueueItem[];
  emergencyQueue: EmergencyQueueItem[];
  events: MonitoringEvent[];
};

type MonitoringContextValue = MonitoringState & {
  takeOver: (conversationId: string, secretaryName: string) => void;
  transfer: (conversationId: string, doctorName: string) => void;
  closeConversation: (conversationId: string) => void;
  addNote: (conversationId: string, note: string) => void;
  resolveEmergency: (emergencyId: string) => void;
  removeCall: (callId: string) => void;
};

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<DashboardStats>(monitoringService.getStats());
  const [conversations, setConversations] = useState<MonitoringConversation[]>(monitoringService.getConversations());
  const [callQueue, setCallQueue] = useState<CallQueueItem[]>(monitoringService.getCallQueue());
  const [emergencyQueue, setEmergencyQueue] = useState<EmergencyQueueItem[]>(monitoringService.getEmergencyQueue());
  const eventsRef = useRef<MonitoringEvent[]>([]);

  const pushEvent = useCallback((event: MonitoringEvent) => {
    eventsRef.current = [event, ...eventsRef.current].slice(0, 50);
  }, []);

  useEffect(() => {
    monitoringService.startSimulation(4000);

    const unsubscribe = monitoringService.subscribe((event: MonitoringEvent) => {
      pushEvent(event);

      switch (event.type) {
        case "conversation_started":
          setConversations(monitoringService.getConversations());
          break;
        case "conversation_closed":
          setConversations(monitoringService.getConversations());
          break;
        case "conversation_updated":
          setConversations(monitoringService.getConversations());
          break;
        case "call_received":
          setCallQueue(monitoringService.getCallQueue());
          break;
        case "call_removed":
          setCallQueue(monitoringService.getCallQueue());
          break;
        case "emergency_created":
          setEmergencyQueue(monitoringService.getEmergencyQueue());
          break;
        case "emergency_updated":
          setEmergencyQueue(monitoringService.getEmergencyQueue());
          break;
        case "stats_updated":
          setStats(monitoringService.getStats());
          break;
      }
    });

    return () => {
      unsubscribe();
      monitoringService.stopSimulation();
    };
  }, [pushEvent]);

  const takeOver = useCallback((id: string, name: string) => {
    monitoringService.takeOverConversation(id, name);
    setConversations(monitoringService.getConversations());
  }, []);

  const transfer = useCallback((id: string, doctor: string) => {
    monitoringService.transferConversation(id, doctor);
    setConversations(monitoringService.getConversations());
  }, []);

  const closeConv = useCallback((id: string) => {
    monitoringService.closeConversation(id);
    setConversations(monitoringService.getConversations());
  }, []);

  const addNote = useCallback((id: string, note: string) => {
    monitoringService.addNote(id, note);
    setConversations(monitoringService.getConversations());
  }, []);

  const resolveEmergency = useCallback((id: string) => {
    monitoringService.resolveEmergency(id);
    setEmergencyQueue(monitoringService.getEmergencyQueue());
  }, []);

  const removeCall = useCallback((id: string) => {
    monitoringService.removeCall(id);
    setCallQueue(monitoringService.getCallQueue());
  }, []);

  return (
    <MonitoringContext.Provider
      value={{
        stats,
        conversations,
        callQueue,
        emergencyQueue,
        events: eventsRef.current,
        takeOver,
        transfer,
        closeConversation: closeConv,
        addNote,
        resolveEmergency,
        removeCall,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMonitoring(): MonitoringContextValue {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error("useMonitoring must be used within a MonitoringProvider");
  }
  return context;
}
