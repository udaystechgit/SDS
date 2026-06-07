import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { InternalPortalNav } from "@/components/InternalPortalNav";
import { PortalBanner } from "@/components/PortalBanner";
import {
  type ClientRequirementRecord,
  type ClientRequirementInput,
  createClientRequirement,
  readClientRequirements,
  saveClientRequirements,
  updateClientRequirement,
} from "@/lib/client-requirements";
import {
  listClientRequirementsFn,
  upsertClientRequirementFn,
} from "@/lib/api/client-requirements.functions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/client/requirements")({
  component: ClientRequirementsPage,
});

const statuses = ["Draft", "Submitted", "Under Review", "Approved", "In Progress", "Completed", "Closed"] as const;
const priorities = ["Low", "Medium", "High", "Urgent"] as const;

const emptyForm: ClientRequirementInput = {
  clientName: "",
  serviceDomain: "IT & AI Services",
  serviceNeeded: "",
  projectName: "",
  location: "",
  workMode: "On-site",
  requiredStartDate: "",
  expectedDuration: "",
  requiredSkills: "",
  numberOfResourcesNeeded: 1,
  budgetRateRange: "",
  description: "",
  priority: "Medium",
  status: "Draft",
};

type FormErrors = Partial<Record<keyof ClientRequirementInput, string>>;

function ClientRequirementsPage() {
  const [requirements, setRequirements] = useState<ClientRequirementRecord[]>([]);
  const [form, setForm] = useState<ClientRequirementInput>(emptyForm);
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

  function setField<K extends keyof ClientRequirementInput>(
    key: K,
    value: ClientRequirementInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(values: ClientRequirementInput): FormErrors {
    const next: FormErrors = {};
    if (!values.clientName.trim()) next.clientName = "Client Name is required.";
    if (!values.serviceNeeded.trim()) next.serviceNeeded = "Service Needed is required.";
    if (!values.projectName.trim()) next.projectName = "Project Name is required.";
    if (!values.requiredStartDate.trim()) next.requiredStartDate = "Required Start Date is required.";
    return next;
  }

  function commit(next: ClientRequirementRecord[]) {
    setRequirements(next);
    saveClientRequirements(next);
  }

  async function loadRequirements() {
    try {
      const result = await listClientRequirementsFn({ data: {} });
      if (result.configured) {
        commit(result.requirements);
        return;
      }
    } catch {
      // Fall back to local cache.
    }

    setRequirements(readClientRequirements());
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
      const result = await upsertClientRequirementFn({
        data: {
          id: editingId ?? undefined,
          payload: form,
          ownerUserId: ownerUserId ?? undefined,
        },
      });

      if (result.configured && result.requirement) {
        const next = editingId
          ? requirements.map((r) => (r.id === result.requirement!.id ? result.requirement! : r))
          : [result.requirement, ...requirements];
        commit(next);
        setMessage(editingId ? "Client requirement updated." : "Client requirement submitted.");
        reset();
        return;
      }
    } catch {
      // Fall back to local flow.
    }

    if (editingId) {
      const next = requirements.map((r) =>
        r.id === editingId ? updateClientRequirement(r, form) : r,
      );
      commit(next);
      setMessage("Client requirement updated.");
      reset();
      return;
    }

    const created = createClientRequirement(form);
    commit([created, ...requirements]);
    setMessage("Client requirement submitted.");
    reset();
  }

  function onEdit(requirement: ClientRequirementRecord) {
    setEditingId(requirement.id);
    setForm({
      clientName: requirement.clientName,
      serviceDomain: requirement.serviceDomain,
      serviceNeeded: requirement.serviceNeeded,
      projectName: requirement.projectName,
      location: requirement.location,
      workMode: requirement.workMode,
      requiredStartDate: requirement.requiredStartDate,
      expectedDuration: requirement.expectedDuration,
      requiredSkills: requirement.requiredSkills,
      numberOfResourcesNeeded: requirement.numberOfResourcesNeeded,
      budgetRateRange: requirement.budgetRateRange,
      description: requirement.description,
      priority: requirement.priority,
      status: requirement.status,
    });
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="client" />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PortalBanner extraMessage="Client login and secure billing access will be added in backend phase." />

        {message ? <div className="rounded-xl border border-[#1DA1F2]/30 bg-[#1DA1F2]/10 p-3 text-sm text-[#0B3D91]">{message}</div> : null}

        <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">Client Requirements</h1>

        <div className="grid xl:grid-cols-[1.1fr_1fr] gap-6">
          <form onSubmit={(e) => void onSubmit(e)} className="rounded-3xl border border-[#E5E7EB] bg-white p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Client Name" error={errors.clientName}><input className={inputClass(errors.clientName)} value={form.clientName} onChange={(e) => setField("clientName", e.target.value)} /></Field>
              <Field label="Service Needed" error={errors.serviceNeeded}><input className={inputClass(errors.serviceNeeded)} value={form.serviceNeeded} onChange={(e) => setField("serviceNeeded", e.target.value)} /></Field>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Project Name" error={errors.projectName}><input className={inputClass(errors.projectName)} value={form.projectName} onChange={(e) => setField("projectName", e.target.value)} /></Field>
              <Field label="Service Domain">
                <select className={inputClass()} value={form.serviceDomain} onChange={(e) => setField("serviceDomain", e.target.value as ClientRequirementInput["serviceDomain"])}>
                  <option>IT & AI Services</option>
                  <option>Data Center & Infrastructure Services</option>
                  <option>Operations Support</option>
                </select>
              </Field>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Location"><input className={inputClass()} value={form.location} onChange={(e) => setField("location", e.target.value)} /></Field>
              <Field label="Work Mode"><select className={inputClass()} value={form.workMode} onChange={(e) => setField("workMode", e.target.value as ClientRequirementInput["workMode"])}><option>On-site</option><option>Remote</option><option>Hybrid</option></select></Field>
              <Field label="Required Start Date" error={errors.requiredStartDate}><input type="date" className={inputClass(errors.requiredStartDate)} value={form.requiredStartDate} onChange={(e) => setField("requiredStartDate", e.target.value)} /></Field>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Expected Duration"><input className={inputClass()} value={form.expectedDuration} onChange={(e) => setField("expectedDuration", e.target.value)} /></Field>
              <Field label="Resources Needed"><input type="number" min={1} className={inputClass()} value={form.numberOfResourcesNeeded} onChange={(e) => setField("numberOfResourcesNeeded", Number(e.target.value) || 1)} /></Field>
              <Field label="Budget / Rate Range"><input className={inputClass()} value={form.budgetRateRange} onChange={(e) => setField("budgetRateRange", e.target.value)} /></Field>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Priority"><select className={inputClass()} value={form.priority} onChange={(e) => setField("priority", e.target.value as ClientRequirementInput["priority"])}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></Field>
              <Field label="Status"><select className={inputClass()} value={form.status} onChange={(e) => setField("status", e.target.value as ClientRequirementInput["status"])}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></Field>
            </div>
            <Field label="Required Skills"><textarea rows={2} className={inputClass()} value={form.requiredSkills} onChange={(e) => setField("requiredSkills", e.target.value)} /></Field>
            <Field label="Description"><textarea rows={3} className={inputClass()} value={form.description} onChange={(e) => setField("description", e.target.value)} /></Field>

            <button className="rounded-xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-4 py-2.5 text-sm font-semibold text-white" type="submit">{editingId ? "Update Requirement" : "Submit Requirement"}</button>
          </form>

          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
            <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Submitted Requirements</h2>
            <div className="mt-4 space-y-3">
              {requirements.length === 0 ? <p className="text-sm text-slate-500">No requirements yet.</p> : requirements.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#E5E7EB] p-3">
                  <p className="font-semibold text-slate-900">{item.projectName}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.clientName} • {item.serviceDomain}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="rounded-full bg-[#1DA1F2]/10 px-2 py-1 text-xs text-[#0B3D91]">{item.status}</span>
                    <button type="button" onClick={() => onEdit(item)} className="text-xs font-semibold text-[#1DA1F2]">Edit</button>
                  </div>
                </div>
              ))}
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
