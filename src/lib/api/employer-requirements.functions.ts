import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  type EmployerRequirementInput,
  type EmployerRequirementRecord,
  createEmployerRequirement,
  updateEmployerRequirement,
} from "@/lib/employer-requirements";
import { requireAuthenticatedRole, requireServiceRoleClient } from "@/lib/api/auth.server";
import type { EmployerRequirementRow } from "@/lib/supabase/database.types";

const inputSchema = z.object({
  employerName: z.string(),
  jobTitle: z.string(),
  department: z.string(),
  clientProject: z.string(),
  location: z.string(),
  jobType: z.string(),
  workMode: z.enum(["On-site", "Remote", "Hybrid"]),
  experienceLevel: z.string(),
  requiredSkills: z.string(),
  responsibilities: z.string(),
  numberOfOpenings: z.number(),
  startDate: z.string(),
  duration: z.string(),
  rateRange: z.string(),
  status: z.enum(["Draft", "Submitted", "Approved by Admin", "Published", "Closed"]),
});

const listSchema = z.object({});
const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  payload: inputSchema,
});

function toModel(row: EmployerRequirementRow): EmployerRequirementRecord {
  return {
    id: row.id,
    employerName: row.employer_name,
    jobTitle: row.job_title,
    department: row.department,
    clientProject: row.client_project,
    location: row.location,
    jobType: row.job_type,
    workMode: row.work_mode as EmployerRequirementRecord["workMode"],
    experienceLevel: row.experience_level,
    requiredSkills: row.required_skills,
    responsibilities: row.responsibilities,
    numberOfOpenings: row.number_of_openings,
    startDate: row.start_date ?? "",
    duration: row.duration,
    rateRange: row.rate_range,
    status: row.status as EmployerRequirementRecord["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: EmployerRequirementInput, ownerUserId?: string | null) {
  return {
    employer_user_id: ownerUserId ?? null,
    employer_name: input.employerName,
    job_title: input.jobTitle,
    department: input.department,
    client_project: input.clientProject,
    location: input.location,
    job_type: input.jobType,
    work_mode: input.workMode,
    experience_level: input.experienceLevel,
    required_skills: input.requiredSkills,
    responsibilities: input.responsibilities,
    number_of_openings: input.numberOfOpenings,
    start_date: input.startDate || null,
    duration: input.duration,
    rate_range: input.rateRange,
    status: input.status,
  };
}

export const listEmployerRequirementsFn = createServerFn({ method: "POST" })
  .inputValidator(listSchema)
  .handler(async () => {
    const auth = await requireAuthenticatedRole(["admin", "employer"]);
    const client = requireServiceRoleClient();

    let query = client
      .from("employer_requirements")
      .select("*")
      .order("updated_at", { ascending: false });

    if (auth.role === "employer") {
      query = query.eq("employer_user_id", auth.userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error("Failed to list employer requirements.");
    }

    return {
      configured: true as const,
      requirements: (data ?? []).map((row) => toModel(row as EmployerRequirementRow)),
    };
  });

export const upsertEmployerRequirementFn = createServerFn({ method: "POST" })
  .inputValidator(upsertSchema)
  .handler(async ({ data }) => {
    const auth = await requireAuthenticatedRole(["admin", "employer"]);
    const client = requireServiceRoleClient();
    const ownerUserId = auth.role === "employer" ? auth.userId : null;

    if (!data.id) {
      if (!ownerUserId) {
        setResponseStatus(400);
        throw new Error("Authenticated employer user is required to create employer requirements.");
      }

      const created = createEmployerRequirement(data.payload);
      const { data: inserted, error } = await client
        .from("employer_requirements")
        .insert({
          id: created.id,
          ...toRow(data.payload, ownerUserId),
        })
        .select("*")
        .single();

      if (error) {
        throw new Error("Failed to create employer requirement.");
      }

      return {
        configured: true as const,
        requirement: toModel(inserted as EmployerRequirementRow),
      };
    }

    const { data: currentRow, error: currentError } = await client
      .from("employer_requirements")
      .select("*")
      .eq("id", data.id)
      .single();

    if (currentError) {
      throw new Error("Failed to load employer requirement.");
    }

    if (!currentRow) {
      setResponseStatus(404);
      throw new Error("Employer requirement was not found.");
    }

    const currentModel = toModel(currentRow as EmployerRequirementRow);
    const updated = updateEmployerRequirement(currentModel, data.payload);
    const currentOwnerUserId = (currentRow as EmployerRequirementRow).employer_user_id;

    if (auth.role === "employer" && currentOwnerUserId !== auth.userId) {
      setResponseStatus(403);
      throw new Error("You do not have permission to update this employer requirement.");
    }

    const { data: updatedRow, error } = await client
      .from("employer_requirements")
      .update(toRow(updated, currentOwnerUserId))
      .eq("id", data.id)
      .select("*")
      .single();

    if (error) {
      throw new Error("Failed to update employer requirement.");
    }

    return {
      configured: true as const,
      requirement: toModel(updatedRow as EmployerRequirementRow),
    };
  });
