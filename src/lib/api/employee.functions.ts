import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseStatus } from "@tanstack/react-start/server";

import { setNoStoreResponseHeaders } from "@/lib/api/http.server";
import { getSupabaseServerUserClient } from "@/lib/supabase/server.server";
import type { EmployeeRow } from "@/lib/supabase/database.types";
import type { EmployeeProfile } from "@/lib/types/employee";

export type EmployeeDashboardData = {
  pendingTimesheets: number;
  approvedTimesheets: number;
  leaveBalance: number;
  activeAssignments: number;
  currentAssignment: string;
  managerName: string;
  nextDue: string;
};

type CurrentEmployeeResult = {
  profile: EmployeeProfile;
};

function readBearerToken() {
  const authHeader = getRequestHeader("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function toEmployeeProfile(row: EmployeeRow): EmployeeProfile {
  return {
    id: row.id,
    employeeId: row.uid,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    department: row.service_domain,
    jobTitle: row.job_title,
    workLocation: row.work_location,
    status: row.status,
    managerName: "Not assigned",
    assignmentName: row.assigned_project || undefined,
    clientName: row.assigned_client || undefined,
    hireDate: row.start_date,
  };
}

async function loadCurrentEmployee() {
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

  const { data: row, error } = await client
    .from("employees")
    .select("*")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (error) {
    setResponseStatus(500);
    throw new Error(`Failed to load employee profile: ${error.message}`);
  }

  if (!row) {
    setResponseStatus(404);
    throw new Error("No employee profile is linked to this account.");
  }

  return row as EmployeeRow;
}

export const getCurrentEmployeeFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentEmployeeResult> => {
    setNoStoreResponseHeaders();

    const row = await loadCurrentEmployee();

    return { profile: toEmployeeProfile(row) };
  },
);

export const getEmployeeDashboardFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<EmployeeDashboardData> => {
    setNoStoreResponseHeaders();

    const row = await loadCurrentEmployee();
    const hasAssignment = Boolean(row.assigned_client || row.assigned_project);

    return {
      pendingTimesheets: 0,
      approvedTimesheets: 0,
      leaveBalance: 0,
      activeAssignments: hasAssignment ? 1 : 0,
      currentAssignment: row.assigned_project || row.assigned_client || "Not assigned",
      managerName: "Not assigned",
      nextDue: "No pending employee tasks",
    };
  },
);

export const getEmployeeProfileFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentEmployeeResult> => {
    setNoStoreResponseHeaders();

    const row = await loadCurrentEmployee();

    return { profile: toEmployeeProfile(row) };
  },
);
