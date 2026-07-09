import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

import { writeAuditEvent } from "@/lib/api/audit.server";
import { setNoStoreResponseHeaders } from "@/lib/api/http.server";
import { createNotification } from "@/lib/api/notification.server";
import { getSupabaseServerUserClient } from "@/lib/supabase/server.server";
import type { EmployeeRow, TimesheetEntryRow, TimesheetRow } from "@/lib/supabase/database.types";
import type {
  Timesheet,
  TimesheetEmployeeSummary,
  TimesheetEntry,
  TimesheetReviewStatus,
} from "@/lib/types/timesheet";

type TimesheetWithEntriesRow = TimesheetRow & {
  timesheet_entries?: TimesheetEntryRow[] | null;
  employees?: EmployeeRow | null;
};

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const timesheetEntryInputSchema = z.object({
  workDate: dateSchema,
  projectName: z.string().trim().max(160).optional(),
  taskDescription: z.string().trim().max(1_000).optional(),
  hours: z.number().min(0).max(24),
});

const createTimesheetInputSchema = z.object({
  weekStart: dateSchema,
  weekEnd: dateSchema,
  entries: z.array(timesheetEntryInputSchema).optional(),
});

const timesheetIdInputSchema = z.object({
  id: z.string().uuid(),
});

const rejectTimesheetInputSchema = z.object({
  id: z.string().uuid(),
  rejectionReason: z.string().trim().min(1).max(2_000),
});

const listTimesheetsForReviewInputSchema = z.object({
  status: z.enum(["submitted", "approved", "rejected"]).optional(),
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

function assertTimesheetTransition(
  currentStatus: TimesheetRow["status"],
  nextStatus: TimesheetRow["status"],
) {
  const isAllowed =
    (currentStatus === "draft" && nextStatus === "submitted") ||
    (currentStatus === "submitted" && nextStatus === "approved") ||
    (currentStatus === "submitted" && nextStatus === "rejected");

  if (!isAllowed) {
    setResponseStatus(409);
    throw new Error(`Invalid timesheet transition: ${currentStatus} -> ${nextStatus}.`);
  }
}

function toTimesheetEntry(row: TimesheetEntryRow): TimesheetEntry {
  return {
    id: row.id,
    timesheetId: row.timesheet_id,
    workDate: row.work_date,
    projectName: row.project_name,
    taskDescription: row.task_description,
    hours: Number(row.hours),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTimesheetEmployeeSummary(row: EmployeeRow): TimesheetEmployeeSummary {
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

function toTimesheet(row: TimesheetWithEntriesRow): Timesheet {
  const entries = (row.timesheet_entries ?? []).map((entry) =>
    toTimesheetEntry(entry as TimesheetEntryRow),
  );

  return {
    id: row.id,
    employeeId: row.employee_id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    status: row.status,
    totalHours: entries.reduce((total, entry) => total + entry.hours, 0),
    submittedAt: row.submitted_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entries,
    employee: row.employees ? toTimesheetEmployeeSummary(row.employees) : undefined,
  };
}

async function loadTimesheetById(
  client: ReturnType<typeof getSupabaseServerUserClient>,
  id: string,
  employeeId: string,
) {
  if (!client) {
    setResponseStatus(503);
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client
    .from("timesheets")
    .select("*, timesheet_entries(*), employees(*)")
    .eq("id", id)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) {
    setResponseStatus(500);
    throw new Error(`Failed to load timesheet: ${error.message}`);
  }

  if (!data) {
    setResponseStatus(404);
    throw new Error("Timesheet was not found.");
  }

  return toTimesheet(data as TimesheetWithEntriesRow);
}

async function loadTimesheetForStaff(
  client: ReturnType<typeof getSupabaseServerUserClient>,
  id: string,
) {
  if (!client) {
    setResponseStatus(503);
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client
    .from("timesheets")
    .select("*, timesheet_entries(*), employees(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    setResponseStatus(500);
    throw new Error(`Failed to load timesheet: ${error.message}`);
  }

  if (!data) {
    setResponseStatus(404);
    throw new Error("Timesheet was not found.");
  }

  return toTimesheet(data as TimesheetWithEntriesRow);
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

export const listMyTimesheetsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ timesheets: Timesheet[] }> => {
    setPrivateResponseHeaders();

    const { client, employee } = await getAuthenticatedEmployeeContext();
    const { data, error } = await client
      .from("timesheets")
      .select("*, timesheet_entries(*), employees(*)")
      .eq("employee_id", employee.id)
      .order("week_start", { ascending: false });

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to list timesheets: ${error.message}`);
    }

    return {
      timesheets: ((data ?? []) as TimesheetWithEntriesRow[]).map(toTimesheet),
    };
  },
);

export const getMyTimesheetFn = createServerFn({ method: "POST" })
  .validator(timesheetIdInputSchema)
  .handler(async ({ data }): Promise<{ timesheet: Timesheet }> => {
    setPrivateResponseHeaders();

    const { client, employee } = await getAuthenticatedEmployeeContext();
    const timesheet = await loadTimesheetById(client, data.id, employee.id);

    return { timesheet };
  });

export const createTimesheetFn = createServerFn({ method: "POST" })
  .validator(createTimesheetInputSchema)
  .handler(async ({ data }): Promise<{ timesheet: Timesheet }> => {
    setPrivateResponseHeaders();

    const { client, employee, userId } = await getAuthenticatedEmployeeContext();
    const { data: inserted, error } = await client
      .from("timesheets")
      .insert({
        employee_id: employee.id,
        week_start: data.weekStart,
        week_end: data.weekEnd,
        status: "draft",
        submitted_at: null,
      })
      .select("id")
      .single();

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to create timesheet: ${error.message}`);
    }

    const timesheetId = (inserted as Pick<TimesheetRow, "id">).id;
    const entryRows = (data.entries ?? []).map((entry) => ({
      timesheet_id: timesheetId,
      work_date: entry.workDate,
      project_name: entry.projectName ?? "",
      task_description: entry.taskDescription ?? "",
      hours: entry.hours,
    }));

    if (entryRows.length > 0) {
      const { error: entriesError } = await client.from("timesheet_entries").insert(entryRows);

      if (entriesError) {
        await client
          .from("timesheets")
          .delete()
          .eq("id", timesheetId)
          .eq("employee_id", employee.id);
        setResponseStatus(500);
        throw new Error(`Failed to create timesheet entries: ${entriesError.message}`);
      }
    }

    const timesheet = await loadTimesheetById(client, timesheetId, employee.id);

    await writeAuditEvent({
      entityType: "timesheet",
      entityId: timesheet.id,
      action: "created",
      actorUserId: userId,
      metadata: {
        employeeId: employee.id,
        weekStart: timesheet.weekStart,
        weekEnd: timesheet.weekEnd,
        entryCount: timesheet.entries.length,
      },
    });

    return { timesheet };
  });

export const submitTimesheetFn = createServerFn({ method: "POST" })
  .validator(timesheetIdInputSchema)
  .handler(async ({ data }): Promise<{ timesheet: Timesheet }> => {
    setPrivateResponseHeaders();

    const { client, employee, userId } = await getAuthenticatedEmployeeContext();
    const currentTimesheet = await loadTimesheetById(client, data.id, employee.id);

    assertTimesheetTransition(currentTimesheet.status, "submitted");

    const { data: updated, error } = await client
      .from("timesheets")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("employee_id", employee.id)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to submit timesheet: ${error.message}`);
    }

    if (!updated) {
      setResponseStatus(404);
      throw new Error("Draft timesheet was not found.");
    }

    const timesheet = await loadTimesheetById(client, data.id, employee.id);

    await writeAuditEvent({
      entityType: "timesheet",
      entityId: timesheet.id,
      action: "submitted",
      actorUserId: userId,
      metadata: {
        employeeId: employee.id,
        previousStatus: currentTimesheet.status,
        nextStatus: timesheet.status,
        totalHours: timesheet.totalHours,
        submittedAt: timesheet.submittedAt,
      },
    });

    return { timesheet };
  });

export const listSubmittedTimesheetsForApprovalFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ timesheets: Timesheet[] }> => {
    setPrivateResponseHeaders();

    const { client } = await getAuthenticatedStaffContext();
    const { data, error } = await client
      .from("timesheets")
      .select("*, timesheet_entries(*), employees(*)")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true });

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to list submitted timesheets: ${error.message}`);
    }

    return {
      timesheets: ((data ?? []) as TimesheetWithEntriesRow[]).map(toTimesheet),
    };
  },
);

export const listTimesheetsForReviewFn = createServerFn({ method: "POST" })
  .validator(listTimesheetsForReviewInputSchema)
  .handler(async ({ data }): Promise<{ timesheets: Timesheet[] }> => {
    setPrivateResponseHeaders();

    const { client } = await getAuthenticatedStaffContext();
    const status: TimesheetReviewStatus | undefined = data.status;
    let query = client
      .from("timesheets")
      .select("*, timesheet_entries(*), employees(*)")
      .in("status", ["submitted", "approved", "rejected"]);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: rows, error } = await query.order("submitted_at", {
      ascending: status === "submitted",
      nullsFirst: false,
    });

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to list timesheets for review: ${error.message}`);
    }

    return {
      timesheets: ((rows ?? []) as TimesheetWithEntriesRow[]).map(toTimesheet),
    };
  });

export const getTimesheetForApprovalFn = createServerFn({ method: "POST" })
  .validator(timesheetIdInputSchema)
  .handler(async ({ data }): Promise<{ timesheet: Timesheet }> => {
    setPrivateResponseHeaders();

    const { client } = await getAuthenticatedStaffContext();
    const timesheet = await loadTimesheetForStaff(client, data.id);

    return { timesheet };
  });

export const approveTimesheetFn = createServerFn({ method: "POST" })
  .validator(timesheetIdInputSchema)
  .handler(async ({ data }): Promise<{ timesheet: Timesheet }> => {
    setPrivateResponseHeaders();

    const { client, userId } = await getAuthenticatedStaffContext();
    const currentTimesheet = await loadTimesheetForStaff(client, data.id);

    assertTimesheetTransition(currentTimesheet.status, "approved");

    const { data: updated, error } = await client
      .from("timesheets")
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
      throw new Error(`Failed to approve timesheet: ${error.message}`);
    }

    if (!updated) {
      setResponseStatus(404);
      throw new Error("Submitted timesheet was not found.");
    }

    const timesheet = await loadTimesheetForStaff(client, data.id);

    await writeAuditEvent({
      entityType: "timesheet",
      entityId: timesheet.id,
      action: "approved",
      actorUserId: userId,
      metadata: {
        previousStatus: currentTimesheet.status,
        nextStatus: timesheet.status,
        totalHours: timesheet.totalHours,
        approvedAt: timesheet.approvedAt,
      },
    });

    const recipientUserId = await loadEmployeeAuthUserId(client, timesheet.employeeId);

    if (recipientUserId) {
      await createNotification({
        userId: recipientUserId,
        type: "timesheet_approved",
        title: "Timesheet approved",
        message: `Your timesheet for ${timesheet.weekStart} to ${timesheet.weekEnd} was approved.`,
        entityType: "timesheet",
        entityId: timesheet.id,
      });
    }

    return { timesheet };
  });

export const rejectTimesheetFn = createServerFn({ method: "POST" })
  .validator(rejectTimesheetInputSchema)
  .handler(async ({ data }): Promise<{ timesheet: Timesheet }> => {
    setPrivateResponseHeaders();

    const { client, userId } = await getAuthenticatedStaffContext();
    const currentTimesheet = await loadTimesheetForStaff(client, data.id);
    const rejectionReason = data.rejectionReason.trim();

    assertTimesheetTransition(currentTimesheet.status, "rejected");

    const { data: updated, error } = await client
      .from("timesheets")
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
      throw new Error(`Failed to reject timesheet: ${error.message}`);
    }

    if (!updated) {
      setResponseStatus(404);
      throw new Error("Submitted timesheet was not found.");
    }

    const timesheet = await loadTimesheetForStaff(client, data.id);

    await writeAuditEvent({
      entityType: "timesheet",
      entityId: timesheet.id,
      action: "rejected",
      actorUserId: userId,
      metadata: {
        previousStatus: currentTimesheet.status,
        nextStatus: timesheet.status,
        totalHours: timesheet.totalHours,
        rejectedAt: timesheet.rejectedAt,
        rejectionReason,
      },
    });

    const recipientUserId = await loadEmployeeAuthUserId(client, timesheet.employeeId);

    if (recipientUserId) {
      await createNotification({
        userId: recipientUserId,
        type: "timesheet_rejected",
        title: "Timesheet rejected",
        message: `Your timesheet for ${timesheet.weekStart} to ${timesheet.weekEnd} was rejected.`,
        entityType: "timesheet",
        entityId: timesheet.id,
      });
    }

    return { timesheet };
  });
