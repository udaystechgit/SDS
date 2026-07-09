export type NotificationType =
  | "timesheet_approved"
  | "timesheet_rejected"
  | "leave_approved"
  | "leave_rejected";

export type NotificationEntityType = "timesheet" | "leave_request";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
};
