export type AppRole = "admin" | "staff" | "employer" | "client" | "employee";

export const ROLE_HOME_ROUTES: Record<AppRole, string> = {
  admin: "/admin",
  staff: "/admin",
  employer: "/employer",
  client: "/client",
  employee: "/employee",
};

const APP_ROLES = new Set<AppRole>(["admin", "staff", "employer", "client", "employee"]);

export function getHomeRouteForRole(role: AppRole): string {
  return ROLE_HOME_ROUTES[role];
}

export function isValidRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.has(value as AppRole);
}

export function normalizeRole(value: unknown): AppRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return isValidRole(normalized) ? normalized : null;
}
