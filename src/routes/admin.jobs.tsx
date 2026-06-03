import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Pencil, Trash2, Eye, EyeOff, CircleX, BriefcaseBusiness } from "lucide-react";
import {
  type JobRequirement,
  type JobRequirementInput,
  createJobRequirement,
  readJobRequirements,
  saveJobRequirements,
  updateJobRequirement,
} from "@/lib/jobs";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";

export const Route = createFileRoute("/admin/jobs")({
  component: AdminJobsPage,
});

const serviceDomains = [
  "IT & AI Services",
  "Data Center & Infrastructure Services",
  "Operations",
  "Sales / Business Development",
  "Administration",
] as const;

const jobTypes = ["Full-time", "Part-time", "Contract", "Internship", "Temporary"] as const;
const experienceLevels = ["Entry Level", "Mid Level", "Senior Level", "Lead / Manager"] as const;
const workModes = ["On-site", "Remote", "Hybrid"] as const;
const statuses = ["Draft", "Published", "Closed"] as const;
const statusFilterOptions = ["All", ...statuses] as const;
const serviceDomainFilterOptions = ["All", ...serviceDomains] as const;
const jobTypeFilterOptions = ["All", ...jobTypes] as const;

type FormErrors = Partial<Record<keyof JobRequirementInput, string>>;

const emptyForm: JobRequirementInput = {
  jobTitle: "",
  department: "",
  serviceDomain: "IT & AI Services",
  location: "",
  jobType: "Full-time",
  experienceLevel: "Entry Level",
  workMode: "On-site",
  shortDescription: "",
  responsibilities: "",
  requirementsSkills: "",
  salaryRange: "",
  applicationEmail: "",
  status: "Draft",
};

function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRequirement[]>(() => readJobRequirements());
  const [form, setForm] = useState<JobRequirementInput>(emptyForm);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilterOptions)[number]>("All");
  const [serviceDomainFilter, setServiceDomainFilter] = useState<
    (typeof serviceDomainFilterOptions)[number]
  >("All");
  const [jobTypeFilter, setJobTypeFilter] = useState<(typeof jobTypeFilterOptions)[number]>("All");
  const [pendingDeleteJob, setPendingDeleteJob] = useState<JobRequirement | null>(null);

  const editingJob = useMemo(
    () => jobs.find((job) => job.id === editingJobId) ?? null,
    [jobs, editingJobId],
  );

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch =
        q.length === 0 ||
        job.jobTitle.toLowerCase().includes(q) ||
        job.department.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || job.status === statusFilter;
      const matchesDomain =
        serviceDomainFilter === "All" || job.serviceDomain === serviceDomainFilter;
      const matchesType = jobTypeFilter === "All" || job.jobType === jobTypeFilter;

      return matchesSearch && matchesStatus && matchesDomain && matchesType;
    });
  }, [jobs, searchQuery, statusFilter, serviceDomainFilter, jobTypeFilter]);

  function setField<K extends keyof JobRequirementInput>(key: K, value: JobRequirementInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateForm(values: JobRequirementInput) {
    const nextErrors: FormErrors = {};
    const email = values.applicationEmail.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!values.jobTitle.trim()) nextErrors.jobTitle = "Job Title is required.";
    if (!values.department.trim()) nextErrors.department = "Department is required.";
    if (!values.serviceDomain.trim()) nextErrors.serviceDomain = "Service Domain is required.";
    if (!values.location.trim()) nextErrors.location = "Location is required.";
    if (!values.jobType.trim()) nextErrors.jobType = "Job Type is required.";
    if (!values.shortDescription.trim()) nextErrors.shortDescription = "Short Description is required.";
    if (!values.status.trim()) nextErrors.status = "Status is required.";
    if (email && !emailPattern.test(email)) {
      nextErrors.applicationEmail = "Please enter a valid email address.";
    }

    return nextErrors;
  }

  function commitJobs(nextJobs: JobRequirement[]) {
    setJobs(nextJobs);
    saveJobRequirements(nextJobs);
  }

  function resetForm() {
    setForm(emptyForm);
    setErrors({});
    setEditingJobId(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    if (editingJob && editingJobId) {
      const nextJobs = jobs.map((job) =>
        job.id === editingJobId ? updateJobRequirement(job, form) : job,
      );
      commitJobs(nextJobs);
      setMessage("Job requirement saved successfully.");
      resetForm();
      return;
    }

    const created = createJobRequirement(form);
    const nextJobs = [created, ...jobs];
    commitJobs(nextJobs);
    setMessage("Job requirement saved successfully.");
    resetForm();
  }

  function onEdit(job: JobRequirement) {
    setEditingJobId(job.id);
    setForm({
      jobTitle: job.jobTitle,
      department: job.department,
      serviceDomain: job.serviceDomain,
      location: job.location,
      jobType: job.jobType,
      experienceLevel: job.experienceLevel,
      workMode: job.workMode,
      shortDescription: job.shortDescription,
      responsibilities: job.responsibilities,
      requirementsSkills: job.requirementsSkills,
      salaryRange: job.salaryRange,
      applicationEmail: job.applicationEmail,
      status: job.status,
    });
    setErrors({});
    setMessage("");
  }

  function onDelete(jobId: string) {
    const nextJobs = jobs.filter((job) => job.id !== jobId);
    commitJobs(nextJobs);
    if (editingJobId === jobId) resetForm();
    setPendingDeleteJob(null);
    setMessage("Job requirement saved successfully.");
  }

  function onPublishToggle(job: JobRequirement) {
    const nextStatus = job.status === "Published" ? "Draft" : "Published";
    const nextJobs = jobs.map((item) =>
      item.id === job.id ? updateJobRequirement(item, { status: nextStatus }) : item,
    );
    commitJobs(nextJobs);
    setMessage(
      nextStatus === "Published"
        ? "Job requirement is now live on Careers page."
        : "Job requirement saved successfully.",
    );
  }

  function onClose(job: JobRequirement) {
    const nextJobs = jobs.map((item) =>
      item.id === job.id ? updateJobRequirement(item, { status: "Closed" }) : item,
    );
    commitJobs(nextJobs);
    setMessage("Job requirement saved successfully.");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <header className="border-b border-[#E5E7EB] bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] text-white shadow-[0_10px_30px_-16px_rgba(11,61,145,0.8)]">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">SDS Internal Job Requirements</h1>
              <p className="text-sm text-slate-600">Manage and publish career requirements for the public careers page.</p>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <InternalAccessBanner area="admin" />

        {message ? (
          <div className="rounded-2xl border border-[#1DA1F2]/40 bg-[#1DA1F2]/10 px-4 py-3 text-sm font-medium text-[#0B3D91]">
            {message}
          </div>
        ) : null}

        <div className="grid xl:grid-cols-[1.1fr_1fr] gap-6">
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-heading font-bold text-[#0B3D91]">
                {editingJob ? "Edit Requirement" : "Post New Requirement"}
              </h2>
              {editingJob ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm font-semibold text-[#0B3D91] hover:text-[#1DA1F2]"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <FormField label="Job Title" required error={errors.jobTitle}>
                <input value={form.jobTitle} onChange={(e) => setField("jobTitle", e.target.value)} className={inputClass(errors.jobTitle)} />
              </FormField>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Department" required error={errors.department}>
                  <input value={form.department} onChange={(e) => setField("department", e.target.value)} className={inputClass(errors.department)} />
                </FormField>

                <FormField label="Service Domain" required error={errors.serviceDomain}>
                  <select value={form.serviceDomain} onChange={(e) => setField("serviceDomain", e.target.value as JobRequirementInput["serviceDomain"])} className={inputClass(errors.serviceDomain)}>
                    {serviceDomains.map((domain) => (
                      <option key={domain}>{domain}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <FormField label="Location" required error={errors.location}>
                  <input value={form.location} onChange={(e) => setField("location", e.target.value)} className={inputClass(errors.location)} />
                </FormField>
                <FormField label="Job Type" required error={errors.jobType}>
                  <select value={form.jobType} onChange={(e) => setField("jobType", e.target.value as JobRequirementInput["jobType"])} className={inputClass(errors.jobType)}>
                    {jobTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Experience Level">
                  <select value={form.experienceLevel} onChange={(e) => setField("experienceLevel", e.target.value as JobRequirementInput["experienceLevel"])} className={inputClass()}>
                    {experienceLevels.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <FormField label="Work Mode">
                  <select value={form.workMode} onChange={(e) => setField("workMode", e.target.value as JobRequirementInput["workMode"])} className={inputClass()}>
                    {workModes.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Salary Range">
                  <input value={form.salaryRange} onChange={(e) => setField("salaryRange", e.target.value)} className={inputClass()} placeholder="e.g. $80,000 - $100,000" />
                </FormField>
                <FormField label="Status" required error={errors.status}>
                  <select value={form.status} onChange={(e) => setField("status", e.target.value as JobRequirementInput["status"])} className={inputClass(errors.status)}>
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Short Description" required error={errors.shortDescription}>
                <textarea rows={3} value={form.shortDescription} onChange={(e) => setField("shortDescription", e.target.value)} className={inputClass(errors.shortDescription)} />
              </FormField>

              <FormField label="Responsibilities">
                <textarea rows={4} value={form.responsibilities} onChange={(e) => setField("responsibilities", e.target.value)} className={inputClass()} />
              </FormField>

              <FormField label="Requirements / Skills">
                <textarea rows={4} value={form.requirementsSkills} onChange={(e) => setField("requirementsSkills", e.target.value)} className={inputClass()} />
              </FormField>

              <FormField label="Application Email">
                <input type="email" value={form.applicationEmail} onChange={(e) => setField("applicationEmail", e.target.value)} className={inputClass()} placeholder="careers@sdsconsultingservices.com" />
              </FormField>

              <div className="pt-2">
                <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-16px_rgba(11,61,145,0.8)] hover:opacity-95">
                  {editingJob ? "Update Requirement" : "Save Requirement"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
            <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Posted Requirements</h2>
            <p className="mt-1 text-sm text-slate-600">Use actions to edit, publish/unpublish, close, or delete requirements.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={inputClass()}
                placeholder="Search by title, department, location"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as (typeof statusFilterOptions)[number])}
                className={inputClass()}
              >
                {statusFilterOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <select
                value={serviceDomainFilter}
                onChange={(e) =>
                  setServiceDomainFilter(
                    e.target.value as (typeof serviceDomainFilterOptions)[number],
                  )
                }
                className={inputClass()}
              >
                {serviceDomainFilterOptions.map((domain) => (
                  <option key={domain}>{domain}</option>
                ))}
              </select>
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value as (typeof jobTypeFilterOptions)[number])}
                className={inputClass()}
              >
                {jobTypeFilterOptions.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                    <th className="py-3 pr-3 font-semibold">Job Title</th>
                    <th className="py-3 pr-3 font-semibold">Department</th>
                    <th className="py-3 pr-3 font-semibold">Location</th>
                    <th className="py-3 pr-3 font-semibold">Job Type</th>
                    <th className="py-3 pr-3 font-semibold">Status</th>
                    <th className="py-3 pr-3 font-semibold">Posted Date</th>
                    <th className="py-3 pr-3 font-semibold">Updated Date</th>
                    <th className="py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No job requirements posted yet.
                      </td>
                    </tr>
                  ) : filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No jobs match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr key={job.id} className="border-b border-[#E5E7EB]/80 align-top">
                        <td className="py-3 pr-3 font-medium text-slate-900">{job.jobTitle}</td>
                        <td className="py-3 pr-3 text-slate-700">{job.department}</td>
                        <td className="py-3 pr-3 text-slate-700">{job.location}</td>
                        <td className="py-3 pr-3 text-slate-700">{job.jobType}</td>
                        <td className="py-3 pr-3">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="py-3 pr-3 text-slate-700">
                          {formatDate(job.postedDate)}
                        </td>
                        <td className="py-3 pr-3 text-slate-700">
                          {formatDate(job.updatedAt)}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <ActionButton onClick={() => onEdit(job)} icon={Pencil} label="Edit" />
                            <ActionButton
                              onClick={() => onPublishToggle(job)}
                              icon={job.status === "Published" ? EyeOff : Eye}
                              label={job.status === "Published" ? "Unpublish" : "Publish"}
                            />
                            <ActionButton onClick={() => onClose(job)} icon={CircleX} label="Close" />
                            <ActionButton
                              onClick={() => setPendingDeleteJob(job)}
                              icon={Trash2}
                              label="Delete"
                              tone="danger"
                            />
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

      {pendingDeleteJob ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D91]/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_40px_60px_-30px_rgba(11,61,145,0.8)]">
            <h3 className="text-lg font-heading font-bold text-[#0B3D91]">Delete Job Requirement</h3>
            <p className="mt-3 text-sm text-slate-700">
              Are you sure you want to delete this job requirement? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteJob(null)}
                className="rounded-lg border border-[#E5E7EB] px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onDelete(pendingDeleteJob.id)}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Job
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

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function inputClass(hasError?: string) {
  return `w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25 ${
    hasError ? "border-red-500" : "border-[#E5E7EB]"
  }`;
}

function StatusBadge({ status }: { status: JobRequirement["status"] }) {
  const styles: Record<JobRequirement["status"], string> = {
    Draft: "bg-[#C0C0C0]/35 text-slate-700 border border-[#C0C0C0]/60",
    Published: "bg-[#1DA1F2]/15 text-[#0B3D91] border border-[#1DA1F2]/30",
    Closed: "bg-red-100 text-red-700 border border-red-200",
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
