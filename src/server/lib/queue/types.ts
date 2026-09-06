export type NotificationType =
  | "SEMESTER_CHECK"
  | "NOTE"
  | "TEAM_INVITE"
  | "SYSTEM_BROADCAST";

export interface NotificationEvent {
  type: NotificationType;
  recipientId: string;
  senderId?: string | null;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export const NOTIFICATION_STREAM_KEY = "stream:notifications";
export const NOTIFICATION_CONSUMER_GROUP = "notif_workers";
export const NOTIFICATION_CONSUMER_NAME = `worker_${process.pid || 1}`;

export function getUnreadCountCacheKey(userId: string): string {
  return `user:${userId}:unread_count`;
}
