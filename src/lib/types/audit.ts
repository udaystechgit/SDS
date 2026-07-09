export type AuditEntityType = "timesheet" | "leave_request" | "employee";

export type AuditAction =
  | "created"
  | "updated"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "linked_auth_user";

export type AuditMetadataValue =
  | string
  | number
  | boolean
  | null
  | AuditMetadataValue[]
  | { [key: string]: AuditMetadataValue };

export type AuditEvent = {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorUserId: string | null;
  metadata: { [key: string]: AuditMetadataValue };
  createdAt: string;
};
