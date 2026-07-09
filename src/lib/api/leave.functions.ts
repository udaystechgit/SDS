import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

import { writeAuditEvent } from "@/lib/api/audit.server";
import { setNoStoreResponseHeaders } from "@/lib/api/http.server";
import { createNotification } from "@/lib/api/notification.server";
import { getSupabaseServerUserClient } from "@/lib/supabase/server.server";
import type { EmployeeRow, LeaveRequestRow } from "@/lib/supabase/database.types";
import type {
  LeaveEmployeeSummary,
  LeaveRequest,
  LeaveReviewStatus,
  LeaveStatus,
} from "@/lib/types/leave";

type LeaveRequestWithEmployeeRow = LeaveRequestRow & {
  employees?: EmployeeRow | null;
};

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const leaveTypeSchema = z.enum(["annual", "sick", "personal", "unpaid", "bereavement", "other"]);

const leaveRequestIdInputSchema = z.object({
  id: z.string().uuid(),
});

const createLeaveRequestInputSchema = z.object({
  leaveType: leaveTypeSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  reason: z.string().trim().max(2_000).optional(),
});

const listLeaveRequestsForReviewInputSchema = z.object({
  status: z.enum(["submitted", "approved", "rejected"]).optional(),
});

const rejectLeaveRequestInputSchema = z.object({
  id: z.string().uuid(),
  rejectionReason: z.string().trim().min(1).max(2_000),
});

function readBearerToken() {
  const authHeader = getRequestHeader("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function setPrivateResponseHeaders() {
  setNoStoreResponseHeaders();
}

async function getAuthenticatedEmployeeContext() {
  const accessToken = readBearerToken();

  if (!accessToken) {
    setResponseStatus(401);
    throw new Error("Authentication is required.");
  }

  const client = getSupabaseServerUserClient(accessToken);

  if (!client) {
    setResponseStatus(503);
    throw new Error("Supabase is not configured.");
  }

  const { data: authData, error: authError } = await client.auth.getUser(accessToken);

  if (authError || !authData.user) {
    setResponseStatus(401);
    throw new Error("Authentication session is invalid or expired.");
  }

  const { data: employee, error } = await client
    .from("employees")
    .select("*")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (error) {
    setResponseStatus(500);
    throw new Error(`Failed to load employee identity: ${error.message}`);
  }

  if (!employee) {
    setResponseStatus(404);
    throw new Error("No employee profile is linked to this account.");
  }

  return {
    client,
    employee: employee as EmployeeRow,
    userId: authData.user.id,
  };
}

async function getAuthenticatedStaffContext() {
  const accessToken = readBearerToken();

  if (!accessToken) {
    setResponseStatus(401);
    throw new Error("Authentication is required.");
  }

  const client = getSupabaseServerUserClient(accessToken);

  if (!client) {
    setResponseStatus(503);
    throw new Error("Supabase is not configured.");
  }

  const { data: authData, error: authError } = await client.auth.getUser(accessToken);

  if (authError || !authData.user) {
    setResponseStatus(401);
    throw new Error("Authentication session is invalid or expired.");
  }

  const role = authData.user.app_metadata?.role;

  if (role !== "admin" && role !== "staff") {
    setResponseStatus(403);
    throw new Error("Admin or staff access is required.");
  }

  return {
    client,
    userId: authData.user.id,
  };
}

function assertLeaveTransition(currentStatus: LeaveStatus, nextStatus: LeaveStatus) {
  const isAllowed =
    (currentStatus === "draft" && nextStatus === "submitted") ||
    (currentStatus === "submitted" && nextStatus === "approved") ||
    (currentStatus === "submitted" && nextStatus === "rejected") ||
    ((currentStatus === "draft" || currentStatus === "submitted") && nextStatus === "cancelled");

  if (!isAllowed) {
    setResponseStatus(409);
    throw new Error(`Invalid leave request transition: ${currentStatus} -> ${nextStatus}.`);
  }
}

function calculateTotalDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;

  if (!Number.isFinite(totalDays) || totalDays <= 0) {
    setResponseStatus(400);
    throw new Error("Leave end date must be on or after the start date.");
  }

  return totalDays;
}

function toLeaveEmployeeSummary(row: EmployeeRow): LeaveEmployeeSummary {
  return {
    id: row.id,
    employeeId: row.uid,
    fullName: row.full_name,
    email: row.email,
    jobTitle: row.job_title,
    department: row.service_domain,
    assignedClient: row.assigned_client || undefined,
    assignedProject: row.assigned_project || undefined,
  };
}

function toLeaveRequest(row: LeaveRequestWithEmployeeRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    totalDays: Number(row.total_days),
    reason: row.reason,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    employee: row.employees ? toLeaveEmployeeSummary(row.employees) : undefined,
  };
}

async function loadOwnLeaveRequestById(
  client: ReturnType<typeof getSupabaseServerUserClient>,
  id: string,
  employeeId: string,
) {
  if (!client) {
    setResponseStatus(503);
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client
    .from("leave_requests")
    .select("*, employees(*)")
    .eq("id", id)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) {
    setResponseStatus(500);
    throw new Error(`Failed to load leave request: ${error.message}`);
  }

  if (!data) {
    setResponseStatus(404);
    throw new Error("Leave request was not found.");
  }

  return toLeaveRequest(data as LeaveRequestWithEmployeeRow);
}

async function loadLeaveRequestForStaff(
  client: ReturnType<typeof getSupabaseServerUserClient>,
  id: string,
) {
  if (!client) {
    setResponseStatus(503);
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client
    .from("leave_requests")
    .select("*, employees(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    setResponseStatus(500);
    throw new Error(`Failed to load leave request: ${error.message}`);
  }

  if (!data) {
    setResponseStatus(404);
    throw new Error("Leave request was not found.");
  }

  return toLeaveRequest(data as LeaveRequestWithEmployeeRow);
}

async function loadEmployeeAuthUserId(
  client: ReturnType<typeof getSupabaseServerUserClient>,
  employeeId: string,
) {
  if (!client) {
    setResponseStatus(503);
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client
    .from("employees")
    .select("auth_user_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    setResponseStatus(500);
    throw new Error(`Failed to load notification recipient: ${error.message}`);
  }

  return (data as Pick<EmployeeRow, "auth_user_id"> | null)?.auth_user_id ?? null;
}

export const listMyLeaveRequestsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ leaveRequests: LeaveRequest[] }> => {
    setPrivateResponseHeaders();

    const { client, employee } = await getAuthenticatedEmployeeContext();
    const { data, error } = await client
      .from("leave_requests")
      .select("*, employees(*)")
      .eq("employee_id", employee.id)
      .order("start_date", { ascending: false });

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to list leave requests: ${error.message}`);
    }

    return {
      leaveRequests: ((data ?? []) as LeaveRequestWithEmployeeRow[]).map(toLeaveRequest),
    };
  },
);

export const getMyLeaveRequestFn = createServerFn({ method: "POST" })
  .validator(leaveRequestIdInputSchema)
  .handler(async ({ data }): Promise<{ leaveRequest: LeaveRequest }> => {
    setPrivateResponseHeaders();

    const { client, employee } = await getAuthenticatedEmployeeContext();
    const leaveRequest = await loadOwnLeaveRequestById(client, data.id, employee.id);

    return { leaveRequest };
  });

export const createLeaveRequestFn = createServerFn({ method: "POST" })
  .validator(createLeaveRequestInputSchema)
  .handler(async ({ data }): Promise<{ leaveRequest: LeaveRequest }> => {
    setPrivateResponseHeaders();

    const { client, employee, userId } = await getAuthenticatedEmployeeContext();
    const totalDays = calculateTotalDays(data.startDate, data.endDate);
    const { data: inserted, error } = await client
      .from("leave_requests")
      .insert({
        employee_id: employee.id,
        leave_type: data.leaveType,
        start_date: data.startDate,
        end_date: data.endDate,
        total_days: totalDays,
        reason: data.reason?.trim() || null,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to create leave request: ${error.message}`);
    }

    const leaveRequest = await loadOwnLeaveRequestById(
      client,
      (inserted as Pick<LeaveRequestRow, "id">).id,
      employee.id,
    );

    await writeAuditEvent({
      entityType: "leave_request",
      entityId: leaveRequest.id,
      action: "created",
      actorUserId: userId,
      metadata: {
        employeeId: employee.id,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
      },
    });

    return { leaveRequest };
  });

export const submitLeaveRequestFn = createServerFn({ method: "POST" })
  .validator(leaveRequestIdInputSchema)
  .handler(async ({ data }): Promise<{ leaveRequest: LeaveRequest }> => {
    setPrivateResponseHeaders();

    const { client, employee, userId } = await getAuthenticatedEmployeeContext();
    const currentLeaveRequest = await loadOwnLeaveRequestById(client, data.id, employee.id);

    assertLeaveTransition(currentLeaveRequest.status, "submitted");

    const { data: updated, error } = await client
      .from("leave_requests")
      .update({
        status: "submitted",
      })
      .eq("id", data.id)
      .eq("employee_id", employee.id)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to submit leave request: ${error.message}`);
    }

    if (!updated) {
      setResponseStatus(404);
      throw new Error("Draft leave request was not found.");
    }

    const leaveRequest = await loadOwnLeaveRequestById(client, data.id, employee.id);

    await writeAuditEvent({
      entityType: "leave_request",
      entityId: leaveRequest.id,
      action: "submitted",
      actorUserId: userId,
      metadata: {
        employeeId: employee.id,
        previousStatus: currentLeaveRequest.status,
        nextStatus: leaveRequest.status,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
      },
    });

    return { leaveRequest };
  });

export const cancelLeaveRequestFn = createServerFn({ method: "POST" })
  .validator(leaveRequestIdInputSchema)
  .handler(async ({ data }): Promise<{ leaveRequest: LeaveRequest }> => {
    setPrivateResponseHeaders();

    const { client, employee, userId } = await getAuthenticatedEmployeeContext();
    const currentLeaveRequest = await loadOwnLeaveRequestById(client, data.id, employee.id);

    assertLeaveTransition(currentLeaveRequest.status, "cancelled");

    const { data: updated, error } = await client
      .from("leave_requests")
      .update({
        status: "cancelled",
      })
      .eq("id", data.id)
      .eq("employee_id", employee.id)
      .in("status", ["draft", "submitted"])
      .select("id")
      .maybeSingle();

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to cancel leave request: ${error.message}`);
    }

    if (!updated) {
      setResponseStatus(404);
      throw new Error("Cancellable leave request was not found.");
    }

    const leaveRequest = await loadOwnLeaveRequestById(client, data.id, employee.id);

    await writeAuditEvent({
      entityType: "leave_request",
      entityId: leaveRequest.id,
      action: "cancelled",
      actorUserId: userId,
      metadata: {
        employeeId: employee.id,
        previousStatus: currentLeaveRequest.status,
        nextStatus: leaveRequest.status,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
      },
    });

    return { leaveRequest };
  });

export const listLeaveRequestsForReviewFn = createServerFn({ method: "POST" })
  .validator(listLeaveRequestsForReviewInputSchema)
  .handler(async ({ data }): Promise<{ leaveRequests: LeaveRequest[] }> => {
    setPrivateResponseHeaders();

    const { client } = await getAuthenticatedStaffContext();
    const status: LeaveReviewStatus | undefined = data.status;
    let query = client
      .from("leave_requests")
      .select("*, employees(*)")
      .in("status", ["submitted", "approved", "rejected"]);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: rows, error } = await query.order("updated_at", {
      ascending: status === "submitted",
    });

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to list leave requests for review: ${error.message}`);
    }

    return {
      leaveRequests: ((rows ?? []) as LeaveRequestWithEmployeeRow[]).map(toLeaveRequest),
    };
  });

export const getLeaveRequestForReviewFn = createServerFn({ method: "POST" })
  .validator(leaveRequestIdInputSchema)
  .handler(async ({ data }): Promise<{ leaveRequest: LeaveRequest }> => {
    setPrivateResponseHeaders();

    const { client } = await getAuthenticatedStaffContext();
    const leaveRequest = await loadLeaveRequestForStaff(client, data.id);

    return { leaveRequest };
  });

export const approveLeaveRequestFn = createServerFn({ method: "POST" })
  .validator(leaveRequestIdInputSchema)
  .handler(async ({ data }): Promise<{ leaveRequest: LeaveRequest }> => {
    setPrivateResponseHeaders();

    const { client, userId } = await getAuthenticatedStaffContext();
    const currentLeaveRequest = await loadLeaveRequestForStaff(client, data.id);

    assertLeaveTransition(currentLeaveRequest.status, "approved");

    const { data: updated, error } = await client
      .from("leave_requests")
      .update({
        status: "approved",
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      })
      .eq("id", data.id)
      .eq("status", "submitted")
      .select("id")
      .maybeSingle();

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to approve leave request: ${error.message}`);
    }

    if (!updated) {
      setResponseStatus(404);
      throw new Error("Submitted leave request was not found.");
    }

    const leaveRequest = await loadLeaveRequestForStaff(client, data.id);

    await writeAuditEvent({
      entityType: "leave_request",
      entityId: leaveRequest.id,
      action: "approved",
      actorUserId: userId,
      metadata: {
        previousStatus: currentLeaveRequest.status,
        nextStatus: leaveRequest.status,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
        approvedAt: leaveRequest.approvedAt,
      },
    });

    const recipientUserId = await loadEmployeeAuthUserId(client, leaveRequest.employeeId);

    if (recipientUserId) {
      await createNotification({
        userId: recipientUserId,
        type: "leave_approved",
        title: "Leave request approved",
        message: `Your ${leaveRequest.leaveType} leave request for ${leaveRequest.startDate} to ${leaveRequest.endDate} was approved.`,
        entityType: "leave_request",
        entityId: leaveRequest.id,
      });
    }

    return { leaveRequest };
  });

export const rejectLeaveRequestFn = createServerFn({ method: "POST" })
  .validator(rejectLeaveRequestInputSchema)
  .handler(async ({ data }): Promise<{ leaveRequest: LeaveRequest }> => {
    setPrivateResponseHeaders();

    const { client, userId } = await getAuthenticatedStaffContext();
    const currentLeaveRequest = await loadLeaveRequestForStaff(client, data.id);
    const rejectionReason = data.rejectionReason.trim();

    assertLeaveTransition(currentLeaveRequest.status, "rejected");

    const { data: updated, error } = await client
      .from("leave_requests")
      .update({
        status: "rejected",
        approved_by: null,
        approved_at: null,
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq("id", data.id)
      .eq("status", "submitted")
      .select("id")
      .maybeSingle();

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to reject leave request: ${error.message}`);
    }

    if (!updated) {
      setResponseStatus(404);
      throw new Error("Submitted leave request was not found.");
    }

    const leaveRequest = await loadLeaveRequestForStaff(client, data.id);

    await writeAuditEvent({
      entityType: "leave_request",
      entityId: leaveRequest.id,
      action: "rejected",
      actorUserId: userId,
      metadata: {
        previousStatus: currentLeaveRequest.status,
        nextStatus: leaveRequest.status,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
        rejectedAt: leaveRequest.rejectedAt,
        rejectionReason,
      },
    });

    const recipientUserId = await loadEmployeeAuthUserId(client, leaveRequest.employeeId);

    if (recipientUserId) {
      await createNotification({
        userId: recipientUserId,
        type: "leave_rejected",
        title: "Leave request rejected",
        message: `Your ${leaveRequest.leaveType} leave request for ${leaveRequest.startDate} to ${leaveRequest.endDate} was rejected.`,
        entityType: "leave_request",
        entityId: leaveRequest.id,
      });
    }

    return { leaveRequest };
  });
