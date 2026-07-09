export type LeaveStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled";
export type LeaveReviewStatus = Extract<LeaveStatus, "submitted" | "approved" | "rejected">;
export type LeaveType = "annual" | "sick" | "personal" | "unpaid" | "bereavement" | "other";

export type LeaveEmployeeSummary = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  assignedClient?: string;
  assignedProject?: string;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: LeaveEmployeeSummary;
};
