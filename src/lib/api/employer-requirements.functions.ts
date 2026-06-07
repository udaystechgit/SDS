import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  type EmployerRequirementInput,
  type EmployerRequirementRecord,
  createEmployerRequirement,
  updateEmployerRequirement,
} from "@/lib/employer-requirements";
import { getSupabaseServerClient } from "@/lib/supabase/server.server";
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
  ownerUserId: z.string().uuid().optional(),
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
    const client = getSupabaseServerClient();
    if (!client) {
      return { configured: false as const, requirements: [] as EmployerRequirementRecord[] };
    }

    const { data, error } = await client
      .from("employer_requirements")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list employer requirements: ${error.message}`);
    }

    return {
      configured: true as const,
      requirements: (data ?? []).map((row) => toModel(row as EmployerRequirementRow)),
    };
  });

export const upsertEmployerRequirementFn = createServerFn({ method: "POST" })
  .inputValidator(upsertSchema)
  .handler(async ({ data }) => {
    const client = getSupabaseServerClient();
    if (!client) {
      return { configured: false as const, requirement: null as EmployerRequirementRecord | null };
    }

    if (!data.id) {
      if (!data.ownerUserId) {
        throw new Error("Authenticated employer user is required to create employer requirements.");
      }

      const created = createEmployerRequirement(data.payload);
      const { data: inserted, error } = await client
        .from("employer_requirements")
        .insert({
          id: created.id,
          ...toRow(data.payload, data.ownerUserId),
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to create employer requirement: ${error.message}`);
      }

      return { configured: true as const, requirement: toModel(inserted as EmployerRequirementRow) };
    }

    const { data: currentRow, error: currentError } = await client
      .from("employer_requirements")
      .select("*")
      .eq("id", data.id)
      .single();

    if (currentError) {
      throw new Error(`Failed to load employer requirement: ${currentError.message}`);
    }

    const currentModel = toModel(currentRow as EmployerRequirementRow);
    const updated = updateEmployerRequirement(currentModel, data.payload);
    const currentOwnerUserId = (currentRow as EmployerRequirementRow).employer_user_id;

    if (!currentOwnerUserId && !data.ownerUserId) {
      throw new Error("Authenticated employer user is required to update employer requirements.");
    }

    const { data: updatedRow, error } = await client
      .from("employer_requirements")
      .update(toRow(updated, currentOwnerUserId ?? data.ownerUserId ?? null))
      .eq("id", data.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update employer requirement: ${error.message}`);
    }

    return { configured: true as const, requirement: toModel(updatedRow as EmployerRequirementRow) };
  });
