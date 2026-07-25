export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "doctor" | "secretary" | "patient";
  status: "active" | "inactive";
  createdAt: string;
  lastLogin: string;
  avatar?: string;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
};

export type Permission = {
  id: string;
  resource: string;
  actions: { read: boolean; write: boolean; delete: boolean; admin: boolean };
};

export type AiParameter = {
  id: string;
  key: string;
  label: string;
  value: string | number | boolean;
  type: "text" | "number" | "boolean" | "select";
  options?: string[];
  description: string;
};

export type ConversationScenario = {
  id: string;
  title: string;
  description: string;
  category: "symptom" | "medication" | "appointment" | "emergency" | "general";
  messages: { role: "patient" | "ai"; content: string }[];
  active: boolean;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  active: boolean;
};

export type ActivityLog = {
  id: string;
  user: string;
  userId: string;
  action: string;
  resource: string;
  details: string;
  ip: string;
  timestamp: string;
};

export type SystemSetting = {
  id: string;
  category: "general" | "security" | "email" | "notifications" | "backup";
  key: string;
  label: string;
  value: string | number | boolean;
  type: "text" | "number" | "boolean" | "select" | "password";
  options?: string[];
};

export type AdminNotification = {
  id: string;
  type: "update" | "alert" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

export type StatData = {
  label: string;
  value: number | string;
  change?: string;
  changeType?: "up" | "down";
};
