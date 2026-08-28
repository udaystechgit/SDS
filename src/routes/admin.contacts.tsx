import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Phone, Search, MessageSquareText, RefreshCw } from "lucide-react";

import { AdminNav } from "@/components/AdminNav";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import { useAuth } from "@/lib/auth-context";
import {
  listAdminContactSubmissionsFn,
  updateAdminContactSubmissionFn,
  type AdminContactSubmission,
  type ContactStatus,
} from "@/lib/api/admin-contact.functions";

export const Route = createFileRoute("/admin/contacts")({
  component: AdminContactsPage,
});

const statusOptions = ["all", "new", "reviewed", "closed"] as const;

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClasses(status: ContactStatus) {
  if (status === "new") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "reviewed") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function AdminContactsPage() {
  const { session } = useAuth();
  const [submissions, setSubmissions] = useState<AdminContactSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("all");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ContactStatus>("new");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => submissions.find((item) => item.id === selectedId) ?? null,
    [selectedId, submissions],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q) ||
        item.service.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, submissions]);

  const counts = useMemo(
    () => ({
      all: submissions.length,
      new: submissions.filter((item) => item.status === "new").length,
      reviewed: submissions.filter((item) => item.status === "reviewed").length,
      closed: submissions.filter((item) => item.status === "closed").length,
    }),
    [submissions],
  );

  const loadSubmissions = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await listAdminContactSubmissionsFn({
        data: { status: "all" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setSubmissions(result.submissions);
      setSelectedId((current) => current ?? result.submissions[0]?.id ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load contact inquiries.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    if (!selected) return;
    setNotes(selected.internalNotes ?? "");
    setStatus(selected.status);
  }, [selected]);

  async function saveSelected() {
    if (!selected || !session?.access_token) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await updateAdminContactSubmissionFn({
        data: {
          id: selected.id,
          status,
          internalNotes: notes,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setSubmissions((items) =>
        items.map((item) => (item.id === result.submission.id ? result.submission : item)),
      );
      setMessage("Inquiry updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update this inquiry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <InternalAccessBanner area="admin" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">Customer Inquiries</p>
            <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">Contact Management</h1>
            <p className="mt-1 text-sm text-slate-600">Review website inquiries, update status, and keep internal notes.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadSubmissions()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-[#1DA1F2]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {message ? (
          <div className="rounded-2xl border border-[#1DA1F2]/30 bg-[#1DA1F2]/10 px-4 py-3 text-sm font-medium text-[#0B3D91]">
            {message}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-4">
          {statusOptions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatusFilter(item)}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                statusFilter === item ? "border-[#1DA1F2] bg-[#1DA1F2]/10" : "border-[#E5E7EB] bg-white"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item}</p>
              <p className="mt-1 text-2xl font-bold text-[#0B3D91]">{counts[item]}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E5E7EB] p-4">
              <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, company, service..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="max-h-[720px] overflow-y-auto divide-y divide-[#E5E7EB]">
              {loading ? (
                <p className="p-5 text-sm text-slate-500">Loading inquiries...</p>
              ) : filtered.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No inquiries match this filter.</p>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full p-4 text-left transition ${selectedId === item.id ? "bg-[#1DA1F2]/10" : "hover:bg-slate-50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                        <p className="text-sm text-slate-500 truncate">{item.company}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold uppercase ${statusClasses(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#0B3D91] truncate">{item.service}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
            {!selected ? (
              <div className="flex min-h-[320px] items-center justify-center text-center text-sm text-slate-500">
                Select an inquiry to view details.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0B3D91]">{selected.name}</h2>
                    <p className="text-sm text-slate-500">Received {formatDate(selected.createdAt)}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${statusClasses(selected.status)}`}>
                    {selected.status}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <a href={`mailto:${selected.email}`} className="rounded-xl border border-[#E5E7EB] p-3 hover:border-[#1DA1F2]">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><Mail className="h-4 w-4" /> Email</span>
                    <span className="mt-1 block break-all text-sm font-medium text-slate-900">{selected.email}</span>
                  </a>
                  <a href={selected.phone ? `tel:${selected.phone}` : undefined} className="rounded-xl border border-[#E5E7EB] p-3 hover:border-[#1DA1F2]">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><Phone className="h-4 w-4" /> Phone</span>
                    <span className="mt-1 block text-sm font-medium text-slate-900">{selected.phone || "Not provided"}</span>
                  </a>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div><p className="text-xs font-semibold uppercase text-slate-500">Company</p><p className="mt-1 text-sm font-medium text-slate-900">{selected.company}</p></div>
                  <div><p className="text-xs font-semibold uppercase text-slate-500">Service</p><p className="mt-1 text-sm font-medium text-slate-900">{selected.service}</p></div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><MessageSquareText className="h-4 w-4" /> Customer message</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{selected.message}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                  <label>
                    <span className="text-sm font-semibold text-slate-800">Status</span>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as ContactStatus)}
                      className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1DA1F2]"
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-800">Internal notes</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={5}
                      placeholder="Add internal follow-up notes. These are never shown to the customer."
                      className="mt-2 w-full resize-y rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1DA1F2]"
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void saveSelected()}
                    disabled={saving}
                    className="rounded-xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
