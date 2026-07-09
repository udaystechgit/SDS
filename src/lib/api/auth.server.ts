import { getRequestHeader, setResponseStatus } from "@tanstack/react-start/server";

import { setNoStoreResponseHeaders } from "@/lib/api/http.server";
import type { AppRole } from "@/lib/auth-roles";
import { getSupabaseServerClient, getSupabaseServerUserClient } from "@/lib/supabase/server.server";

type AuthenticatedContext = {
  accessToken: string;
  role: AppRole;
  userId: string;
};

const APP_ROLES: readonly AppRole[] = ["admin", "staff", "employer", "client", "employee"];

function readBearerToken() {
  const authHeader = getRequestHeader("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && APP_ROLES.includes(role as AppRole);
}

export async function requireAuthenticatedRole(
  allowedRoles: readonly AppRole[],
): Promise<AuthenticatedContext> {
  setNoStoreResponseHeaders();

  const accessToken = readBearerToken();

  if (!accessToken) {
    setResponseStatus(401);
    throw new Error("Authentication is required.");
  }

  const userClient = getSupabaseServerUserClient(accessToken);

  if (!userClient) {
    setResponseStatus(503);
    throw new Error("Service is not configured.");
  }

  const { data, error } = await userClient.auth.getUser(accessToken);

  if (error || !data.user) {
    setResponseStatus(401);
    throw new Error("Authentication session is invalid or expired.");
  }

  const role = data.user.app_metadata?.role;

  if (!isAppRole(role) || !allowedRoles.includes(role)) {
    setResponseStatus(403);
    throw new Error("You do not have permission to perform this action.");
  }

  return {
    accessToken,
    role,
    userId: data.user.id,
  };
}

export function requireServiceRoleClient() {
  const client = getSupabaseServerClient();

  if (!client) {
    setResponseStatus(503);
    throw new Error("Service is not configured.");
  }

  return client;
}
