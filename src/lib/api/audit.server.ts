import { getSupabaseServerClient } from "@/lib/supabase/server.server";
import type { AuditAction, AuditEntityType } from "@/lib/types/audit";

export type WriteAuditEventInput = {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorUserId: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditEvent(input: WriteAuditEventInput) {
  const client = getSupabaseServerClient();

  if (!client) {
    throw new Error("Supabase service client is not configured for audit logging.");
  }

  const { error } = await client.from("audit_log").insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    actor_user_id: input.actorUserId,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to write audit event: ${error.message}`);
  }
}
