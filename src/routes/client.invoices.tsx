import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { InternalPortalNav } from "@/components/InternalPortalNav";
import { PortalBanner } from "@/components/PortalBanner";
import { readInvoices, type InvoiceRecord } from "@/lib/invoices";
import { readTimesheets } from "@/lib/timesheets";

export const Route = createFileRoute("/client/invoices")({
  component: ClientInvoicesPage,
});

function ClientInvoicesPage() {
  const invoices = readInvoices();
  const timesheets = readTimesheets();

  const phaseOneInvoices = useMemo(() => {
    const generated: InvoiceRecord[] = timesheets
      .filter((timesheet) => timesheet.status === "Approved")
      .map((timesheet, index) => {
        const billingRate = 80;

        return {
          id: `generated-${timesheet.id}`,
          invoiceNumber: `INV-${new Date().getFullYear()}-${(index + 1)
            .toString()
            .padStart(4, "0")}`,
          clientName: timesheet.client || "Client Account",
          billingPeriod: `${timesheet.weekStartDate} to ${timesheet.weekEndDate}`,
          employeeUID: timesheet.employeeUID,
          resourceName: timesheet.employeeName,
          project: timesheet.project || "-",
          approvedHours: timesheet.totalHours,
          billingRate,
          totalAmount: timesheet.totalHours * billingRate,
          status: "Draft",
          sourceTimesheetId: timesheet.id,
          createdAt: timesheet.updatedAt,
          updatedAt: timesheet.updatedAt,
        } satisfies InvoiceRecord;
      });

    return invoices.length > 0 ? invoices : generated;
  }, [invoices, timesheets]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="client" />
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PortalBanner extraMessage="Client login and secure billing access will be added in backend phase." />

        <div>
          <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">Client Invoices</h1>
          <p className="mt-1 text-slate-600">
            Phase 1 invoice view generated from approved timesheets.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                <th className="py-3">Invoice Number</th>
                <th className="py-3">Client Name</th>
                <th className="py-3">Billing Period</th>
                <th className="py-3">Employee UID</th>
                <th className="py-3">Resource Name</th>
                <th className="py-3">Project</th>
                <th className="py-3">Approved Hours</th>
                <th className="py-3">Billing Rate</th>
                <th className="py-3">Total Amount</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {phaseOneInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No invoices available yet.
                  </td>
                </tr>
              ) : (
                phaseOneInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-[#E5E7EB]/70">
                    <td className="py-3 font-semibold text-slate-900">{invoice.invoiceNumber}</td>
                    <td className="py-3">{invoice.clientName}</td>
                    <td className="py-3">{invoice.billingPeriod}</td>
                    <td className="py-3 font-mono text-xs font-semibold text-[#1DA1F2]">
                      {invoice.employeeUID}
                    </td>
                    <td className="py-3">{invoice.resourceName}</td>
                    <td className="py-3">{invoice.project}</td>
                    <td className="py-3">{invoice.approvedHours}</td>
                    <td className="py-3">${invoice.billingRate.toFixed(2)}</td>
                    <td className="py-3 font-semibold text-[#0B3D91]">
                      ${invoice.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-[#1DA1F2]/10 px-2 py-1 text-xs text-[#0B3D91]">
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
