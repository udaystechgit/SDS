import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { AdminNav } from "@/components/AdminNav";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import { getEmployeeById } from "@/lib/employees";
import { getTimesheetsByEmployeeUID } from "@/lib/timesheets";

export const Route = createFileRoute("/admin/employees/$id")({
  component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
  const { id } = Route.useParams();
  const employee = getEmployeeById(id);
  const timesheets = employee ? getTimesheetsByEmployeeUID(employee.uid) : [];
  const [uidCopied, setUidCopied] = useState(false);

  if (!employee) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
        <AdminNav />
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <InternalAccessBanner area="admin" />
          <Link to="/admin/employees" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1DA1F2] hover:gap-3 transition-all">
            <ChevronLeft className="h-4 w-4" />
            Back to Employees
          </Link>
          <div className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center">
            <p className="text-slate-600">Employee not found.</p>
          </div>
        </section>
      </main>
    );
  }

  function copyUID() {
    navigator.clipboard.writeText(employee.uid);
    setUidCopied(true);
    setTimeout(() => setUidCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <InternalAccessBanner area="admin" />
        <Link to="/admin/employees" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1DA1F2] hover:gap-3 transition-all">
          <ChevronLeft className="h-4 w-4" />
          Back to Employees
        </Link>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-[#0B3D91]">{employee.fullName}</h1>
              <p className="mt-1 text-slate-600">{employee.jobTitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-[#E5E7EB] bg-slate-50 px-3 py-2 text-sm font-mono font-bold text-[#0B3D91]">
                {employee.uid}
              </div>
              <button
                onClick={copyUID}
                className="rounded-lg border border-[#E5E7EB] p-2 text-[#0B3D91] hover:bg-[#1DA1F2]/10 transition"
              >
                <Copy className="h-4 w-4" />
              </button>
              <span className={`text-xs font-semibold transition-opacity ${uidCopied ? "opacity-100" : "opacity-0"}`}>
                Copied!
              </span>
            </div>
          </div>

          <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            employee.status === "Active"
              ? "bg-green-100 text-green-700"
              : employee.status === "Inactive"
              ? "bg-slate-100 text-slate-700"
              : employee.status === "On Hold"
              ? "bg-orange-100 text-orange-700"
              : "bg-slate-200 text-slate-700"
          }`}>
            {employee.status}
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Basic Information">
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Phone" value={employee.phone || "-"} />
            <InfoRow label="Employee Type" value={employee.employeeType} />
            <InfoRow label="Service Domain" value={employee.serviceDomain} />
          </Card>

          <Card title="Assignment Details">
            <InfoRow label="Assigned Client" value={employee.assignedClient || "-"} />
            <InfoRow label="Assigned Project" value={employee.assignedProject} />
            <InfoRow label="Work Mode" value={employee.workMode} />
            <InfoRow label="Work Location" value={employee.workLocation || "-"} />
          </Card>

          <Card title="Job Particulars">
            <InfoRow label="Job Title" value={employee.jobTitle} />
            <InfoRow label="Start Date" value={formatDate(employee.startDate)} />
            <InfoRow label="End Date" value={employee.endDate ? formatDate(employee.endDate) : "-"} />
            <InfoRow label="Status" value={employee.status} />
          </Card>

          <Card title="Rate Information">
            <InfoRow label="Hourly Rate" value={employee.hourlyRate || "-"} />
            <InfoRow label="Billing Rate" value={employee.billingRate || "-"} />
          </Card>
        </div>

        <Card title="Responsibilities">
          <p className="text-slate-700 whitespace-pre-wrap">{employee.responsibilities || "No responsibilities specified."}</p>
        </Card>

        <Card title="Required Skills">
          <p className="text-slate-700">{employee.requiredSkills || "No skills specified."}</p>
        </Card>

        <Card title="Timesheet Summary">
          {timesheets.length === 0 ? (
            <p className="text-slate-600 text-sm">No timesheets submitted yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-[#E5E7EB] bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">Total Timesheets</p>
                  <p className="mt-1 text-2xl font-bold text-[#0B3D91]">{timesheets.length}</p>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">Approved</p>
                  <p className="mt-1 text-2xl font-bold text-green-600">{timesheets.filter(ts => ts.status === "Approved").length}</p>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">Total Hours</p>
                  <p className="mt-1 text-2xl font-bold text-[#1DA1F2]">{timesheets.reduce((sum, ts) => sum + ts.totalHours, 0)}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card title="Recent Timesheets">
          {timesheets.length === 0 ? (
            <p className="text-slate-600 text-sm">No timesheets submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {timesheets.slice(0, 5).map((ts) => (
                <div key={ts.id} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatDate(ts.weekStartDate)} to {formatDate(ts.weekEndDate)}
                    </p>
                    <p className="text-xs text-slate-500">{ts.totalHours} hours</p>
                  </div>
                  <StatusBadge status={ts.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex gap-3">
          <Link
            to={`/admin/employees/${employee.id}/edit`}
            className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-16px_rgba(11,61,145,0.8)] hover:opacity-95"
          >
            Edit Employee
          </Link>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] px-5 py-2.5 text-sm font-semibold text-[#0B3D91] hover:bg-[#1DA1F2]/10">
            <Plus className="h-4 w-4" />
            Add Timesheet
          </button>
        </div>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
      <h2 className="text-lg font-heading font-bold text-[#0B3D91]">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-600">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-700",
    Submitted: "bg-orange-100 text-orange-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${styles[status]} border-current border-opacity-30`}>{status}</span>;
}

function formatDate(isoString: string) {
  if (!isoString) return "-";
  const d = new Date(isoString + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
