export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    user: () => [...queryKeys.auth.all, "user"] as const,
  },

  appointments: {
    all: ["appointments"] as const,
    lists: () => [...queryKeys.appointments.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.appointments.lists(), filters] as const,
    details: () => [...queryKeys.appointments.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.appointments.details(), id] as const,
    byPatient: (patientId: string) =>
      [...queryKeys.appointments.all, "patient", patientId] as const,
    byDoctor: (doctorId: string) =>
      [...queryKeys.appointments.all, "doctor", doctorId] as const,
    today: () => [...queryKeys.appointments.all, "today"] as const,
    todayByDoctor: (doctorId: string) =>
      [...queryKeys.appointments.all, "today", doctorId] as const,
    doctors: () => [...queryKeys.appointments.all, "doctors"] as const,
    specialties: () => [...queryKeys.appointments.all, "specialties"] as const,
  },

  doctors: {
    all: ["doctors"] as const,
    lists: () => [...queryKeys.doctors.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.doctors.lists(), filters] as const,
    details: () => [...queryKeys.doctors.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.doctors.details(), id] as const,
    profile: () => [...queryKeys.doctors.all, "profile"] as const,
    availability: (id: string) =>
      [...queryKeys.doctors.all, "availability", id] as const,
    vacations: (id: string) =>
      [...queryKeys.doctors.all, "vacations", id] as const,
    patients: (id: string) =>
      [...queryKeys.doctors.all, "patients", id] as const,
    conversations: (id: string) =>
      [...queryKeys.doctors.all, "conversations", id] as const,
    weeklyStats: (id: string) =>
      [...queryKeys.doctors.all, "weeklyStats", id] as const,
  },

  patients: {
    all: ["patients"] as const,
    lists: () => [...queryKeys.patients.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.patients.lists(), filters] as const,
    details: () => [...queryKeys.patients.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.patients.details(), id] as const,
    doctors: () => [...queryKeys.patients.all, "doctors"] as const,
    appointments: (id: string) =>
      [...queryKeys.patients.all, "appointments", id] as const,
    documents: (id: string) =>
      [...queryKeys.patients.all, "documents", id] as const,
    notifications: (id: string) =>
      [...queryKeys.patients.all, "notifications", id] as const,
    healthTips: () => [...queryKeys.patients.all, "healthTips"] as const,
  },

  secretary: {
    all: ["secretary"] as const,
    conversations: {
      all: () => [...queryKeys.secretary.all, "conversations"] as const,
      lists: () => [...queryKeys.secretary.all, "conversations", "list"] as const,
      detail: (id: string) => [...queryKeys.secretary.all, "conversations", id] as const,
    },
    appointments: {
      all: () => [...queryKeys.secretary.all, "appointments"] as const,
      byDate: (date: string) =>
        [...queryKeys.secretary.all, "appointments", "date", date] as const,
    },
    queue: {
      all: () => [...queryKeys.secretary.all, "queue"] as const,
    },
    emergencies: {
      all: () => [...queryKeys.secretary.all, "emergencies"] as const,
      byStatus: (status: string) =>
        [...queryKeys.secretary.all, "emergencies", "status", status] as const,
    },
    aiConversations: {
      all: () => [...queryKeys.secretary.all, "aiConversations"] as const,
    },
    callLogs: {
      all: () => [...queryKeys.secretary.all, "callLogs"] as const,
    },
    notifications: {
      all: () => [...queryKeys.secretary.all, "notifications"] as const,
    },
  },

  admin: {
    all: ["admin"] as const,
    users: {
      all: () => [...queryKeys.admin.all, "users"] as const,
      detail: (id: string) => [...queryKeys.admin.all, "users", id] as const,
    },
    roles: {
      all: () => [...queryKeys.admin.all, "roles"] as const,
    },
    permissions: {
      all: () => [...queryKeys.admin.all, "permissions"] as const,
    },
    aiConfig: {
      parameters: () => [...queryKeys.admin.all, "aiConfig", "parameters"] as const,
      escalationRules: () => [...queryKeys.admin.all, "aiConfig", "escalationRules"] as const,
      defaultResponses: () => [...queryKeys.admin.all, "aiConfig", "defaultResponses"] as const,
    },
    scenarios: {
      all: () => [...queryKeys.admin.all, "scenarios"] as const,
    },
    faqs: {
      all: () => [...queryKeys.admin.all, "faqs"] as const,
      categories: () => [...queryKeys.admin.all, "faqs", "categories"] as const,
    },
    activityLogs: {
      all: () => [...queryKeys.admin.all, "activityLogs"] as const,
    },
    settings: {
      all: () => [...queryKeys.admin.all, "settings"] as const,
      byCategory: (category: string) =>
        [...queryKeys.admin.all, "settings", category] as const,
    },
    notifications: {
      all: () => [...queryKeys.admin.all, "notifications"] as const,
    },
  },

  statistics: {
    all: ["statistics"] as const,
    kpiCards: () => [...queryKeys.statistics.all, "kpiCards"] as const,
    dailyAppointments: () => [...queryKeys.statistics.all, "dailyAppointments"] as const,
    monthlyAppointments: () => [...queryKeys.statistics.all, "monthlyAppointments"] as const,
    appointmentStatus: () => [...queryKeys.statistics.all, "appointmentStatus"] as const,
    aiConversations: () => [...queryKeys.statistics.all, "aiConversations"] as const,
    aiPerformance: () => [...queryKeys.statistics.all, "aiPerformance"] as const,
    doctorActivity: () => [...queryKeys.statistics.all, "doctorActivity"] as const,
    patientGrowth: () => [...queryKeys.statistics.all, "patientGrowth"] as const,
    callDistribution: () => [...queryKeys.statistics.all, "callDistribution"] as const,
    satisfaction: () => [...queryKeys.statistics.all, "satisfaction"] as const,
    topDoctors: () => [...queryKeys.statistics.all, "topDoctors"] as const,
    mostActivePatients: () => [...queryKeys.statistics.all, "mostActivePatients"] as const,
    recentAppointments: () => [...queryKeys.statistics.all, "recentAppointments"] as const,
    recentAiConversations: () => [...queryKeys.statistics.all, "recentAiConversations"] as const,
    callAnalytics: () => [...queryKeys.statistics.all, "callAnalytics"] as const,
    callOutcomes: () => [...queryKeys.statistics.all, "callOutcomes"] as const,
    avgResponseTime: () => [...queryKeys.statistics.all, "avgResponseTime"] as const,
    doctorPerformance: () => [...queryKeys.statistics.all, "doctorPerformance"] as const,
    aiConversationHours: () => [...queryKeys.statistics.all, "aiConversationHours"] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    byRole: (role: string) => [...queryKeys.notifications.all, role] as const,
    unreadCount: (role: string) =>
      [...queryKeys.notifications.all, role, "unread"] as const,
  },

  chat: {
    all: ["chat"] as const,
    conversations: () => [...queryKeys.chat.all, "conversations"] as const,
    conversation: (id: string) => [...queryKeys.chat.all, "conversations", id] as const,
  },
} as const;
