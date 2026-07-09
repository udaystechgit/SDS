import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  type EmployeeInput,
  type EmployeeRecord,
  createEmployee,
  updateEmployee,
} from "@/lib/employees";
import { requireAuthenticatedRole, requireServiceRoleClient } from "@/lib/api/auth.server";
import type { EmployeeRow } from "@/lib/supabase/database.types";

const employeeInputSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  jobTitle: z.string(),
  employeeType: z.enum(["Full-time", "Part-time", "Contractor", "Consultant", "Intern"]),
  assignedClient: z.string(),
  assignedProject: z.string(),
  serviceDomain: z.enum([
    "IT & AI Services",
    "Data Center & Infrastructure Services",
    "Operations",
    "Sales / Business Development",
    "Administration",
  ]),
  startDate: z.string(),
  endDate: z.string(),
  workMode: z.enum(["On-site", "Remote", "Hybrid"]),
  workLocation: z.string(),
  hourlyRate: z.string(),
  billingRate: z.string(),
  responsibilities: z.string(),
  requiredSkills: z.string(),
  status: z.enum(["Active", "Inactive", "On Hold", "Completed"]),
});

const listInputSchema = z.object({
  id: z.string().uuid().optional(),
});

const upsertInputSchema = z.object({
  id: z.string().uuid().optional(),
  payload: employeeInputSchema,
});

const deleteInputSchema = z.object({ id: z.string().uuid() });

function toModel(row: EmployeeRow): EmployeeRecord {
  return {
    id: row.id,
    uid: row.uid,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    jobTitle: row.job_title,
    employeeType: row.employee_type as EmployeeRecord["employeeType"],
    assignedClient: row.assigned_client,
    assignedProject: row.assigned_project,
    serviceDomain: row.service_domain as EmployeeRecord["serviceDomain"],
    startDate: row.start_date,
    endDate: row.end_date ?? "",
    workMode: row.work_mode as EmployeeRecord["workMode"],
    workLocation: row.work_location,
    hourlyRate: row.hourly_rate,
    billingRate: row.billing_rate,
    responsibilities: row.responsibilities,
    requiredSkills: row.required_skills,
    status: row.status as EmployeeRecord["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: EmployeeInput, uid?: string) {
  return {
    uid,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    job_title: input.jobTitle,
    employee_type: input.employeeType,
    assigned_client: input.assignedClient,
    assigned_project: input.assignedProject,
    service_domain: input.serviceDomain,
    start_date: input.startDate,
    end_date: input.endDate || null,
    work_mode: input.workMode,
    work_location: input.workLocation,
    hourly_rate: input.hourlyRate,
    billing_rate: input.billingRate,
    responsibilities: input.responsibilities,
    required_skills: input.requiredSkills,
    status: input.status,
  };
}

export const listEmployeesFn = createServerFn({ method: "POST" })
  .inputValidator(listInputSchema)
  .handler(async ({ data }) => {
    await requireAuthenticatedRole(["admin"]);
    const client = requireServiceRoleClient();

    let query = client.from("employees").select("*").order("updated_at", { ascending: false });
    if (data.id) {
      query = query.eq("id", data.id);
    }

    const { data: rows, error } = await query;
    if (error) {
      throw new Error("Failed to list employees.");
    }

    return {
      configured: true as const,
      employees: (rows ?? []).map((row) => toModel(row as EmployeeRow)),
    };
  });

export const upsertEmployeeFn = createServerFn({ method: "POST" })
  .inputValidator(upsertInputSchema)
  .handler(async ({ data }) => {
    await requireAuthenticatedRole(["admin"]);
    const client = requireServiceRoleClient();

    if (!data.id) {
      const created = createEmployee(data.payload);
      const { data: inserted, error } = await client
        .from("employees")
        .insert({ id: created.id, ...toRow(data.payload, created.uid) })
        .select("*")
        .single();

      if (error) {
        throw new Error("Failed to create employee.");
      }

      return { configured: true as const, employee: toModel(inserted as EmployeeRow) };
    }

    const { data: currentRow, error: currentError } = await client
      .from("employees")
      .select("*")
      .eq("id", data.id)
      .single();

    if (currentError) {
      throw new Error("Failed to load employee.");
    }

    const updated = updateEmployee(toModel(currentRow as EmployeeRow), data.payload);
    const { data: updatedRow, error } = await client
      .from("employees")
      .update(toRow(updated, updated.uid))
      .eq("id", data.id)
      .select("*")
      .single();

    if (error) {
      throw new Error("Failed to update employee.");
    }

    return { configured: true as const, employee: toModel(updatedRow as EmployeeRow) };
  });

export const deleteEmployeeFn = createServerFn({ method: "POST" })
  .inputValidator(deleteInputSchema)
  .handler(async ({ data }) => {
    await requireAuthenticatedRole(["admin"]);
    const client = requireServiceRoleClient();

    const { error } = await client.from("employees").delete().eq("id", data.id);
    if (error) {
      throw new Error("Failed to delete employee.");
    }

    return { configured: true as const };
  });
