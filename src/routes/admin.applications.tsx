import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Mail, RefreshCw, Search, UserRound } from "lucide-react";

import { AdminNav } from "@/components/AdminNav";
import { useAuth } from "@/lib/auth-context";
import {
  getJobApplicationActivityFn,
  getResumeDownloadUrlFn,
  listJobApplicationsFn,
  notifyCandidateStatusFn,
  updateJobApplicationFn,
} from "@/lib/api/admin-applications.functions";

export const Route = createFileRoute("/admin/applications")({
  component: AdminApplicationsPage,
});

type ApplicationStatus =
  | "new"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";

type Application = {
  id: string;
  job_id: string | null;
  job_title: string;
  full_name: string;
  email: string;
  phone: string | null;
  cover_letter: string | null;
  resume_path: string | null;
  resume_filename: string | null;
  resume_mime_type: string | null;
  resume_size: number | null;
  status: ApplicationStatus;
  assigned_to: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

type Activity = {
  id: string;
  application_id: string;
  user_id: string | null;
  action: string;
  old_status: string | null;
  new_status: string | null;
  note: string | null;
  created_at: string;
};

const statuses: ApplicationStatus[] = [
  "new",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
];

const notifyableStatuses = new Set<ApplicationStatus>([
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
]);

function AdminApplicationsPage() {
  const { session } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [status, setStatus] = useState<ApplicationStatus>("new");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const selected = applications.find((item) => item.id === selectedId) ?? applications[0] ?? null;

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setStatus(selected.status);
    setNotes(selected.internal_notes ?? "");
  }, [selected?.id, selected?.status, selected?.internal_notes]);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${session?.access_token ?? ""}` }),
    [session?.access_token],
  );

  const loadApplications = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const result = await listJobApplicationsFn({ headers: authHeaders });
      setApplications(result.applications as Application[]);
      setSelectedId((current) => current || result.applications[0]?.id || "");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load applications.");
    }
  }, [authHeaders, session?.access_token]);

  const loadActivity = useCallback(async () => {
    if (!session?.access_token || !selected) {
      setActivity([]);
      return;
    }
    try {
      const result = await getJobApplicationActivityFn({
        data: { id: selected.id },
        headers: authHeaders,
      });
      setActivity(result.activity as Activity[]);
    } catch {
      setActivity([]);
    }
  }, [authHeaders, selected, session?.access_token]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const jobOptions = useMemo(
    () => ["all", ...Array.from(new Set(applications.map((item) => item.job_title)))],
    [applications],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((item) => {
      const matchesSearch =
        !q ||
        item.full_name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.job_title.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesJob = jobFilter === "all" || item.job_title === jobFilter;
      return matchesSearch && matchesStatus && matchesJob;
    });
  }, [applications, jobFilter, search, statusFilter]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: applications.length };
    statuses.forEach((value) => {
      result[value] = applications.filter((item) => item.status === value).length;
    });
    return result;
  }, [applications]);

  async function saveChanges() {
    if (!selected || !session?.access_token) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await updateJobApplicationFn({
        data: { id: selected.id, status, internalNotes: notes },
        headers: authHeaders,
      });
      setApplications((items) =>
        items.map((item) => (item.id === selected.id ? (result.application as Application) : item)),
      );
      setMessage("Application updated successfully.");
      await loadActivity();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update application.");
    } finally {
      setSaving(false);
    }
  }

  async function notifyCandidate() {
    if (!selected || !session?.access_token || !notifyableStatuses.has(selected.status)) return;
    setNotifying(true);
    setMessage("");
    try {
      await notifyCandidateStatusFn({
        data: {
          id: selected.id,
          status: selected.status as "shortlisted" | "interview" | "offered" | "hired" | "rejected",
        },
        headers: authHeaders,
      });
      setMessage(`${titleCase(selected.status)} email sent to ${selected.full_name}.`);
      await loadActivity();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to notify candidate.");
    } finally {
      setNotifying(false);
    }
  }

  async function downloadResume() {
    if (!selected || !session?.access_token) return;
    try {
      const result = await getResumeDownloadUrlFn({
        data: { id: selected.id },
        headers: authHeaders,
      });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to download resume.");
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#1DA1F2]">Recruitment</div>
            <h1 className="mt-2 text-3xl font-heading font-bold text-[#0B3D91]">Applications</h1>
            <p className="mt-1 text-slate-600">Review candidates, resumes, statuses, notes, and activity history.</p>
          </div>
          <button onClick={() => void loadApplications()} className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#0B3D91] shadow-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {message ? <div className="mt-5 rounded-xl border border-[#B8D7FF] bg-[#EAF4FF] px-4 py-3 text-sm font-medium text-[#0B3D91]">{message}</div> : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {["all", "new", "reviewing", "shortlisted", "interview"].map((key) => (
            <button key={key} onClick={() => setStatusFilter(key)} className={`rounded-2xl border p-4 text-left shadow-sm ${statusFilter === key ? "border-[#1DA1F2] bg-[#EAF4FF]" : "border-[#E5E7EB] bg-white"}`}>
              <div className="text-xs font-semibold uppercase text-slate-500">{key}</div>
              <div className="mt-1 text-2xl font-bold text-[#0B3D91]">{counts[key] ?? 0}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="space-y-3 border-b border-[#E5E7EB] p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidate, email, job..." className="w-full rounded-xl border border-[#E5E7EB] py-2.5 pl-9 pr-3 text-sm" />
              </div>
              <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-sm">
                {jobOptions.map((job) => <option key={job} value={job}>{job === "all" ? "All jobs" : job}</option>)}
              </select>
            </div>
            <div className="max-h-[720px] overflow-y-auto">
              {filtered.length === 0 ? <p className="p-5 text-sm text-slate-500">No applications found.</p> : filtered.map((item) => (
                <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full border-b border-[#E5E7EB] p-4 text-left ${selected?.id === item.id ? "bg-[#EAF4FF]" : "hover:bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.full_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.job_title}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
            {!selected ? <div className="py-20 text-center text-slate-500">Select an application to review.</div> : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1DA1F2]/15 text-[#0B3D91]"><UserRound className="h-6 w-6" /></span>
                    <div><h2 className="text-2xl font-heading font-bold text-[#0B3D91]">{selected.full_name}</h2><p className="text-sm text-slate-500">{selected.job_title}</p></div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Info label="Email" value={selected.email} />
                  <Info label="Phone" value={selected.phone || "—"} />
                  <Info label="Applied" value={new Date(selected.created_at).toLocaleString()} />
                  <Info label="Resume" value={selected.resume_filename || "—"} />
                </div>

                {selected.cover_letter ? <div className="mt-6 rounded-2xl bg-slate-50 p-5"><div className="text-xs font-semibold uppercase text-slate-500">Applicant responses</div><div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.cover_letter}</div></div> : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => void downloadResume()} className="inline-flex items-center gap-2 rounded-xl bg-[#0B3D91] px-4 py-2.5 text-sm font-semibold text-white"><Download className="h-4 w-4" /> Download Resume</button>
                  <a href={`mailto:${selected.email}`} className="inline-flex items-center rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-[#0B3D91]">Email Candidate</a>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <div><label className="mb-2 block text-sm font-semibold text-slate-800">Status</label><select value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)} className="w-full rounded-xl border border-[#E5E7EB] px-3 py-3 text-sm">{statuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></div>
                  <div><label className="mb-2 block text-sm font-semibold text-slate-800">Internal notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="w-full rounded-xl border border-[#E5E7EB] px-3 py-3 text-sm" placeholder="Private HR notes..." /></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button disabled={saving} onClick={() => void saveChanges()} className="rounded-xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
                  {notifyableStatuses.has(selected.status) ? (
                    <button disabled={notifying || status !== selected.status} onClick={() => void notifyCandidate()} className="inline-flex items-center gap-2 rounded-xl border border-[#0B3D91] bg-white px-5 py-3 text-sm font-semibold text-[#0B3D91] disabled:cursor-not-allowed disabled:opacity-50">
                      <Mail className="h-4 w-4" />
                      {notifying ? "Sending..." : `Notify Candidate: ${titleCase(selected.status)}`}
                    </button>
                  ) : null}
                </div>
                {notifyableStatuses.has(status) && status !== selected.status ? (
                  <p className="mt-2 text-xs text-slate-500">Save the status first. You can then review and send the candidate notification separately.</p>
                ) : null}

                <div className="mt-8 border-t border-[#E5E7EB] pt-6"><h3 className="font-heading text-lg font-bold text-[#0B3D91]">Activity History</h3><div className="mt-4 space-y-3">{activity.length === 0 ? <p className="text-sm text-slate-500">No activity yet.</p> : activity.map((item) => <div key={item.id} className="rounded-xl border border-[#E5E7EB] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{titleCase(item.action.replaceAll("_", " "))}</p><p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p></div>{item.old_status || item.new_status ? <p className="mt-1 text-xs text-slate-500">{item.old_status ? titleCase(item.old_status) : "—"} → {item.new_status ? titleCase(item.new_status) : "—"}</p> : null}{item.note ? <p className="mt-2 text-sm text-slate-600">{item.note}</p> : null}</div>)}</div></div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#E5E7EB] p-4"><div className="text-xs font-semibold uppercase text-slate-500">{label}</div><div className="mt-1 break-words text-sm font-medium text-slate-800">{value}</div></div>;
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const styles: Record<ApplicationStatus, string> = {
    new: "bg-blue-100 text-blue-700",
    reviewing: "bg-amber-100 text-amber-700",
    shortlisted: "bg-indigo-100 text-indigo-700",
    interview: "bg-purple-100 text-purple-700",
    offered: "bg-cyan-100 text-cyan-700",
    hired: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    withdrawn: "bg-slate-100 text-slate-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{titleCase(status)}</span>;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
