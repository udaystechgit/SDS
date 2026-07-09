import { getSupabaseServerClient } from "@/lib/supabase/server.server";
import type { NotificationEntityType, NotificationType } from "@/lib/types/notification";

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  const client = getSupabaseServerClient();

  if (!client) {
    throw new Error("Supabase service client is not configured for notifications.");
  }

  const { error } = await client.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
  });

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
}
