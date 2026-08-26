export const EMAIL_NOTIFICATION_QUEUE =
  process.env.EMAIL_NOTIFICATION_QUEUE ?? "email-notifications";

export interface EmailNotificationJobData {
  notificationId: string;
}
