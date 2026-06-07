import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pencil, Trash2, ToggleRight, Users } from "lucide-react";
import { AdminNav } from "@/components/AdminNav";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import {
  type EmployeeRecord,
  type EmployeeInput,
  type EmployeeType,
  type ServiceDomain,
  type WorkMode,
  type EmployeeStatus,
  createEmployee,
  readEmployees,
  saveEmployees,
  updateEmployee,
} from "@/lib/employees";
import {
  deleteEmployeeFn,
  listEmployeesFn,
  upsertEmployeeFn,
} from "@/lib/api/employees.functions";

export const Route = createFileRoute("/admin/employees")({
  component: EmployeeManagementPage,
});

const employeeTypes: EmployeeType[] = ["Full-time", "Part-time", "Contractor", "Consultant", "Intern"];
const serviceDomains: ServiceDomain[] = [
  "IT & AI Services",
  "Data Center & Infrastructure Services",
  "Operations",
  "Sales / Business Development",
  "Administration",
];
const workModes: WorkMode[] = ["On-site", "Remote", "Hybrid"];
const statusOptions: EmployeeStatus[] = ["Active", "Inactive", "On Hold", "Completed"];

type FormErrors = Partial<Record<keyof EmployeeInput, string>>;

const emptyForm: EmployeeInput = {
  fullName: "",
  email: "",
  phone: "",
  jobTitle: "",
  employeeType: "Full-time",
  assignedClient: "",
  assignedProject: "",
  serviceDomain: "IT & AI Services",
  startDate: "",
  endDate: "",
  workMode: "On-site",
  workLocation: "",
  hourlyRate: "",
  billingRate: "",
  responsibilities: "",
  requiredSkills: "",
  status: "Active",
};

function EmployeeManagementPage() {
  const location = useLocation();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [form, setForm] = useState<EmployeeInput>(emptyForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | EmployeeStatus>("All");
  const [serviceDomainFilter, setServiceDomainFilter] = useState<"All" | ServiceDomain>("All");
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<"All" | EmployeeType>("All");
  const [pendingDeleteEmployee, setPendingDeleteEmployee] = useState<EmployeeRecord | null>(null);

  useEffect(() => {
    void loadEmployees();
  }, []);

  const editingEmployee = useMemo(
    () => employees.find((emp) => emp.id === editingEmployeeId) ?? null,
    [employees, editingEmployeeId],
  );

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchesSearch =
        q.length === 0 ||
        emp.fullName.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.jobTitle.toLowerCase().includes(q) ||
        emp.assignedClient.toLowerCase().includes(q) ||
        emp.assignedProject.toLowerCase().includes(q) ||
        emp.uid.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || emp.status === statusFilter;
      const matchesDomain = serviceDomainFilter === "All" || emp.serviceDomain === serviceDomainFilter;
      const matchesType = employeeTypeFilter === "All" || emp.employeeType === employeeTypeFilter;

      return matchesSearch && matchesStatus && matchesDomain && matchesType;
    });
  }, [employees, searchQuery, statusFilter, serviceDomainFilter, employeeTypeFilter]);

  if (location.pathname !== "/admin/employees") {
    return <Outlet />;
  }

  function setField<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateForm(values: EmployeeInput) {
    const nextErrors: FormErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!values.fullName.trim()) nextErrors.fullName = "Full Name is required.";
    if (!values.email.trim()) nextErrors.email = "Email is required.";
    if (values.email && !emailPattern.test(values.email.trim())) nextErrors.email = "Please enter a valid email address.";
    if (!values.jobTitle.trim()) nextErrors.jobTitle = "Job Title is required.";
    if (!values.employeeType.trim()) nextErrors.employeeType = "Employee Type is required.";
    if (!values.assignedProject.trim()) nextErrors.assignedProject = "Assigned Project is required.";
    if (!values.serviceDomain.trim()) nextErrors.serviceDomain = "Service Domain is required.";
    if (!values.startDate.trim()) nextErrors.startDate = "Start Date is required.";
    if (!values.status.trim()) nextErrors.status = "Status is required.";

    return nextErrors;
  }

  function commitEmployees(nextEmployees: EmployeeRecord[]) {
    setEmployees(nextEmployees);
    saveEmployees(nextEmployees);
  }

  async function loadEmployees() {
    try {
      const result = await listEmployeesFn({ data: {} });
      if (result.configured) {
        setEmployees(result.employees);
        saveEmployees(result.employees);
        return;
      }
    } catch {
      // Fall through to local cache.
    }

    setEmployees(readEmployees());
  }

  function resetForm() {
    setForm(emptyForm);
    setErrors({});
    setEditingEmployeeId(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    try {
      const result = await upsertEmployeeFn({
        data: {
          id: editingEmployeeId ?? undefined,
          payload: {
            ...form,
            email: form.email.trim().toLowerCase(),
          },
        },
      });

      if (result.configured && result.employee) {
        const nextEmployees = editingEmployeeId
          ? employees.map((emp) => (emp.id === result.employee!.id ? result.employee! : emp))
          : [result.employee, ...employees];
        commitEmployees(nextEmployees);
        setMessage(
          editingEmployeeId
            ? "Employee updated successfully."
            : `Employee added successfully. UID: ${result.employee.uid}`,
        );
        resetForm();
        return;
      }
    } catch {
      // Fall back to local update flow.
    }

    const created = createEmployee({
      ...form,
      email: form.email.trim().toLowerCase(),
    });
    const nextEmployees = [created, ...employees];
    commitEmployees(nextEmployees);
    setMessage(`Employee added successfully. UID: ${created.uid}`);
    resetForm();
  }

  function onEdit(emp: EmployeeRecord) {
    setEditingEmployeeId(emp.id);
    setForm({
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone,
      jobTitle: emp.jobTitle,
      employeeType: emp.employeeType,
      assignedClient: emp.assignedClient,
      assignedProject: emp.assignedProject,
      serviceDomain: emp.serviceDomain,
      startDate: emp.startDate,
      endDate: emp.endDate,
      workMode: emp.workMode,
      workLocation: emp.workLocation,
      hourlyRate: emp.hourlyRate,
      billingRate: emp.billingRate,
      responsibilities: emp.responsibilities,
      requiredSkills: emp.requiredSkills,
      status: emp.status,
    });
    setErrors({});
    setMessage("");
  }

  async function onDelete(employeeId: string) {
    try {
      const result = await deleteEmployeeFn({ data: { id: employeeId } });
      if (result.configured) {
        const nextEmployees = employees.filter((emp) => emp.id !== employeeId);
        commitEmployees(nextEmployees);
      } else {
        const nextEmployees = employees.filter((emp) => emp.id !== employeeId);
        commitEmployees(nextEmployees);
      }
    } catch {
      const nextEmployees = employees.filter((emp) => emp.id !== employeeId);
      commitEmployees(nextEmployees);
    }

    if (editingEmployeeId === employeeId) resetForm();
    setPendingDeleteEmployee(null);
    setMessage("Employee deleted successfully.");
  }

  async function onToggleStatus(emp: EmployeeRecord) {
    const nextStatus: EmployeeStatus = emp.status === "Active" ? "Inactive" : "Active";

    try {
      const result = await upsertEmployeeFn({
        data: {
          id: emp.id,
          payload: {
            fullName: emp.fullName,
            email: emp.email,
            phone: emp.phone,
            jobTitle: emp.jobTitle,
            employeeType: emp.employeeType,
            assignedClient: emp.assignedClient,
            assignedProject: emp.assignedProject,
            serviceDomain: emp.serviceDomain,
            startDate: emp.startDate,
            endDate: emp.endDate,
            workMode: emp.workMode,
            workLocation: emp.workLocation,
            hourlyRate: emp.hourlyRate,
            billingRate: emp.billingRate,
            responsibilities: emp.responsibilities,
            requiredSkills: emp.requiredSkills,
            status: nextStatus,
          },
        },
      });

      if (result.configured && result.employee) {
        const nextEmployees = employees.map((item) =>
          item.id === result.employee!.id ? result.employee! : item,
        );
        commitEmployees(nextEmployees);
      } else {
        const nextEmployees = employees.map((item) =>
          item.id === emp.id ? updateEmployee(item, { status: nextStatus }) : item,
        );
        commitEmployees(nextEmployees);
      }
    } catch {
      const nextEmployees = employees.map((item) =>
        item.id === emp.id ? updateEmployee(item, { status: nextStatus }) : item,
      );
      commitEmployees(nextEmployees);
    }

    setMessage(`Employee status changed to ${nextStatus}.`);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <InternalAccessBanner area="admin" />

        {message ? (
          <div className="rounded-2xl border border-[#1DA1F2]/40 bg-[#1DA1F2]/10 px-4 py-3 text-sm font-medium text-[#0B3D91]">
            {message}
          </div>
        ) : null}

        <div>
          <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">Employee & Contractor Management</h1>
          <p className="mt-1 text-slate-600">Add, edit, and manage employee and contractor records with unique SDS UIDs.</p>
        </div>

        <div className="grid xl:grid-cols-[1.1fr_1fr] gap-6">
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-heading font-bold text-[#0B3D91]">
                {editingEmployee ? "Edit Employee" : "Add Employee / Contractor"}
              </h2>
              {editingEmployee ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm font-semibold text-[#0B3D91] hover:text-[#1DA1F2]"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="mt-6 grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Full Name" required error={errors.fullName}>
                  <input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} className={inputClass(errors.fullName)} />
                </FormField>
                <FormField label="Email" required error={errors.email}>
                  <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className={inputClass(errors.email)} />
                </FormField>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Phone">
                  <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={inputClass()} />
                </FormField>
                <FormField label="Job Title" required error={errors.jobTitle}>
                  <input value={form.jobTitle} onChange={(e) => setField("jobTitle", e.target.value)} className={inputClass(errors.jobTitle)} />
                </FormField>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Employee Type" required error={errors.employeeType}>
                  <select value={form.employeeType} onChange={(e) => setField("employeeType", e.target.value as EmployeeType)} className={inputClass(errors.employeeType)}>
                    {employeeTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Service Domain" required error={errors.serviceDomain}>
                  <select value={form.serviceDomain} onChange={(e) => setField("serviceDomain", e.target.value as ServiceDomain)} className={inputClass(errors.serviceDomain)}>
                    {serviceDomains.map((domain) => (
                      <option key={domain}>{domain}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Assigned Client">
                  <input value={form.assignedClient} onChange={(e) => setField("assignedClient", e.target.value)} className={inputClass()} />
                </FormField>
                <FormField label="Assigned Project" required error={errors.assignedProject}>
                  <input value={form.assignedProject} onChange={(e) => setField("assignedProject", e.target.value)} className={inputClass(errors.assignedProject)} />
                </FormField>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <FormField label="Start Date" required error={errors.startDate}>
                  <input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} className={inputClass(errors.startDate)} />
                </FormField>
                <FormField label="End Date">
                  <input type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} className={inputClass()} />
                </FormField>
                <FormField label="Status" required error={errors.status}>
                  <select value={form.status} onChange={(e) => setField("status", e.target.value as EmployeeStatus)} className={inputClass(errors.status)}>
                    {statusOptions.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <FormField label="Work Mode">
                  <select value={form.workMode} onChange={(e) => setField("workMode", e.target.value as WorkMode)} className={inputClass()}>
                    {workModes.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Work Location">
                  <input value={form.workLocation} onChange={(e) => setField("workLocation", e.target.value)} className={inputClass()} />
                </FormField>
                <FormField label="Hourly Rate">
                  <input value={form.hourlyRate} onChange={(e) => setField("hourlyRate", e.target.value)} className={inputClass()} placeholder="e.g. $50" />
                </FormField>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Billing Rate">
                  <input value={form.billingRate} onChange={(e) => setField("billingRate", e.target.value)} className={inputClass()} placeholder="e.g. $85" />
                </FormField>
                <FormField label="Required Skills">
                  <input value={form.requiredSkills} onChange={(e) => setField("requiredSkills", e.target.value)} className={inputClass()} placeholder="e.g. Python, AWS, BICSI Certified" />
                </FormField>
              </div>

              <FormField label="Responsibilities">
                <textarea rows={4} value={form.responsibilities} onChange={(e) => setField("responsibilities", e.target.value)} className={inputClass()} />
              </FormField>

              <div className="pt-2">
                <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-16px_rgba(11,61,145,0.8)] hover:opacity-95">
                  {editingEmployee ? "Update Employee" : "Add Employee"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
            <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Employees & Contractors</h2>
            <p className="mt-1 text-sm text-slate-600">Search and filter all employee records. Each employee receives a unique SDS UID.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={inputClass()}
                placeholder="Search by name, UID, email, role, client, project"
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | EmployeeStatus)} className={inputClass()}>
                <option>All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <select value={serviceDomainFilter} onChange={(e) => setServiceDomainFilter(e.target.value as "All" | ServiceDomain)} className={inputClass()}>
                <option>All Domains</option>
                {serviceDomains.map((domain) => (
                  <option key={domain}>{domain}</option>
                ))}
              </select>
              <select value={employeeTypeFilter} onChange={(e) => setEmployeeTypeFilter(e.target.value as "All" | EmployeeType)} className={inputClass()}>
                <option>All Types</option>
                {employeeTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                    <th className="py-3 pr-3 font-semibold">UID</th>
                    <th className="py-3 pr-3 font-semibold">Name</th>
                    <th className="py-3 pr-3 font-semibold">Role</th>
                    <th className="py-3 pr-3 font-semibold">Client</th>
                    <th className="py-3 pr-3 font-semibold">Project</th>
                    <th className="py-3 pr-3 font-semibold">Type</th>
                    <th className="py-3 pr-3 font-semibold">Status</th>
                    <th className="py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No employees added yet.
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No employees match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="border-b border-[#E5E7EB]/80 align-top">
                        <td className="py-3 pr-3">
                          <Link to={`/admin/employees/${emp.id}`} className="font-mono text-xs font-semibold text-[#1DA1F2] hover:underline">
                            {emp.uid}
                          </Link>
                        </td>
                        <td className="py-3 pr-3 font-medium text-slate-900">{emp.fullName}</td>
                        <td className="py-3 pr-3 text-slate-700">{emp.jobTitle}</td>
                        <td className="py-3 pr-3 text-slate-700">{emp.assignedClient || "-"}</td>
                        <td className="py-3 pr-3 text-slate-700">{emp.assignedProject}</td>
                        <td className="py-3 pr-3 text-slate-700">{emp.employeeType}</td>
                        <td className="py-3 pr-3">
                          <StatusBadge status={emp.status} />
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <ActionButton onClick={() => onEdit(emp)} icon={Pencil} label="Edit" />
                            <ActionButton onClick={() => void onToggleStatus(emp)} icon={ToggleRight} label={emp.status === "Active" ? "Deactivate" : "Activate"} />
                            <ActionButton onClick={() => setPendingDeleteEmployee(emp)} icon={Trash2} label="Delete" tone="danger" />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      {pendingDeleteEmployee ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D91]/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_40px_60px_-30px_rgba(11,61,145,0.8)]">
            <h3 className="text-lg font-heading font-bold text-[#0B3D91]">Delete Employee</h3>
            <p className="mt-3 text-sm text-slate-700">
              Are you sure you want to delete {pendingDeleteEmployee.fullName} ({pendingDeleteEmployee.uid})? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteEmployee(null)}
                className="rounded-lg border border-[#E5E7EB] px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onDelete(pendingDeleteEmployee.id)}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError?: string) {
  return `w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25 ${
    hasError ? "border-red-500" : "border-[#E5E7EB]"
  }`;
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const styles: Record<EmployeeStatus, string> = {
    Active: "bg-green-100 text-green-700 border border-green-200",
    Inactive: "bg-slate-100 text-slate-700 border border-slate-200",
    "On Hold": "bg-orange-100 text-orange-700 border border-orange-200",
    Completed: "bg-slate-200 text-slate-700 border border-slate-300",
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{status}</span>;
}

function ActionButton({
  onClick,
  icon: Icon,
  label,
  tone = "default",
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
        tone === "danger"
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-[#E5E7EB] text-[#0B3D91] hover:bg-[#1DA1F2]/10"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
