import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  type ClientRequirementInput,
  type ClientRequirementRecord,
  createClientRequirement,
  updateClientRequirement,
} from "@/lib/client-requirements";
import { requireAuthenticatedRole, requireServiceRoleClient } from "@/lib/api/auth.server";
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
    const auth = await requireAuthenticatedRole(["admin", "client"]);
    const client = requireServiceRoleClient();

    let query = client
      .from("client_requirements")
      .select("*")
      .order("updated_at", { ascending: false });

    if (auth.role === "client") {
      query = query.eq("client_user_id", auth.userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error("Failed to list client requirements.");
    }

    return {
      configured: true as const,
      requirements: (data ?? []).map((row) => toModel(row as ClientRequirementRow)),
    };
  });

export const upsertClientRequirementFn = createServerFn({ method: "POST" })
  .inputValidator(upsertSchema)
  .handler(async ({ data }) => {
    const auth = await requireAuthenticatedRole(["admin", "client"]);
    const client = requireServiceRoleClient();
    const ownerUserId = auth.role === "client" ? auth.userId : null;

    if (!data.id) {
      if (!ownerUserId) {
        setResponseStatus(400);
        throw new Error("Authenticated client user is required to create client requirements.");
      }

      const created = createClientRequirement(data.payload);
      const { data: inserted, error } = await client
        .from("client_requirements")
        .insert({
          id: created.id,
          ...toRow(data.payload, ownerUserId),
        })
        .select("*")
        .single();

      if (error) {
        throw new Error("Failed to create client requirement.");
      }

      return { configured: true as const, requirement: toModel(inserted as ClientRequirementRow) };
    }

    const { data: currentRow, error: currentError } = await client
      .from("client_requirements")
      .select("*")
      .eq("id", data.id)
      .single();

    if (currentError) {
      throw new Error("Failed to load client requirement.");
    }

    if (!currentRow) {
      setResponseStatus(404);
      throw new Error("Client requirement was not found.");
    }

    const currentModel = toModel(currentRow as ClientRequirementRow);
    const updated = updateClientRequirement(currentModel, data.payload);
    const currentOwnerUserId = (currentRow as ClientRequirementRow).client_user_id;

    if (auth.role === "client" && currentOwnerUserId !== auth.userId) {
      setResponseStatus(403);
      throw new Error("You do not have permission to update this client requirement.");
    }

    const { data: updatedRow, error } = await client
      .from("client_requirements")
      .update(toRow(updated, currentOwnerUserId))
      .eq("id", data.id)
      .select("*")
      .single();

    if (error) {
      throw new Error("Failed to update client requirement.");
    }

    return { configured: true as const, requirement: toModel(updatedRow as ClientRequirementRow) };
  });
