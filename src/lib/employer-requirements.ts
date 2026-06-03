export const EMPLOYER_REQUIREMENTS_STORAGE_KEY = "sds_employer_requirements";

export type EmployerRequirementStatus =
  | "Draft"
  | "Submitted"
  | "Approved by Admin"
  | "Published"
  | "Closed";

export interface EmployerRequirementRecord {
  id: string;
  employerName: string;
  jobTitle: string;
  department: string;
  clientProject: string;
  location: string;
  jobType: string;
  workMode: "On-site" | "Remote" | "Hybrid";
  experienceLevel: string;
  requiredSkills: string;
  responsibilities: string;
  numberOfOpenings: number;
  startDate: string;
  duration: string;
  rateRange: string;
  status: EmployerRequirementStatus;
  createdAt: string;
  updatedAt: string;
}

export type EmployerRequirementInput = Omit<
  EmployerRequirementRecord,
  "id" | "createdAt" | "updatedAt"
>;

function isClient() {
  return typeof window !== "undefined";
}

export function readEmployerRequirements(): EmployerRequirementRecord[] {
  if (!isClient()) return [];

  try {
    const raw = window.localStorage.getItem(EMPLOYER_REQUIREMENTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed as EmployerRequirementRecord[];
  } catch {
    return [];
  }
}

export function saveEmployerRequirements(requirements: EmployerRequirementRecord[]) {
  if (!isClient()) return;
  window.localStorage.setItem(EMPLOYER_REQUIREMENTS_STORAGE_KEY, JSON.stringify(requirements));
}

export function createEmployerRequirement(
  input: EmployerRequirementInput,
): EmployerRequirementRecord {
  const nowIso = new Date().toISOString();
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function updateEmployerRequirement(
  current: EmployerRequirementRecord,
  patch: Partial<EmployerRequirementInput>,
): EmployerRequirementRecord {
  return {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}
