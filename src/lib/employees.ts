export const EMPLOYEES_STORAGE_KEY = "sds_employees";
export const EMPLOYEE_COUNTER_KEY = "sds_employee_counter";

export type EmployeeType = "Full-time" | "Part-time" | "Contractor" | "Consultant" | "Intern";
export type ServiceDomain =
  | "IT & AI Services"
  | "Data Center & Infrastructure Services"
  | "Operations"
  | "Sales / Business Development"
  | "Administration";
export type WorkMode = "On-site" | "Remote" | "Hybrid";
export type EmployeeStatus = "Active" | "Inactive" | "On Hold" | "Completed";

export interface EmployeeRecord {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  employeeType: EmployeeType;
  assignedClient: string;
  assignedProject: string;
  serviceDomain: ServiceDomain;
  startDate: string;
  endDate: string;
  workMode: WorkMode;
  workLocation: string;
  hourlyRate: string;
  billingRate: string;
  responsibilities: string;
  requiredSkills: string;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

export type EmployeeInput = Omit<EmployeeRecord, "id" | "uid" | "createdAt" | "updatedAt">;

function isClient() {
  return typeof window !== "undefined";
}

function generateUID(): string {
  if (!isClient()) return "SDS-0000-0000";

  const year = new Date().getFullYear();
  const counterStr = localStorage.getItem(EMPLOYEE_COUNTER_KEY) || "0";
  const counter = parseInt(counterStr, 10) + 1;
  localStorage.setItem(EMPLOYEE_COUNTER_KEY, counter.toString());

  const paddedCounter = counter.toString().padStart(4, "0");
  return `SDS-${year}-${paddedCounter}`;
}

export function readEmployees(): EmployeeRecord[] {
  if (!isClient()) return [];

  try {
    const raw = window.localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed as EmployeeRecord[];
  } catch {
    return [];
  }
}

export function saveEmployees(employees: EmployeeRecord[]) {
  if (!isClient()) return;
  window.localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
}

export function createEmployee(input: EmployeeInput): EmployeeRecord {
  const nowIso = new Date().toISOString();
  const uid = generateUID();
  return {
    ...input,
    id: crypto.randomUUID(),
    uid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function updateEmployee(
  current: EmployeeRecord,
  patch: Partial<EmployeeInput>,
): EmployeeRecord {
  const nowIso = new Date().toISOString();
  return {
    ...current,
    ...patch,
    updatedAt: nowIso,
  };
}

export function getEmployeeByUID(uid: string): EmployeeRecord | null {
  const employees = readEmployees();
  return employees.find((e) => e.uid === uid) ?? null;
}

export function getEmployeeById(id: string): EmployeeRecord | null {
  const employees = readEmployees();
  return employees.find((e) => e.id === id) ?? null;
}

export function getActiveEmployees(): EmployeeRecord[] {
  return readEmployees().filter((e) => e.status === "Active");
}
