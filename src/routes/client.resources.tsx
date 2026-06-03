import { createFileRoute } from "@tanstack/react-router";
import { InternalPortalNav } from "@/components/InternalPortalNav";
import { PortalBanner } from "@/components/PortalBanner";
import { readEmployees } from "@/lib/employees";

export const Route = createFileRoute("/client/resources")({
  component: ClientResourcesPage,
});

function ClientResourcesPage() {
  const employees = readEmployees();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="client" />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PortalBanner extraMessage="Client login and secure billing access will be added in backend phase." />

        <div>
          <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">Client Resources</h1>
          <p className="mt-1 text-slate-600">Assigned SDS employees and contractors for your projects.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                <th className="py-3">Employee UID</th>
                <th className="py-3">Name</th>
                <th className="py-3">Role</th>
                <th className="py-3">Project</th>
                <th className="py-3">Start Date</th>
                <th className="py-3">Work Mode</th>
                <th className="py-3">Status</th>
                <th className="py-3">Responsibilities</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-500">No assigned resources found.</td></tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-[#E5E7EB]/70 align-top">
                    <td className="py-3 font-mono text-xs font-semibold text-[#1DA1F2]">{employee.uid}</td>
                    <td className="py-3 font-medium text-slate-900">{employee.fullName}</td>
                    <td className="py-3">{employee.jobTitle}</td>
                    <td className="py-3">{employee.assignedProject || "-"}</td>
                    <td className="py-3">{employee.startDate || "-"}</td>
                    <td className="py-3">{employee.workMode}</td>
                    <td className="py-3"><span className="rounded-full bg-[#1DA1F2]/10 px-2 py-1 text-xs text-[#0B3D91]">{employee.status}</span></td>
                    <td className="py-3 max-w-[280px] whitespace-pre-wrap text-slate-700">{employee.responsibilities || "-"}</td>
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
