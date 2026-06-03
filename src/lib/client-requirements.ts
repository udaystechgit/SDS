export const CLIENT_REQUIREMENTS_STORAGE_KEY = "sds_client_requirements";

export type ClientServiceDomain =
  | "IT & AI Services"
  | "Data Center & Infrastructure Services"
  | "Operations Support";

export type ClientPriority = "Low" | "Medium" | "High" | "Urgent";

export type ClientRequirementStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "In Progress"
  | "Completed"
  | "Closed";

export interface ClientRequirementRecord {
  id: string;
  clientName: string;
  serviceDomain: ClientServiceDomain;
  serviceNeeded: string;
  projectName: string;
  location: string;
  workMode: "On-site" | "Remote" | "Hybrid";
  requiredStartDate: string;
  expectedDuration: string;
  requiredSkills: string;
  numberOfResourcesNeeded: number;
  budgetRateRange: string;
  description: string;
  priority: ClientPriority;
  status: ClientRequirementStatus;
  createdAt: string;
  updatedAt: string;
}

export type ClientRequirementInput = Omit<
  ClientRequirementRecord,
  "id" | "createdAt" | "updatedAt"
>;

function isClient() {
  return typeof window !== "undefined";
}

export function readClientRequirements(): ClientRequirementRecord[] {
  if (!isClient()) return [];

  try {
    const raw = window.localStorage.getItem(CLIENT_REQUIREMENTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed as ClientRequirementRecord[];
  } catch {
    return [];
  }
}

export function saveClientRequirements(requirements: ClientRequirementRecord[]) {
  if (!isClient()) return;
  window.localStorage.setItem(CLIENT_REQUIREMENTS_STORAGE_KEY, JSON.stringify(requirements));
}

export function createClientRequirement(input: ClientRequirementInput): ClientRequirementRecord {
  const nowIso = new Date().toISOString();
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function updateClientRequirement(
  current: ClientRequirementRecord,
  patch: Partial<ClientRequirementInput>,
): ClientRequirementRecord {
  return {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}
