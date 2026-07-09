import { createFileRoute, Outlet } from "@tanstack/react-router";

import { EmployeeHeader } from "@/components/EmployeeHeader";
import { InternalPortalNav } from "@/components/InternalPortalNav";

export const Route = createFileRoute("/employee")({
  component: EmployeeLayout,
});

function EmployeeLayout() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="employee" />
      <EmployeeHeader />
      <Outlet />
    </main>
  );
}
