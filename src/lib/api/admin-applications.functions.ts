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

const notifyableStatusSchema = z.enum([
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
]);

const updateSchema = z.object({
  id: z.string().uuid(),
  status: statusSchema,
  internalNotes: z.string().max(8000).optional().default(""),
});

const resumeSchema = z.object({ id: z.string().uuid() });
const notifySchema = z.object({ id: z.string().uuid(), status: notifyableStatusSchema });

const CAREERS_FROM = "SDS Careers <careers@sdsconsultingservice.com>";
const HR_EMAIL = "hr@sdsconsultingservice.com";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function candidateStatusContent(status: z.infer<typeof notifyableStatusSchema>, jobTitle: string) {
  switch (status) {
    case "shortlisted":
      return {
        subject: `Application Update — ${jobTitle} | SDS Consulting Services`,
        heading: "You have been shortlisted",
        body: "Your application has been shortlisted for further consideration. Our recruitment team will contact you if additional information or next steps are required.",
      };
    case "interview":
      return {
        subject: `Interview Stage — ${jobTitle} | SDS Consulting Services`,
        heading: "Your application has moved to the interview stage",
        body: "We would like to continue the conversation regarding this opportunity. An SDS team member will contact you separately with interview scheduling details.",
      };
    case "offered":
      return {
        subject: `Application Update — ${jobTitle} | SDS Consulting Services`,
        heading: "Offer stage update",
        body: "Your application has progressed to the offer stage. An SDS representative will contact you directly with the applicable offer details and next steps.",
      };
    case "hired":
      return {
        subject: `Welcome to SDS — ${jobTitle}`,
        heading: "Welcome to SDS Consulting Services",
        body: "We are pleased to confirm that your application has progressed to hired status. Our team will contact you with onboarding instructions and any documents required to complete the process.",
      };
    case "rejected":
      return {
        subject: `Application Update — ${jobTitle} | SDS Consulting Services`,
        heading: "Update on your application",
        body: "Thank you for the time and effort you invested in your application. After review, we will not be moving forward with your application for this position. We appreciate your interest in SDS Consulting Services and wish you success in your search.",
      };
  }
}

function candidateStatusEmailHtml(fullName: string, jobTitle: string, status: z.infer<typeof notifyableStatusSchema>) {
  const content = candidateStatusContent(status, jobTitle);
  const safeName = escapeHtml(fullName);
  const safeJobTitle = escapeHtml(jobTitle);

  return `
    <div style="margin:0;padding:32px 16px;background:#f4f8ff;font-family:Arial,sans-serif;color:#172033;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
        <div style="padding:26px 30px;background:linear-gradient(135deg,#0B3D91,#1DA1F2);color:#ffffff;">
          <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">SDS Consulting Services</div>
          <h1 style="margin:8px 0 0;font-size:25px;line-height:1.25;">${escapeHtml(content.heading)}</h1>
        </div>
        <div style="padding:30px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.65;">Hello ${safeName},</p>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.65;">${escapeHtml(content.body)}</p>
          <div style="margin:24px 0;padding:18px;background:#f7faff;border-radius:12px;border:1px solid #dcecff;">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#64748b;">Position</div>
            <div style="margin-top:6px;font-size:17px;font-weight:700;color:#0B3D91;">${safeJobTitle}</div>
          </div>
          <p style="margin:0;font-size:14px;line-height:1.65;color:#64748b;">If you need to respond, simply reply to this email and your message will reach the SDS HR team.</p>
        </div>
        <div style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.6;color:#64748b;">
          SDS Consulting Services LLC<br/>AI & Data Center Experts<br/>sdsconsultingservice.com
        </div>
      </div>
    </div>
  `;
}

async function sendCandidateEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("Email service is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CAREERS_FROM,
      to: [to],
      subject,
      html,
      reply_to: HR_EMAIL,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("CANDIDATE STATUS EMAIL ERROR", {
      status: response.status,
      body: body.slice(0, 1000),
      recipientDomain: to.split("@")[1] ?? "unknown",
    });
    throw new Error("Unable to send the candidate email right now.");
  }

  return (await response.json()) as { id?: string };
}

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

export const notifyCandidateStatusFn = createServerFn({ method: "POST" })
  .inputValidator(notifySchema)
  .handler(async ({ data }) => {
    const auth = await requireAuthenticatedRole(["admin", "staff"]);
    const client = requireServiceRoleClient();

    const { data: application, error } = await client
      .from("job_applications")
      .select("id, full_name, email, job_title, status")
      .eq("id", data.id)
      .single();

    if (error || !application) throw new Error("Application not found.");
    if (application.status !== data.status) {
      throw new Error("Save the selected status before notifying the candidate.");
    }

    const content = candidateStatusContent(data.status, application.job_title);
    const email = await sendCandidateEmail(
      application.email,
      content.subject,
      candidateStatusEmailHtml(application.full_name, application.job_title, data.status),
    );

    await client.from("job_application_activity").insert({
      application_id: application.id,
      user_id: auth.userId,
      action: "candidate_status_email_sent",
      old_status: application.status,
      new_status: application.status,
      note: `Candidate notified by email about ${data.status} status${email.id ? ` (Resend ${email.id})` : ""}.`,
    });

    return { sent: true, status: data.status };
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
