import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { InternalPortalNav } from "@/components/InternalPortalNav";
import { PortalBanner } from "@/components/PortalBanner";
import {
  type EmployerRequirementRecord,
  type EmployerRequirementInput,
  createEmployerRequirement,
  readEmployerRequirements,
  saveEmployerRequirements,
  updateEmployerRequirement,
} from "@/lib/employer-requirements";
import {
  listEmployerRequirementsFn,
  upsertEmployerRequirementFn,
} from "@/lib/api/employer-requirements.functions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/employer/jobs")({
  component: EmployerJobsPage,
});

const statuses = ["Draft", "Submitted", "Approved by Admin", "Published", "Closed"] as const;

const emptyForm: EmployerRequirementInput = {
  employerName: "",
  jobTitle: "",
  department: "",
  clientProject: "",
  location: "",
  jobType: "Full-time",
  workMode: "On-site",
  experienceLevel: "Mid Level",
  requiredSkills: "",
  responsibilities: "",
  numberOfOpenings: 1,
  startDate: "",
  duration: "",
  rateRange: "",
  status: "Draft",
};

type FormErrors = Partial<Record<keyof EmployerRequirementInput, string>>;

function EmployerJobsPage() {
  const [requirements, setRequirements] = useState<EmployerRequirementRecord[]>([]);
  const [form, setForm] = useState<EmployerRequirementInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState("");
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  useEffect(() => {
    void loadRequirements();
  }, []);

  useEffect(() => {
    let mounted = true;

    const resolveOwner = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setOwnerUserId(data.user?.id ?? null);
      }
    };

    void resolveOwner();

    return () => {
      mounted = false;
    };
  }, []);

  const editingRequirement = useMemo(
    () => requirements.find((r) => r.id === editingId) ?? null,
    [requirements, editingId],
  );

  function setField<K extends keyof EmployerRequirementInput>(
    key: K,
    value: EmployerRequirementInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(values: EmployerRequirementInput): FormErrors {
    const next: FormErrors = {};
    if (!values.employerName.trim()) next.employerName = "Employer Name is required.";
    if (!values.jobTitle.trim()) next.jobTitle = "Job Title is required.";
    if (!values.clientProject.trim()) next.clientProject = "Client / Project is required.";
    if (!values.requiredSkills.trim()) next.requiredSkills = "Required Skills are required.";
    if (!values.startDate.trim()) next.startDate = "Start Date is required.";
    return next;
  }

  function commit(next: EmployerRequirementRecord[]) {
    setRequirements(next);
    saveEmployerRequirements(next);
  }

  async function loadRequirements() {
    try {
      const result = await listEmployerRequirementsFn({ data: {} });
      if (result.configured) {
        commit(result.requirements);
        return;
      }
    } catch {
      // Fall back to local cache.
    }

    setRequirements(readEmployerRequirements());
  }

  function reset() {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const result = await upsertEmployerRequirementFn({
        data: {
          id: editingRequirement?.id,
          payload: form,
          ownerUserId: ownerUserId ?? undefined,
        },
      });

      if (result.configured && result.requirement) {
        const next = editingRequirement
          ? requirements.map((r) => (r.id === result.requirement!.id ? result.requirement! : r))
          : [result.requirement, ...requirements];
        commit(next);
        setMessage(editingRequirement ? "Requirement updated successfully." : "Requirement created successfully.");
        reset();
        return;
      }
    } catch {
      // Fall back to local flow.
    }

    if (editingRequirement) {
      const next = requirements.map((r) =>
        r.id === editingRequirement.id ? updateEmployerRequirement(r, form) : r,
      );
      commit(next);
      setMessage("Requirement updated successfully.");
      reset();
      return;
    }

    const created = createEmployerRequirement(form);
    commit([created, ...requirements]);
    setMessage("Requirement created successfully.");
    reset();
  }

  function onEdit(requirement: EmployerRequirementRecord) {
    setEditingId(requirement.id);
    setForm({
      employerName: requirement.employerName,
      jobTitle: requirement.jobTitle,
      department: requirement.department,
      clientProject: requirement.clientProject,
      location: requirement.location,
      jobType: requirement.jobType,
      workMode: requirement.workMode,
      experienceLevel: requirement.experienceLevel,
      requiredSkills: requirement.requiredSkills,
      responsibilities: requirement.responsibilities,
      numberOfOpenings: requirement.numberOfOpenings,
      startDate: requirement.startDate,
      duration: requirement.duration,
      rateRange: requirement.rateRange,
      status: requirement.status,
    });
    setErrors({});
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="employer" />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PortalBanner extraMessage="Employer access protection will be added in backend phase." />

        {message ? (
          <div className="rounded-2xl border border-[#1DA1F2]/40 bg-[#1DA1F2]/10 px-4 py-3 text-sm font-medium text-[#0B3D91]">
            {message}
          </div>
        ) : null}

        <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">Employer Job Requirements</h1>

        <div className="grid xl:grid-cols-[1.1fr_1fr] gap-6">
          <form onSubmit={(e) => void onSubmit(e)} className="rounded-3xl border border-[#E5E7EB] bg-white p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Employer Name" error={errors.employerName}>
                <input className={inputClass(errors.employerName)} value={form.employerName} onChange={(e) => setField("employerName", e.target.value)} />
              </Field>
              <Field label="Job Title" error={errors.jobTitle}>
                <input className={inputClass(errors.jobTitle)} value={form.jobTitle} onChange={(e) => setField("jobTitle", e.target.value)} />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Department">
                <input className={inputClass()} value={form.department} onChange={(e) => setField("department", e.target.value)} />
              </Field>
              <Field label="Client / Project" error={errors.clientProject}>
                <input className={inputClass(errors.clientProject)} value={form.clientProject} onChange={(e) => setField("clientProject", e.target.value)} />
              </Field>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Location">
                <input className={inputClass()} value={form.location} onChange={(e) => setField("location", e.target.value)} />
              </Field>
              <Field label="Job Type">
                <input className={inputClass()} value={form.jobType} onChange={(e) => setField("jobType", e.target.value)} />
              </Field>
              <Field label="Work Mode">
                <select className={inputClass()} value={form.workMode} onChange={(e) => setField("workMode", e.target.value as EmployerRequirementInput["workMode"])}>
                  <option>On-site</option>
                  <option>Remote</option>
                  <option>Hybrid</option>
                </select>
              </Field>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Experience Level">
                <input className={inputClass()} value={form.experienceLevel} onChange={(e) => setField("experienceLevel", e.target.value)} />
              </Field>
              <Field label="Number of Openings">
                <input type="number" min={1} className={inputClass()} value={form.numberOfOpenings} onChange={(e) => setField("numberOfOpenings", Number(e.target.value) || 1)} />
              </Field>
              <Field label="Status">
                <select className={inputClass()} value={form.status} onChange={(e) => setField("status", e.target.value as EmployerRequirementInput["status"])}>
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Start Date" error={errors.startDate}>
                <input type="date" className={inputClass(errors.startDate)} value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
              </Field>
              <Field label="Duration">
                <input className={inputClass()} value={form.duration} onChange={(e) => setField("duration", e.target.value)} />
              </Field>
              <Field label="Rate Range">
                <input className={inputClass()} value={form.rateRange} onChange={(e) => setField("rateRange", e.target.value)} />
              </Field>
            </div>

            <Field label="Required Skills" error={errors.requiredSkills}>
              <textarea rows={2} className={inputClass(errors.requiredSkills)} value={form.requiredSkills} onChange={(e) => setField("requiredSkills", e.target.value)} />
            </Field>
            <Field label="Responsibilities">
              <textarea rows={3} className={inputClass()} value={form.responsibilities} onChange={(e) => setField("responsibilities", e.target.value)} />
            </Field>

            <button className="rounded-xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-4 py-2.5 text-sm font-semibold text-white" type="submit">
              {editingRequirement ? "Update Requirement" : "Create Requirement"}
            </button>
          </form>

          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
            <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Requirements</h2>
            <div className="mt-4 space-y-3">
              {requirements.length === 0 ? (
                <p className="text-sm text-slate-500">No requirements yet.</p>
              ) : (
                requirements.map((req) => (
                  <div key={req.id} className="rounded-xl border border-[#E5E7EB] p-3">
                    <p className="font-semibold text-slate-900">{req.jobTitle}</p>
                    <p className="text-xs text-slate-500 mt-1">{req.employerName} • {req.clientProject}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs rounded-full bg-[#1DA1F2]/10 px-2 py-1 text-[#0B3D91]">{req.status}</span>
                      <button type="button" onClick={() => onEdit(req)} className="text-xs font-semibold text-[#1DA1F2]">Edit</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-800">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1DA1F2]/25 ${error ? "border-red-500" : "border-[#E5E7EB]"}`;
}
