import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { InternalPortalNav } from "@/components/InternalPortalNav";
import { PortalBanner } from "@/components/PortalBanner";
import { readEmployees } from "@/lib/employees";

export const Route = createFileRoute("/employer/candidates")({
  component: EmployerCandidatesPage,
});

function EmployerCandidatesPage() {
  const employees = readEmployees();

  const rows = useMemo(
    () =>
      employees.map((employee) => ({
        uid: employee.uid,
        name: employee.fullName,
        role: employee.jobTitle,
        skills: employee.requiredSkills || "-",
        level: employee.employeeType,
        project: employee.assignedProject || "-",
        status:
          employee.status === "Active"
            ? "Active"
            : employee.status === "Completed"
              ? "Selected"
              : employee.status === "On Hold"
                ? "Shortlisted"
                : "Submitted",
      })),
    [employees],
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="employer" />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PortalBanner extraMessage="Employer access protection will be added in backend phase." />
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">
            Employer Candidates / Resources
          </h1>
          <p className="mt-1 text-slate-600">Review candidate and resource pipeline status.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                <th className="py-3">UID</th>
                <th className="py-3">Name</th>
                <th className="py-3">Role</th>
                <th className="py-3">Skills</th>
                <th className="py-3">Experience Level</th>
                <th className="py-3">Assigned Project</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No candidates/resources found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.uid} className="border-b border-[#E5E7EB]/70">
                    <td className="py-3 font-mono text-xs font-semibold text-[#1DA1F2]">
                      {row.uid}
                    </td>
                    <td className="py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="py-3">{row.role}</td>
                    <td className="py-3">{row.skills}</td>
                    <td className="py-3">{row.level}</td>
                    <td className="py-3">{row.project}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-[#1DA1F2]/10 px-2 py-1 text-xs text-[#0B3D91]">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
