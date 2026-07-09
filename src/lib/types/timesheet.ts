export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";
export type TimesheetReviewStatus = Extract<TimesheetStatus, "submitted" | "approved" | "rejected">;

export type TimesheetEntry = {
  id: string;
  timesheetId: string;
  workDate: string;
  projectName: string;
  taskDescription: string;
  hours: number;
  createdAt: string;
  updatedAt: string;
};

export type TimesheetEmployeeSummary = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  assignedClient?: string;
  assignedProject?: string;
};

export type Timesheet = {
  id: string;
  employeeId: string;
  weekStart: string;
  weekEnd: string;
  status: TimesheetStatus;
  totalHours: number;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  entries: TimesheetEntry[];
  employee?: TimesheetEmployeeSummary;
};
