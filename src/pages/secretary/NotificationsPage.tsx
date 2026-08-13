import { NotificationsList } from "@/components/notifications/NotificationsList";

/**
 * Reads `/api/notifications`, which returns only this user's rows — the same
 * source the notification bell polls, so the two can never disagree.
 */
export default function SecretaryNotificationsPage() {
  return <NotificationsList />;
}
