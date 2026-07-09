import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

import { setNoStoreResponseHeaders } from "@/lib/api/http.server";
import { getSupabaseServerUserClient } from "@/lib/supabase/server.server";
import type { AuditLogRow } from "@/lib/supabase/database.types";
import type { AuditEvent, AuditMetadataValue } from "@/lib/types/audit";

const auditEntityTypeSchema = z.enum(["timesheet", "leave_request", "employee"]);
const auditActionSchema = z.enum([
  "created",
  "updated",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
  "linked_auth_user",
]);

const listAuditEventsInputSchema = z.object({
  entityType: auditEntityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  action: auditActionSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
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

function toAuditMetadata(value: unknown): { [key: string]: AuditMetadataValue } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as { [key: string]: AuditMetadataValue };
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
  };
}

function toAuditEvent(row: AuditLogRow): AuditEvent {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actorUserId: row.actor_user_id,
    metadata: toAuditMetadata(row.metadata),
    createdAt: row.created_at,
  };
}

export const listAuditEventsForEntity = createServerFn({ method: "POST" })
  .validator(listAuditEventsInputSchema)
  .handler(async ({ data }): Promise<{ events: AuditEvent[] }> => {
    setPrivateResponseHeaders();

    const { client } = await getAuthenticatedStaffContext();
    let query = client
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);

    if (data.entityType) {
      query = query.eq("entity_type", data.entityType);
    }

    if (data.entityId) {
      query = query.eq("entity_id", data.entityId);
    }

    if (data.action) {
      query = query.eq("action", data.action);
    }

    const { data: rows, error } = await query;

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to list audit events: ${error.message}`);
    }

    return {
      events: ((rows ?? []) as AuditLogRow[]).map(toAuditEvent),
    };
  });
