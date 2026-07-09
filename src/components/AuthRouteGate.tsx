import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { getHomeRouteForRole } from "@/lib/auth-roles";
import { useAuth } from "@/lib/auth-context";
import { getRouteAccessMeta } from "@/lib/route-access";

export function AuthRouteGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role, session } = useAuth();
  const routeAccess = getRouteAccessMeta(location.pathname);

  const isPublicRoute = routeAccess?.public ?? false;
  const isAllowed = isPublicRoute || Boolean(role && routeAccess?.allowedRoles?.includes(role));

  useEffect(() => {
    if (isLoading || isPublicRoute) {
      return;
    }

    if (!session || !isAuthenticated) {
      void navigate({
        to: "/login",
        search: {
          redirectTo: location.pathname,
        },
      });
      return;
    }

    if (role && !isAllowed) {
      void navigate({ to: getHomeRouteForRole(role) });
    }
  }, [
    isAllowed,
    isAuthenticated,
    isLoading,
    isPublicRoute,
    location.pathname,
    navigate,
    role,
    session,
  ]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)] px-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 text-sm font-semibold text-[#0B3D91] shadow-sm">
          Loading secure workspace...
        </div>
      </div>
    );
  }

  if (!session || !isAuthenticated || !isAllowed) {
    return null;
  }

  return <>{children}</>;
}
