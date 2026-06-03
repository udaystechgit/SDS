export const TIMESHEETS_STORAGE_KEY = "sds_timesheets";

export type TimesheetStatus = "Draft" | "Submitted" | "Approved" | "Rejected";
export type ApprovalStageStatus = "Pending" | "Approved" | "Rejected";
export type ApprovalRole = "employer" | "client" | "admin";

export interface TimesheetRecord {
  id: string;
  employeeUID: string;
  employeeName: string;
  client: string;
  project: string;
  weekStartDate: string;
  weekEndDate: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  totalHours: number;
  workSummary: string;
  blockers: string;
  status: TimesheetStatus;
  submittedDate: string;
  approvedBy: string;
  approvedDate: string;
  employerApprovalStatus: ApprovalStageStatus;
  employerReviewedBy: string;
  employerReviewedDate: string;
  clientApprovalStatus: ApprovalStageStatus;
  clientReviewedBy: string;
  clientReviewedDate: string;
  adminApprovalStatus: ApprovalStageStatus;
  adminReviewedBy: string;
  adminReviewedDate: string;
  createdAt: string;
  updatedAt: string;
}

export type TimesheetInput = Omit<
  TimesheetRecord,
  "id" | "totalHours" | "submittedDate" | "approvedBy" | "approvedDate" | "createdAt" | "updatedAt"
>;

function isClient() {
  return typeof window !== "undefined";
}

function calculateTotalHours(
  monday: number,
  tuesday: number,
  wednesday: number,
  thursday: number,
  friday: number,
  saturday: number,
  sunday: number,
): number {
  return monday + tuesday + wednesday + thursday + friday + saturday + sunday;
}

function normalizeLegacyStageStatus(
  status: TimesheetStatus,
  current?: ApprovalStageStatus,
): ApprovalStageStatus {
  if (current) return current;
  if (status === "Approved") return "Approved";
  if (status === "Rejected") return "Rejected";
  return "Pending";
}

function deriveOverallStatus(record: TimesheetRecord): TimesheetStatus {
  if (
    record.status === "Draft" &&
    !record.submittedDate &&
    record.employerApprovalStatus === "Pending" &&
    record.clientApprovalStatus === "Pending" &&
    record.adminApprovalStatus === "Pending"
  ) {
    return "Draft";
  }

  if (
    record.employerApprovalStatus === "Rejected" ||
    record.clientApprovalStatus === "Rejected" ||
    record.adminApprovalStatus === "Rejected"
  ) {
    return "Rejected";
  }

  if (
    record.employerApprovalStatus === "Approved" &&
    record.clientApprovalStatus === "Approved" &&
    record.adminApprovalStatus === "Approved"
  ) {
    return "Approved";
  }

  return "Submitted";
}

function normalizeTimesheetRecord(raw: Partial<TimesheetRecord>): TimesheetRecord {
  const status = (raw.status as TimesheetStatus | undefined) ?? "Draft";
  const employerApprovalStatus = normalizeLegacyStageStatus(status, raw.employerApprovalStatus);
  const clientApprovalStatus = normalizeLegacyStageStatus(status, raw.clientApprovalStatus);
  const adminApprovalStatus = normalizeLegacyStageStatus(status, raw.adminApprovalStatus);

  const record: TimesheetRecord = {
    id: raw.id ?? crypto.randomUUID(),
    employeeUID: raw.employeeUID ?? "",
    employeeName: raw.employeeName ?? "",
    client: raw.client ?? "",
    project: raw.project ?? "",
    weekStartDate: raw.weekStartDate ?? "",
    weekEndDate: raw.weekEndDate ?? "",
    monday: raw.monday ?? 0,
    tuesday: raw.tuesday ?? 0,
    wednesday: raw.wednesday ?? 0,
    thursday: raw.thursday ?? 0,
    friday: raw.friday ?? 0,
    saturday: raw.saturday ?? 0,
    sunday: raw.sunday ?? 0,
    totalHours:
      raw.totalHours ??
      calculateTotalHours(
        raw.monday ?? 0,
        raw.tuesday ?? 0,
        raw.wednesday ?? 0,
        raw.thursday ?? 0,
        raw.friday ?? 0,
        raw.saturday ?? 0,
        raw.sunday ?? 0,
      ),
    workSummary: raw.workSummary ?? "",
    blockers: raw.blockers ?? "",
    status,
    submittedDate: raw.submittedDate ?? "",
    approvedBy: raw.approvedBy ?? "",
    approvedDate: raw.approvedDate ?? "",
    employerApprovalStatus,
    employerReviewedBy: raw.employerReviewedBy ?? "",
    employerReviewedDate: raw.employerReviewedDate ?? "",
    clientApprovalStatus,
    clientReviewedBy: raw.clientReviewedBy ?? "",
    clientReviewedDate: raw.clientReviewedDate ?? "",
    adminApprovalStatus,
    adminReviewedBy: raw.adminReviewedBy ?? "",
    adminReviewedDate: raw.adminReviewedDate ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };

  return {
    ...record,
    status: deriveOverallStatus(record),
  };
}

export function readTimesheets(): TimesheetRecord[] {
  if (!isClient()) return [];

  try {
    const raw = window.localStorage.getItem(TIMESHEETS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => normalizeTimesheetRecord(item as Partial<TimesheetRecord>));
  } catch {
    return [];
  }
}

export function saveTimesheets(timesheets: TimesheetRecord[]) {
  if (!isClient()) return;
  window.localStorage.setItem(TIMESHEETS_STORAGE_KEY, JSON.stringify(timesheets));
}

export function createTimesheet(input: TimesheetInput): TimesheetRecord {
  const nowIso = new Date().toISOString();
  const totalHours = calculateTotalHours(
    input.monday,
    input.tuesday,
    input.wednesday,
    input.thursday,
    input.friday,
    input.saturday,
    input.sunday,
  );

  return normalizeTimesheetRecord({
    ...input,
    id: crypto.randomUUID(),
    totalHours,
    submittedDate: input.status === "Submitted" ? nowIso : "",
    approvedBy: "",
    approvedDate: "",
    employerApprovalStatus: "Pending",
    employerReviewedBy: "",
    employerReviewedDate: "",
    clientApprovalStatus: "Pending",
    clientReviewedBy: "",
    clientReviewedDate: "",
    adminApprovalStatus: "Pending",
    adminReviewedBy: "",
    adminReviewedDate: "",
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}

export function updateTimesheet(
  current: TimesheetRecord,
  patch: Partial<TimesheetInput>,
): TimesheetRecord {
  const nowIso = new Date().toISOString();
  const totalHours = calculateTotalHours(
    patch.monday ?? current.monday,
    patch.tuesday ?? current.tuesday,
    patch.wednesday ?? current.wednesday,
    patch.thursday ?? current.thursday,
    patch.friday ?? current.friday,
    patch.saturday ?? current.saturday,
    patch.sunday ?? current.sunday,
  );

  const nextStatus = patch.status ?? current.status;
  const isSubmitting = current.status === "Draft" && nextStatus === "Submitted";
  const nextSubmittedDate = isSubmitting ? nowIso : current.submittedDate;

  const updated = {
    ...current,
    ...patch,
    status: nextStatus,
    totalHours,
    submittedDate: nextSubmittedDate,
    updatedAt: nowIso,
  };

  return normalizeTimesheetRecord(updated);
}

export function approveTimesheet(
  current: TimesheetRecord,
  approvedBy: string,
): TimesheetRecord {
  return approveTimesheetByRole(current, "admin", approvedBy);
}

export function rejectTimesheet(
  current: TimesheetRecord,
): TimesheetRecord {
  return rejectTimesheetByRole(current, "admin", "Admin");
}

export function approveTimesheetByRole(
  current: TimesheetRecord,
  role: ApprovalRole,
  actor: string,
): TimesheetRecord {
  const nowIso = new Date().toISOString();
  const next = { ...current, updatedAt: nowIso };

  if (role === "employer") {
    next.employerApprovalStatus = "Approved";
    next.employerReviewedBy = actor;
    next.employerReviewedDate = nowIso;
  }

  if (role === "client") {
    next.clientApprovalStatus = "Approved";
    next.clientReviewedBy = actor;
    next.clientReviewedDate = nowIso;
  }

  if (role === "admin") {
    next.adminApprovalStatus = "Approved";
    next.adminReviewedBy = actor;
    next.adminReviewedDate = nowIso;
  }

  const normalized = normalizeTimesheetRecord(next);
  if (normalized.status === "Approved") {
    return {
      ...normalized,
      approvedBy: actor,
      approvedDate: nowIso,
    };
  }

  return normalized;
}

export function rejectTimesheetByRole(
  current: TimesheetRecord,
  role: ApprovalRole,
  actor: string,
  reason?: string,
): TimesheetRecord {
  const nowIso = new Date().toISOString();
  const next = { ...current, updatedAt: nowIso };

  if (role === "employer") {
    next.employerApprovalStatus = "Rejected";
    next.employerReviewedBy = actor;
    next.employerReviewedDate = nowIso;
  }

  if (role === "client") {
    next.clientApprovalStatus = "Rejected";
    next.clientReviewedBy = actor;
    next.clientReviewedDate = nowIso;
  }

  if (role === "admin") {
    next.adminApprovalStatus = "Rejected";
    next.adminReviewedBy = actor;
    next.adminReviewedDate = nowIso;
  }

  const reasonText = reason?.trim();
  if (reasonText) {
    const prefix = role.charAt(0).toUpperCase() + role.slice(1);
    next.blockers = `${next.blockers ? `${next.blockers}\n` : ""}${prefix} Rejection: ${reasonText}`;
  }

  return normalizeTimesheetRecord({
    ...next,
    approvedBy: "",
    approvedDate: "",
  });
}

export function getTimesheetsByEmployeeUID(uid: string): TimesheetRecord[] {
  return readTimesheets()
    .filter((ts) => ts.employeeUID === uid)
    .sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1));
}

export function getPendingTimesheets(): TimesheetRecord[] {
  return readTimesheets()
    .filter((ts) => ts.status === "Submitted" && ts.adminApprovalStatus === "Pending")
    .sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1));
}
