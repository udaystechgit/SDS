import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuthenticatedRole, requireServiceRoleClient } from "@/lib/api/auth.server";
import { setNoStoreResponseHeaders } from "@/lib/api/http.server";

const statusSchema = z.enum(["new", "reviewed", "closed"]);

const listInputSchema = z.object({
  status: z.enum(["all", "new", "reviewed", "closed"]).default("all"),
});

const updateInputSchema = z.object({
  id: z.string().uuid(),
  status: statusSchema,
  internalNotes: z.string().max(5000).default(""),
});

export type ContactStatus = z.infer<typeof statusSchema>;

export type AdminContactSubmission = {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  service: string;
  message: string;
  status: ContactStatus;
  assignedTo: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

function toModel(row: Record<string, unknown>): AdminContactSubmission {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    company: String(row.company ?? ""),
    phone: row.phone ? String(row.phone) : null,
    service: String(row.service ?? ""),
    message: String(row.message ?? ""),
    status: statusSchema.parse(row.status),
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    internalNotes: row.internal_notes ? String(row.internal_notes) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export const listAdminContactSubmissionsFn = createServerFn({ method: "POST" })
  .inputValidator(listInputSchema)
  .handler(async ({ data }) => {
    setNoStoreResponseHeaders();
    await requireAuthenticatedRole(["admin", "staff"]);
    const client = requireServiceRoleClient();

    let query = client
      .from("contact_submissions")
      .select("id,name,email,company,phone,service,message,status,assigned_to,internal_notes,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Failed to list contact submissions", {
        code: error.code,
        message: error.message,
      });
      throw new Error("Unable to load contact inquiries.");
    }

    return {
      submissions: (rows ?? []).map((row) => toModel(row as Record<string, unknown>)),
    };
  });

export const updateAdminContactSubmissionFn = createServerFn({ method: "POST" })
  .inputValidator(updateInputSchema)
  .handler(async ({ data }) => {
    setNoStoreResponseHeaders();
    const auth = await requireAuthenticatedRole(["admin", "staff"]);
    const client = requireServiceRoleClient();

    const { data: updated, error } = await client
      .from("contact_submissions")
      .update({
        status: data.status,
        internal_notes: data.internalNotes.trim() || null,
        assigned_to: auth.userId,
      })
      .eq("id", data.id)
      .select("id,name,email,company,phone,service,message,status,assigned_to,internal_notes,created_at,updated_at")
      .single();

    if (error) {
      console.error("Failed to update contact submission", {
        code: error.code,
        message: error.message,
      });
      throw new Error("Unable to update this inquiry.");
    }

    if (data.internalNotes.trim()) {
      const { error: activityError } = await client.from("contact_activity").insert({
        contact_submission_id: data.id,
        user_id: auth.userId,
        action: "note_updated",
        note: data.internalNotes.trim(),
      });

      if (activityError) {
        console.error("Failed to log contact note update", {
          code: activityError.code,
          message: activityError.message,
        });
      }
    }

    return { submission: toModel(updated as Record<string, unknown>) };
  });
