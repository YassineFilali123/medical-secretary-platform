/** Admin API service – delegates to the mock admin service. */
import { adminService as mockAdmin } from "@/services/admin";

export const adminService = {
  getUsers: () => mockAdmin.getUsers(),

  getUserById: (id: string) => mockAdmin.getUserById(id),

  getUserCountByRole: (role: string) => mockAdmin.getUserCountByRole(role),

  getUserCount: () => mockAdmin.getUserCount(),

  getActiveUserCount: () => mockAdmin.getActiveUserCount(),

  getRoles: () => mockAdmin.getRoles(),

  getPermissions: () => mockAdmin.getPermissions(),

  getAiParameters: () => mockAdmin.getAiParameters(),

  getEscalationRules: () => mockAdmin.getEscalationRules(),

  getDefaultResponses: () => mockAdmin.getDefaultResponses(),

  getScenarios: () => mockAdmin.getScenarios(),

  getFaqs: () => mockAdmin.getFaqs(),

  getFaqCategories: () => mockAdmin.getFaqCategories(),

  getActivityLogs: () => mockAdmin.getActivityLogs(),

  getSettings: () => mockAdmin.getSettings(),

  getSettingsByCategory: (category: string) => mockAdmin.getSettingsByCategory(category),

  getNotifications: () => mockAdmin.getNotifications(),

  markNotificationRead: (id: string) => mockAdmin.markNotificationRead(id),

  getUnreadNotificationCount: () => mockAdmin.getUnreadNotificationCount(),
};
