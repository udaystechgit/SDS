import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

import { setNoStoreResponseHeaders } from "@/lib/api/http.server";
import { getSupabaseServerUserClient } from "@/lib/supabase/server.server";
import type { NotificationRow } from "@/lib/supabase/database.types";
import type { Notification } from "@/lib/types/notification";

const notificationIdInputSchema = z.object({
  id: z.string().uuid(),
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

async function getAuthenticatedUserContext() {
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

  return {
    client,
    userId: authData.user.id,
  };
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export const listMyNotificationsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ notifications: Notification[] }> => {
    setPrivateResponseHeaders();

    const { client, userId } = await getAuthenticatedUserContext();
    const { data, error } = await client
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to list notifications: ${error.message}`);
    }

    return {
      notifications: ((data ?? []) as NotificationRow[]).map(toNotification),
    };
  },
);

export const markNotificationReadFn = createServerFn({ method: "POST" })
  .validator(notificationIdInputSchema)
  .handler(async ({ data }): Promise<{ notification: Notification }> => {
    setPrivateResponseHeaders();

    const { client, userId } = await getAuthenticatedUserContext();
    const { data: updated, error } = await client
      .from("notifications")
      .update({ is_read: true })
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to mark notification read: ${error.message}`);
    }

    if (!updated) {
      setResponseStatus(404);
      throw new Error("Notification was not found.");
    }

    return {
      notification: toNotification(updated as NotificationRow),
    };
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ updated: number }> => {
    setPrivateResponseHeaders();

    const { client, userId } = await getAuthenticatedUserContext();
    const { data, error } = await client
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select("id");

    if (error) {
      setResponseStatus(500);
      throw new Error(`Failed to mark notifications read: ${error.message}`);
    }

    return {
      updated: data?.length ?? 0,
    };
  },
);
