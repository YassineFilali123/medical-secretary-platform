/**
 * Consolidated notification API service.
 * Routes calls to the appropriate role-specific mock service.
 */
import { adminService } from "@/services/admin";
import { doctorService } from "@/services/doctor";
import { secretaryService } from "@/services/secretary";
import { patientService } from "@/services/patient";
import type { UserRole } from "@/types/auth";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

function resolveNotifications(role: UserRole): NotificationItem[] {
  switch (role) {
    case "admin":
      return adminService.getNotifications() as unknown as NotificationItem[];
    case "doctor":
      return doctorService.getNotifications() as unknown as NotificationItem[];
    case "secretary":
      return secretaryService.getNotifications() as unknown as NotificationItem[];
    case "patient":
      return patientService.getNotifications() as unknown as NotificationItem[];
  }
}

export const notificationService = {
  getNotifications(role: UserRole): NotificationItem[] {
    return resolveNotifications(role);
  },

  markNotificationRead(id: string, role: UserRole): void {
    switch (role) {
      case "admin":
        adminService.markNotificationRead(id);
        break;
      case "doctor":
        doctorService.markNotificationRead(id);
        break;
      case "secretary":
        secretaryService.markNotificationRead(id);
        break;
      case "patient":
        patientService.markNotificationRead(id);
        break;
    }
  },

  getUnreadCount(role: UserRole): number {
    return resolveNotifications(role).filter((n) => !n.read).length;
  },
};
