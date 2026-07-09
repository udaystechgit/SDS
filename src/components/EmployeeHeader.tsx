import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { getCurrentEmployeeFn } from "@/lib/api/employee.functions";
import type { EmployeeProfile } from "@/lib/types/employee";

type EmployeeHeaderProps = {
  employee?: Pick<EmployeeProfile, "employeeId" | "fullName" | "department" | "assignmentName">;
};

export function EmployeeHeader({ employee: providedEmployee }: EmployeeHeaderProps) {
  const navigate = useNavigate();
  const { logout, session } = useAuth();
  const [employee, setEmployee] = useState<Pick<
    EmployeeProfile,
    "employeeId" | "fullName" | "department" | "assignmentName"
  > | null>(providedEmployee ?? null);
  const [statusMessage, setStatusMessage] = useState(
    providedEmployee ? "" : "Loading employee profile...",
  );

  useEffect(() => {
    if (providedEmployee) {
      setEmployee(providedEmployee);
      setStatusMessage("");
      return undefined;
    }

    let mounted = true;

    async function loadEmployee() {
      setStatusMessage("Loading employee profile...");

      try {
        if (!session?.access_token) {
          throw new Error("Authentication is required.");
        }

        const result = await getCurrentEmployeeFn({
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (mounted) {
          setEmployee(result.profile);
          setStatusMessage("");
        }
      } catch (error) {
        if (mounted) {
          setEmployee(null);
          setStatusMessage(
            error instanceof Error ? error.message : "Unable to load employee profile.",
          );
        }
      }
    }

    void loadEmployee();

    return () => {
      mounted = false;
    };
  }, [providedEmployee, session?.access_token]);

  async function onLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <section className="border-b border-[#E5E7EB] bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1DA1F2]">
            Employee Self-Service
          </p>
          {employee ? (
            <>
              <h1 className="mt-1 text-2xl font-heading font-bold text-[#0B3D91]">
                {employee.fullName}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                <span className="rounded-full border border-[#E5E7EB] bg-slate-50 px-3 py-1">
                  {employee.employeeId}
                </span>
                <span className="rounded-full border border-[#E5E7EB] bg-slate-50 px-3 py-1">
                  {employee.department}
                </span>
                {employee.assignmentName ? (
                  <span className="rounded-full border border-[#E5E7EB] bg-slate-50 px-3 py-1">
                    {employee.assignmentName}
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm font-medium text-slate-600">{statusMessage}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void onLogout()}
          className="inline-flex w-full items-center justify-center rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-[#0B3D91] transition hover:bg-[#1DA1F2]/10 sm:w-auto"
        >
          Logout
        </button>
      </div>
    </section>
  );
}
