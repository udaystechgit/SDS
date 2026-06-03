export const INVOICES_STORAGE_KEY = "sds_invoices";

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  clientName: string;
  billingPeriod: string;
  employeeUID: string;
  resourceName: string;
  project: string;
  approvedHours: number;
  billingRate: number;
  totalAmount: number;
  status: InvoiceStatus;
  sourceTimesheetId?: string;
  createdAt: string;
  updatedAt: string;
}

function isClient() {
  return typeof window !== "undefined";
}

export function readInvoices(): InvoiceRecord[] {
  if (!isClient()) return [];

  try {
    const raw = window.localStorage.getItem(INVOICES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed as InvoiceRecord[];
  } catch {
    return [];
  }
}

export function saveInvoices(invoices: InvoiceRecord[]) {
  if (!isClient()) return;
  window.localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
}

export function createInvoice(
  input: Omit<InvoiceRecord, "id" | "createdAt" | "updatedAt">,
): InvoiceRecord {
  const nowIso = new Date().toISOString();
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
