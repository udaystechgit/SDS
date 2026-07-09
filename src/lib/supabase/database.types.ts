export type JobRequirementRow = {
  id: string;
  job_title: string;
  department: string;
  service_domain: string;
  location: string;
  job_type: string;
  experience_level: string;
  work_mode: string;
  short_description: string;
  responsibilities: string;
  requirements_skills: string;
  salary_range: string;
  application_email: string;
  status: string;
  posted_date: string | null;
  created_at: string;
  updated_at: string;
};

export type EmployeeRow = {
  id: string;
  auth_user_id: string | null;
  uid: string;
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  employee_type: string;
  assigned_client: string;
  assigned_project: string;
  service_domain: string;
  start_date: string;
  end_date: string | null;
  work_mode: string;
  work_location: string;
  hourly_rate: string;
  billing_rate: string;
  responsibilities: string;
  required_skills: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export type TimesheetRow = {
  id: string;
  employee_id: string;
  week_start: string;
  week_end: string;
  status: TimesheetStatus;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type TimesheetEntryRow = {
  id: string;
  timesheet_id: string;
  work_date: string;
  project_name: string;
  task_description: string;
  hours: number;
  created_at: string;
  updated_at: string;
};

export type LeaveStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled";

export type LeaveType = "annual" | "sick" | "personal" | "unpaid" | "bereavement" | "other";

export type LeaveRequestRow = {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditEntityType = "timesheet" | "leave_request" | "employee";

export type AuditAction =
  | "created"
  | "updated"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "linked_auth_user";

export type AuditLogRow = {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NotificationType =
  | "timesheet_approved"
  | "timesheet_rejected"
  | "leave_approved"
  | "leave_rejected";

export type NotificationEntityType = "timesheet" | "leave_request";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: NotificationEntityType | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type ClientRequirementRow = {
  id: string;
  client_user_id: string | null;
  client_name: string;
  service_domain: string;
  service_needed: string;
  project_name: string;
  location: string;
  work_mode: string;
  required_start_date: string | null;
  expected_duration: string;
  required_skills: string;
  number_of_resources_needed: number;
  budget_rate_range: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type EmployerRequirementRow = {
  id: string;
  employer_user_id: string | null;
  employer_name: string;
  job_title: string;
  department: string;
  client_project: string;
  location: string;
  job_type: string;
  work_mode: string;
  experience_level: string;
  required_skills: string;
  responsibilities: string;
  number_of_openings: number;
  start_date: string | null;
  duration: string;
  rate_range: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ContactSubmissionRow = {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  service: string;
  message: string;
  status: "new" | "reviewed" | "closed";
  created_at: string;
};
