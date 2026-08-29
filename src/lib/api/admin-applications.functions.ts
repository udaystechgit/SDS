import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuthenticatedRole, requireServiceRoleClient } from "@/lib/api/auth.server";

const statusSchema = z.enum([
  "new",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
]);

const updateSchema = z.object({
  id: z.string().uuid(),
  status: statusSchema,
  internalNotes: z.string().max(8000).optional().default(""),
});

const resumeSchema = z.object({ id: z.string().uuid() });

export const listJobApplicationsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAuthenticatedRole(["admin", "staff"]);
  const client = requireServiceRoleClient();

  const { data, error } = await client
    .from("job_applications")
    .select(
      "id, job_id, job_title, full_name, email, phone, cover_letter, resume_path, resume_filename, resume_mime_type, resume_size, status, assigned_to, internal_notes, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load job applications.");

  return { applications: data ?? [] };
});

export const getJobApplicationActivityFn = createServerFn({ method: "POST" })
  .inputValidator(resumeSchema)
  .handler(async ({ data }) => {
    await requireAuthenticatedRole(["admin", "staff"]);
    const client = requireServiceRoleClient();

    const { data: activity, error } = await client
      .from("job_application_activity")
      .select("id, application_id, user_id, action, old_status, new_status, note, created_at")
      .eq("application_id", data.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Unable to load application activity.");
    return { activity: activity ?? [] };
  });

export const updateJobApplicationFn = createServerFn({ method: "POST" })
  .inputValidator(updateSchema)
  .handler(async ({ data }) => {
    const auth = await requireAuthenticatedRole(["admin", "staff"]);
    const client = requireServiceRoleClient();

    const { data: existing, error: existingError } = await client
      .from("job_applications")
      .select("id, status, internal_notes, assigned_to")
      .eq("id", data.id)
      .single();

    if (existingError || !existing) throw new Error("Application not found.");

    const { data: updated, error } = await client
      .from("job_applications")
      .update({
        status: data.status,
        internal_notes: data.internalNotes.trim() || null,
        assigned_to: existing.assigned_to ?? auth.userId,
      })
      .eq("id", data.id)
      .select(
        "id, job_id, job_title, full_name, email, phone, cover_letter, resume_path, resume_filename, resume_mime_type, resume_size, status, assigned_to, internal_notes, created_at, updated_at",
      )
      .single();

    if (error || !updated) throw new Error("Unable to update application.");

    if ((existing.internal_notes ?? "") !== data.internalNotes.trim()) {
      await client.from("job_application_activity").insert({
        application_id: data.id,
        user_id: auth.userId,
        action: "notes_updated",
        old_status: existing.status,
        new_status: data.status,
        note: "Internal notes updated.",
      });
    }

    return { application: updated };
  });

export const getResumeDownloadUrlFn = createServerFn({ method: "POST" })
  .inputValidator(resumeSchema)
  .handler(async ({ data }) => {
    await requireAuthenticatedRole(["admin", "staff"]);
    const client = requireServiceRoleClient();

    const { data: application, error } = await client
      .from("job_applications")
      .select("resume_path, resume_filename")
      .eq("id", data.id)
      .single();

    if (error || !application?.resume_path) throw new Error("Resume not found.");

    const { data: signed, error: signError } = await client.storage
      .from("resumes")
      .createSignedUrl(application.resume_path, 300, {
        download: application.resume_filename || true,
      });

    if (signError || !signed?.signedUrl) throw new Error("Unable to prepare resume download.");

    return { url: signed.signedUrl };
  });
