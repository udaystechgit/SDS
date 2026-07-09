import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { getEmployeeProfileFn } from "@/lib/api/employee.functions";
import { useAuth } from "@/lib/auth-context";
import type { EmployeeProfile } from "@/lib/types/employee";

export const Route = createFileRoute("/employee/profile")({
  component: EmployeeProfilePage,
});

function EmployeeProfilePage() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!session?.access_token) {
          throw new Error("Authentication is required.");
        }

        const result = await getEmployeeProfileFn({
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (mounted) {
          setProfile(result.profile);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load profile.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

  const cards = useMemo(
    () =>
      profile
        ? [
            {
              title: "Personal Information",
              rows: [
                { label: "Name", value: profile.fullName },
                { label: "Email", value: profile.email },
                { label: "Phone", value: profile.phone },
              ],
            },
            {
              title: "Employment Information",
              rows: [
                { label: "Employee ID", value: profile.employeeId },
                { label: "Department", value: profile.department },
                { label: "Job Title", value: profile.jobTitle },
                { label: "Status", value: profile.status },
                { label: "Work Location", value: profile.workLocation },
                { label: "Hire Date", value: profile.hireDate },
              ],
            },
            {
              title: "Assignment Information",
              rows: [
                { label: "Client", value: profile.clientName ?? "Not assigned" },
                { label: "Project", value: profile.assignmentName ?? "Not assigned" },
                { label: "Manager", value: profile.managerName },
              ],
            },
          ]
        : [],
    [profile],
  );

  return (
    <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
          Employee Profile
        </p>
        <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">My Profile</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Review your core SDS employee information and current assignment details.
        </p>
      </div>

      {isLoading ? (
        <StatusPanel message="Loading employee profile..." />
      ) : errorMessage ? (
        <StatusPanel message={errorMessage} tone="error" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {cards.map((card) => (
            <InfoCard key={card.title} title={card.title} rows={card.rows} />
          ))}
        </div>
      )}
    </section>
  );
}

function StatusPanel({
  message,
  tone = "default",
}: {
  message: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={`rounded-2xl border p-5 text-sm font-medium ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[#E5E7EB] bg-white text-[#0B3D91]"
      }`}
    >
      {message}
    </div>
  );
}

function InfoCard({
  title,
  rows,
}: {
  title: string;
  rows: ReadonlyArray<{ label: string; value: string }>;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-heading font-bold text-[#0B3D91]">{title}</h2>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-[#E5E7EB] bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {row.label}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{row.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
