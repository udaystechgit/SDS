export const JOB_REQUIREMENTS_STORAGE_KEY = "sds_job_requirements";

export type JobStatus = "Draft" | "Published" | "Closed";

export interface JobRequirement {
  id: string;
  jobTitle: string;
  department: string;
  serviceDomain:
    | "IT & AI Services"
    | "Data Center & Infrastructure Services"
    | "Operations"
    | "Sales / Business Development"
    | "Administration";
  location: string;
  jobType: "Full-time" | "Part-time" | "Contract" | "Internship" | "Temporary";
  experienceLevel: "Entry Level" | "Mid Level" | "Senior Level" | "Lead / Manager";
  workMode: "On-site" | "Remote" | "Hybrid";
  shortDescription: string;
  responsibilities: string;
  requirementsSkills: string;
  salaryRange: string;
  applicationEmail: string;
  status: JobStatus;
  postedDate: string;
  createdAt: string;
  updatedAt: string;
}

export type JobRequirementInput = Omit<
  JobRequirement,
  "id" | "postedDate" | "createdAt" | "updatedAt"
>;

function isClient() {
  return typeof window !== "undefined";
}

export function readJobRequirements(): JobRequirement[] {
  if (!isClient()) return [];

  try {
    const raw = window.localStorage.getItem(JOB_REQUIREMENTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed as JobRequirement[];
  } catch {
    return [];
  }
}

export function saveJobRequirements(jobs: JobRequirement[]) {
  if (!isClient()) return;
  window.localStorage.setItem(JOB_REQUIREMENTS_STORAGE_KEY, JSON.stringify(jobs));
}

export function createJobRequirement(input: JobRequirementInput): JobRequirement {
  const nowIso = new Date().toISOString();
  return {
    ...input,
    id: crypto.randomUUID(),
    postedDate: input.status === "Published" ? nowIso : "",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function updateJobRequirement(
  current: JobRequirement,
  patch: Partial<JobRequirementInput>,
): JobRequirement {
  const nowIso = new Date().toISOString();
  const nextStatus = patch.status ?? current.status;

  const shouldSetPostedDate =
    current.status !== "Published" && nextStatus === "Published";

  return {
    ...current,
    ...patch,
    status: nextStatus,
    postedDate: shouldSetPostedDate
      ? nowIso
      : nextStatus === "Published"
        ? current.postedDate || nowIso
        : nextStatus === "Draft"
          ? ""
          : current.postedDate,
    updatedAt: nowIso,
  };
}

export function getPublishedJobRequirements(jobs: JobRequirement[]) {
  return jobs
    .filter((job) => job.status === "Published")
    .sort((a, b) => (a.postedDate < b.postedDate ? 1 : -1));
}
