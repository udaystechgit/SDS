import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  type ClientRequirementInput,
  type ClientRequirementRecord,
  createClientRequirement,
  updateClientRequirement,
} from "@/lib/client-requirements";
import { getSupabaseServerClient } from "@/lib/supabase/server.server";
import type { ClientRequirementRow } from "@/lib/supabase/database.types";

const inputSchema = z.object({
  clientName: z.string(),
  serviceDomain: z.enum([
    "IT & AI Services",
    "Data Center & Infrastructure Services",
    "Operations Support",
  ]),
  serviceNeeded: z.string(),
  projectName: z.string(),
  location: z.string(),
  workMode: z.enum(["On-site", "Remote", "Hybrid"]),
  requiredStartDate: z.string(),
  expectedDuration: z.string(),
  requiredSkills: z.string(),
  numberOfResourcesNeeded: z.number(),
  budgetRateRange: z.string(),
  description: z.string(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  status: z.enum([
    "Draft",
    "Submitted",
    "Under Review",
    "Approved",
    "In Progress",
    "Completed",
    "Closed",
  ]),
});

const listSchema = z.object({});
const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  payload: inputSchema,
  ownerUserId: z.string().uuid().optional(),
});

function toModel(row: ClientRequirementRow): ClientRequirementRecord {
  return {
    id: row.id,
    clientName: row.client_name,
    serviceDomain: row.service_domain as ClientRequirementRecord["serviceDomain"],
    serviceNeeded: row.service_needed,
    projectName: row.project_name,
    location: row.location,
    workMode: row.work_mode as ClientRequirementRecord["workMode"],
    requiredStartDate: row.required_start_date ?? "",
    expectedDuration: row.expected_duration,
    requiredSkills: row.required_skills,
    numberOfResourcesNeeded: row.number_of_resources_needed,
    budgetRateRange: row.budget_rate_range,
    description: row.description,
    priority: row.priority as ClientRequirementRecord["priority"],
    status: row.status as ClientRequirementRecord["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: ClientRequirementInput, ownerUserId?: string | null) {
  return {
    client_user_id: ownerUserId ?? null,
    client_name: input.clientName,
    service_domain: input.serviceDomain,
    service_needed: input.serviceNeeded,
    project_name: input.projectName,
    location: input.location,
    work_mode: input.workMode,
    required_start_date: input.requiredStartDate || null,
    expected_duration: input.expectedDuration,
    required_skills: input.requiredSkills,
    number_of_resources_needed: input.numberOfResourcesNeeded,
    budget_rate_range: input.budgetRateRange,
    description: input.description,
    priority: input.priority,
    status: input.status,
  };
}

export const listClientRequirementsFn = createServerFn({ method: "POST" })
  .inputValidator(listSchema)
  .handler(async () => {
    const client = getSupabaseServerClient();
    if (!client) {
      return { configured: false as const, requirements: [] as ClientRequirementRecord[] };
    }

    const { data, error } = await client
      .from("client_requirements")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list client requirements: ${error.message}`);
    }

    return {
      configured: true as const,
      requirements: (data ?? []).map((row) => toModel(row as ClientRequirementRow)),
    };
  });

export const upsertClientRequirementFn = createServerFn({ method: "POST" })
  .inputValidator(upsertSchema)
  .handler(async ({ data }) => {
    const client = getSupabaseServerClient();
    if (!client) {
      return { configured: false as const, requirement: null as ClientRequirementRecord | null };
    }

    if (!data.id) {
      if (!data.ownerUserId) {
        throw new Error("Authenticated client user is required to create client requirements.");
      }

      const created = createClientRequirement(data.payload);
      const { data: inserted, error } = await client
        .from("client_requirements")
        .insert({
          id: created.id,
          ...toRow(data.payload, data.ownerUserId),
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to create client requirement: ${error.message}`);
      }

      return { configured: true as const, requirement: toModel(inserted as ClientRequirementRow) };
    }

    const { data: currentRow, error: currentError } = await client
      .from("client_requirements")
      .select("*")
      .eq("id", data.id)
      .single();

    if (currentError) {
      throw new Error(`Failed to load client requirement: ${currentError.message}`);
    }

    const currentModel = toModel(currentRow as ClientRequirementRow);
    const updated = updateClientRequirement(currentModel, data.payload);
    const currentOwnerUserId = (currentRow as ClientRequirementRow).client_user_id;

    if (!currentOwnerUserId && !data.ownerUserId) {
      throw new Error("Authenticated client user is required to update client requirements.");
    }

    const { data: updatedRow, error } = await client
      .from("client_requirements")
      .update(toRow(updated, currentOwnerUserId ?? data.ownerUserId ?? null))
      .eq("id", data.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update client requirement: ${error.message}`);
    }

    return { configured: true as const, requirement: toModel(updatedRow as ClientRequirementRow) };
  });
