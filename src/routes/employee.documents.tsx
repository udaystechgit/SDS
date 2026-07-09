import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";

export const Route = createFileRoute("/employee/documents")({
  component: EmployeeDocumentsPage,
});

const documents = [
  { title: "Offer Letter", description: "Original SDS employment offer document." },
  { title: "Employment Agreement", description: "Signed employment agreement and role terms." },
  { title: "Payslips", description: "Payroll statements and compensation records." },
  { title: "Tax Documents", description: "Annual tax forms and related documents." },
] as const;

function EmployeeDocumentsPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
          Employee Records
        </p>
        <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">Documents</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Access common employment documents and payroll records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {documents.map((document) => (
          <section
            key={document.title}
            className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1DA1F2]/10 text-[#0B3D91]">
              <FileText className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-heading font-bold text-[#0B3D91]">{document.title}</h2>
            <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
              {document.description}
            </p>
            <button
              type="button"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-[#0B3D91] transition hover:bg-[#1DA1F2]/10"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </section>
        ))}
      </div>
    </section>
  );
}
