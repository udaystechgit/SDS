import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import { readEmployees, getActiveEmployees } from "@/lib/employees";
import { readTimesheets, saveTimesheets, createTimesheet, updateTimesheet } from "@/lib/timesheets";
import type { TimesheetInput, TimesheetRecord } from "@/lib/timesheets";

export const Route = createFileRoute("/employee")({
  component: EmployeePortalPage,
});

type FormErrors = Partial<Record<keyof TimesheetInput, string>>;

const emptyForm: TimesheetInput = {
  employeeUID: "",
  employeeName: "",
  client: "",
  project: "",
  weekStartDate: "",
  weekEndDate: "",
  monday: 0,
  tuesday: 0,
  wednesday: 0,
  thursday: 0,
  friday: 0,
  saturday: 0,
  sunday: 0,
  workSummary: "",
  blockers: "",
  status: "Draft",
};

function EmployeePortalPage() {
  const employees = getActiveEmployees();
  const [selectedEmployeeUID, setSelectedEmployeeUID] = useState("");
  const [timesheets, setTimesheets] = useState<TimesheetRecord[]>(() => readTimesheets());
  const [form, setForm] = useState<TimesheetInput>(emptyForm);
  const [editingTimesheetId, setEditingTimesheetId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState("");

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.uid === selectedEmployeeUID) ?? null,
    [employees, selectedEmployeeUID],
  );

  const employeeTimesheets = useMemo(
    () =>
      timesheets
        .filter((ts) => ts.employeeUID === selectedEmployeeUID)
        .sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1)),
    [timesheets, selectedEmployeeUID],
  );

  const editingTimesheet = useMemo(
    () => employeeTimesheets.find((ts) => ts.id === editingTimesheetId) ?? null,
    [employeeTimesheets, editingTimesheetId],
  );

  function setField<K extends keyof TimesheetInput>(key: K, value: TimesheetInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateForm(values: TimesheetInput): FormErrors {
    const errors: FormErrors = {};

    if (!values.employeeUID.trim()) errors.employeeUID = "Employee is required.";
    if (!values.weekStartDate.trim()) errors.weekStartDate = "Week Start Date is required.";

    const totalHours = values.monday + values.tuesday + values.wednesday + values.thursday + values.friday + values.saturday + values.sunday;
    if (totalHours === 0) errors.monday = "At least one day must have hours.";

    if (values.status === "Submitted" && !values.workSummary.trim()) {
      errors.workSummary = "Work Summary is required before submitting.";
    }

    return errors;
  }

  function handleSelectEmployee(uid: string) {
    setSelectedEmployeeUID(uid);
    const emp = employees.find((e) => e.uid === uid);
    if (emp) {
      setForm((prev) => ({
        ...prev,
        employeeUID: emp.uid,
        employeeName: emp.fullName,
        client: emp.assignedClient,
        project: emp.assignedProject,
      }));
      setEditingTimesheetId(null);
      setErrors({});
      setMessage("");
    }
  }

  function commitTimesheets(next: TimesheetRecord[]) {
    setTimesheets(next);
    saveTimesheets(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    if (editingTimesheet && editingTimesheetId) {
      const updated = updateTimesheet(editingTimesheet, form);
      const next = timesheets.map((ts) => (ts.id === editingTimesheetId ? updated : ts));
      commitTimesheets(next);
      const action = form.status === "Submitted" ? "submitted" : "saved";
      setMessage(`Timesheet ${action} successfully for review.`);
      resetForm();
      return;
    }

    const created = createTimesheet(form);
    const next = [created, ...timesheets];
    commitTimesheets(next);
    const action = form.status === "Submitted" ? "submitted" : "saved";
    setMessage(`Timesheet ${action} successfully for admin review.`);
    resetForm();
  }

  function resetForm() {
    if (selectedEmployee) {
      setForm({
        ...emptyForm,
        employeeUID: selectedEmployee.uid,
        employeeName: selectedEmployee.fullName,
        client: selectedEmployee.assignedClient,
        project: selectedEmployee.assignedProject,
      });
    } else {
      setForm(emptyForm);
    }
    setEditingTimesheetId(null);
    setErrors({});
  }

  function onEditTimesheet(ts: TimesheetRecord) {
    setEditingTimesheetId(ts.id);
    setForm({
      employeeUID: ts.employeeUID,
      employeeName: ts.employeeName,
      client: ts.client,
      project: ts.project,
      weekStartDate: ts.weekStartDate,
      weekEndDate: ts.weekEndDate,
      monday: ts.monday,
      tuesday: ts.tuesday,
      wednesday: ts.wednesday,
      thursday: ts.thursday,
      friday: ts.friday,
      saturday: ts.saturday,
      sunday: ts.sunday,
      workSummary: ts.workSummary,
      blockers: ts.blockers,
      status: ts.status,
    });
    setMessage("");
  }

  return (
    <SiteShell>
      <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <InternalAccessBanner area="employee" />

          <div>
            <h1 className="text-3xl font-heading font-bold text-[#0B3D91]">Employee Timesheet Portal</h1>
            <p className="mt-2 text-slate-600">Submit your weekly timesheets for admin review and approval.</p>
          </div>

          {!selectedEmployeeUID ? (
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
              <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Select Employee</h2>
              <p className="mt-2 text-sm text-slate-600">Choose your employee profile to get started.</p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                {employees.length === 0 ? (
                  <p className="col-span-2 text-slate-600 text-sm">No active employees found. Contact admin to add your profile.</p>
                ) : (
                  employees.map((emp) => (
                    <button
                      key={emp.uid}
                      onClick={() => handleSelectEmployee(emp.uid)}
                      className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left hover:border-[#1DA1F2] hover:bg-[#1DA1F2]/5 transition group"
                    >
                      <p className="font-medium text-slate-900 group-hover:text-[#0B3D91]">{emp.fullName}</p>
                      <p className="text-xs text-slate-500 mt-1">{emp.uid}</p>
                      <p className="text-xs text-slate-500 mt-1">{emp.jobTitle}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {selectedEmployee ? (
            <>
              {message ? (
                <div className="rounded-2xl border border-[#1DA1F2]/40 bg-[#1DA1F2]/10 px-4 py-3 text-sm font-medium text-[#0B3D91]">
                  {message}
                </div>
              ) : null}

              <div className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-slate-600">Selected Employee</p>
                    <p className="text-lg font-heading font-bold text-[#0B3D91]">{selectedEmployee.fullName}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEmployeeUID("");
                    setForm(emptyForm);
                    setEditingTimesheetId(null);
                  }}
                  className="text-sm font-semibold text-[#0B3D91] hover:text-[#1DA1F2]"
                >
                  Change Employee
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
                  <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Current Assignment</h2>

                  <div className="mt-4 space-y-3">
                    <InfoBlock label="Employee UID" value={selectedEmployee.uid} />
                    <InfoBlock label="Job Title" value={selectedEmployee.jobTitle} />
                    <InfoBlock label="Assigned Client" value={selectedEmployee.assignedClient || "-"} />
                    <InfoBlock label="Assigned Project" value={selectedEmployee.assignedProject} />
                    <InfoBlock label="Service Domain" value={selectedEmployee.serviceDomain} />
                    <InfoBlock label="Work Mode" value={selectedEmployee.workMode} />
                    <InfoBlock label="Status" value={selectedEmployee.status} />
                  </div>
                </section>

                <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
                  <h2 className="text-xl font-heading font-bold text-[#0B3D91]">
                    {editingTimesheet ? "Edit Timesheet" : "Submit Timesheet"}
                  </h2>

                  <form onSubmit={onSubmit} className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Week Start Date" required error={errors.weekStartDate}>
                        <input
                          type="date"
                          value={form.weekStartDate}
                          onChange={(e) => setField("weekStartDate", e.target.value)}
                          className={inputClass(errors.weekStartDate)}
                        />
                      </FormField>
                      <FormField label="Week End Date">
                        <input
                          type="date"
                          value={form.weekEndDate}
                          onChange={(e) => setField("weekEndDate", e.target.value)}
                          className={inputClass()}
                        />
                      </FormField>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-medium text-slate-800">Daily Hours</p>
                      <div className="grid grid-cols-7 gap-2">
                        {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => (
                          <FormField key={day} label={day.slice(0, 3)}>
                            <input
                              type="number"
                              min="0"
                              max="24"
                              value={form[day]}
                              onChange={(e) => setField(day, parseFloat(e.target.value) || 0)}
                              className={inputClass()}
                            />
                          </FormField>
                        ))}
                      </div>
                      {errors.monday ? <p className="mt-2 text-xs text-red-600">{errors.monday}</p> : null}
                    </div>

                    <FormField label="Work Summary" required error={errors.workSummary}>
                      <textarea
                        rows={3}
                        value={form.workSummary}
                        onChange={(e) => setField("workSummary", e.target.value)}
                        className={inputClass(errors.workSummary)}
                        placeholder="Describe your work this week"
                      />
                    </FormField>

                    <FormField label="Blockers / Notes">
                      <textarea
                        rows={2}
                        value={form.blockers}
                        onChange={(e) => setField("blockers", e.target.value)}
                        className={inputClass()}
                        placeholder="Any blockers or notes for admin"
                      />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, status: "Draft" }));
                          setTimeout(() => {
                            const e = new Event("submit", { bubbles: true });
                            document.querySelector("form")?.dispatchEvent(e);
                          }, 0);
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, status: "Submitted" }));
                          setTimeout(() => {
                            document.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true }));
                          }, 0);
                        }}
                        className="inline-flex items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_-16px_rgba(11,61,145,0.8)] hover:opacity-95"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Submit Timesheet
                      </button>
                      {editingTimesheet ? (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>
                </section>
              </div>

              <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
                <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Timesheet History</h2>
                <p className="mt-1 text-sm text-slate-600">View your submitted timesheets and their status.</p>

                {employeeTimesheets.length === 0 ? (
                  <div className="mt-4 text-center py-8 text-slate-500">
                    <p>No timesheets submitted yet.</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {employeeTimesheets.map((ts) => (
                      <div key={ts.id} className="rounded-lg border border-[#E5E7EB] p-4 hover:border-[#1DA1F2] transition">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {ts.weekStartDate} to {ts.weekEndDate}
                            </p>
                            <p className="text-sm text-slate-600 mt-1">{ts.totalHours} hours</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <TimesheetStatusBadge status={ts.status} />
                            {ts.status === "Draft" ? (
                              <button
                                onClick={() => onEditTimesheet(ts)}
                                className="text-xs font-semibold text-[#1DA1F2] hover:text-[#0B3D91]"
                              >
                                Edit
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </section>
      </main>
    </SiteShell>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-600">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
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
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-800 mb-1.5">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError?: string) {
  return `w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25 ${
    hasError ? "border-red-500" : "border-[#E5E7EB]"
  }`;
}

function TimesheetStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-700",
    Submitted: "bg-orange-100 text-orange-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border border-current border-opacity-30 ${styles[status]}`}>
      {status}
    </span>
  );
}
