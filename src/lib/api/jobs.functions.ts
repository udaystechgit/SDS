import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  type JobRequirement,
  type JobRequirementInput,
  createJobRequirement,
  updateJobRequirement,
} from "@/lib/jobs";
import { getSupabaseServerClient } from "@/lib/supabase/server.server";
import type { JobRequirementRow } from "@/lib/supabase/database.types";

const serviceDomains = [
  "IT & AI Services",
  "Data Center & Infrastructure Services",
  "Operations",
  "Sales / Business Development",
  "Administration",
] as const;

const jobTypes = ["Full-time", "Part-time", "Contract", "Internship", "Temporary"] as const;
const experienceLevels = ["Entry Level", "Mid Level", "Senior Level", "Lead / Manager"] as const;
const workModes = ["On-site", "Remote", "Hybrid"] as const;
const statuses = ["Draft", "Published", "Closed"] as const;

const jobInputSchema = z.object({
  jobTitle: z.string(),
  department: z.string(),
  serviceDomain: z.enum(serviceDomains),
  location: z.string(),
  jobType: z.enum(jobTypes),
  experienceLevel: z.enum(experienceLevels),
  workMode: z.enum(workModes),
  shortDescription: z.string(),
  responsibilities: z.string(),
  requirementsSkills: z.string(),
  salaryRange: z.string(),
  applicationEmail: z.string(),
  status: z.enum(statuses),
});

const jobSchema = jobInputSchema.extend({
  id: z.string().uuid(),
  postedDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const listInputSchema = z.object({
  onlyPublished: z.boolean().optional(),
});

const upsertInputSchema = z.object({
  id: z.string().uuid().optional(),
  payload: jobInputSchema,
});

const deleteInputSchema = z.object({
  id: z.string().uuid(),
});

function toRow(input: JobRequirementInput, postedDate: string | null) {
  return {
    job_title: input.jobTitle,
    department: input.department,
    service_domain: input.serviceDomain,
    location: input.location,
    job_type: input.jobType,
    experience_level: input.experienceLevel,
    work_mode: input.workMode,
    short_description: input.shortDescription,
    responsibilities: input.responsibilities,
    requirements_skills: input.requirementsSkills,
    salary_range: input.salaryRange,
    application_email: input.applicationEmail,
    status: input.status,
    posted_date: postedDate,
  };
}

function toModel(row: JobRequirementRow): JobRequirement {
  return {
    id: row.id,
    jobTitle: row.job_title,
    department: row.department,
    serviceDomain: row.service_domain as JobRequirement["serviceDomain"],
    location: row.location,
    jobType: row.job_type as JobRequirement["jobType"],
    experienceLevel: row.experience_level as JobRequirement["experienceLevel"],
    workMode: row.work_mode as JobRequirement["workMode"],
    shortDescription: row.short_description,
    responsibilities: row.responsibilities,
    requirementsSkills: row.requirements_skills,
    salaryRange: row.salary_range,
    applicationEmail: row.application_email,
    status: row.status as JobRequirement["status"],
    postedDate: row.posted_date ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const listJobRequirementsFn = createServerFn({ method: "POST" })
  .inputValidator(listInputSchema)
  .handler(async ({ data }) => {
    const client = getSupabaseServerClient();
    if (!client) {
      return { configured: false as const, jobs: [] as JobRequirement[] };
    }

    let query = client
      .from("job_requirements")
      .select("*")
      .order("updated_at", { ascending: false });

    if (data.onlyPublished) {
      query = query.eq("status", "Published").order("posted_date", { ascending: false });
    }

    const { data: rows, error } = await query;
    if (error) {
      throw new Error(`Failed to list job requirements: ${error.message}`);
    }

    return {
      configured: true as const,
      jobs: (rows ?? []).map((row) => toModel(row as JobRequirementRow)),
    };
  });

export const upsertJobRequirementFn = createServerFn({ method: "POST" })
  .inputValidator(upsertInputSchema)
  .handler(async ({ data }) => {
    const client = getSupabaseServerClient();
    if (!client) {
      return { configured: false as const, job: null as JobRequirement | null };
    }

    if (!data.id) {
      const createdModel = createJobRequirement(data.payload);
      const { data: inserted, error } = await client
        .from("job_requirements")
        .insert({
          id: createdModel.id,
          ...toRow(data.payload, createdModel.postedDate || null),
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to create job requirement: ${error.message}`);
      }

      return {
        configured: true as const,
        job: toModel(inserted as JobRequirementRow),
      };
    }

    const { data: currentRow, error: currentError } = await client
      .from("job_requirements")
      .select("*")
      .eq("id", data.id)
      .single();

    if (currentError) {
      throw new Error(`Failed to load existing requirement: ${currentError.message}`);
    }

    const updatedModel = updateJobRequirement(toModel(currentRow as JobRequirementRow), data.payload);
    const { data: updatedRow, error } = await client
      .from("job_requirements")
      .update(toRow(updatedModel, updatedModel.postedDate || null))
      .eq("id", data.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update job requirement: ${error.message}`);
    }

    return {
      configured: true as const,
      job: toModel(updatedRow as JobRequirementRow),
    };
  });

export const deleteJobRequirementFn = createServerFn({ method: "POST" })
  .inputValidator(deleteInputSchema)
  .handler(async ({ data }) => {
    const client = getSupabaseServerClient();
    if (!client) {
      return { configured: false as const };
    }

    const { error } = await client
      .from("job_requirements")
      .delete()
      .eq("id", data.id);

    if (error) {
      throw new Error(`Failed to delete job requirement: ${error.message}`);
    }

    return { configured: true as const };
  });

export type JobRequirementDto = z.infer<typeof jobSchema>;
