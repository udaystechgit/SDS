import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireServiceRoleClient } from "@/lib/api/auth.server";

const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const prepareUploadSchema = z.object({
  jobId: z.string().uuid(),
  fileName: z.string().min(1).max(180),
  mimeType: z.enum(allowedMimeTypes),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
});

const submitApplicationSchema = z.object({
  jobId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().default(""),
  aboutYourself: z.string().trim().max(4000).optional().default(""),
  roleInterest: z.string().trim().max(4000).optional().default(""),
  resumePath: z.string().min(1).max(500),
  resumeFilename: z.string().min(1).max(180),
  resumeMimeType: z.enum(allowedMimeTypes),
  resumeSize: z.number().int().positive().max(10 * 1024 * 1024),
});

const CAREERS_FROM = "SDS Careers <careers@sdsconsultingservice.com>";
const HR_EMAIL = "hr@sdsconsultingservice.com";
const ADMIN_APPLICATIONS_URL = "https://www.sdsconsultingservice.com/admin/applications";

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return cleaned || "resume";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function requirePublishedJob(jobId: string) {
  const client = requireServiceRoleClient();
  const { data: job, error } = await client
    .from("job_requirements")
    .select("id, job_title, status")
    .eq("id", jobId)
    .eq("status", "Published")
    .single();

  if (error || !job) {
    throw new Error("This job is no longer accepting applications.");
  }

  return { client, job };
}

type ResendEmail = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

async function sendResendEmail({ to, subject, html, replyTo }: ResendEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    console.warn("RESEND_API_KEY is not configured; skipping application email.");
    return { sent: false, reason: "not_configured" as const };
  }

  try {
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
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("RESEND EMAIL ERROR", {
        status: response.status,
        body: body.slice(0, 1000),
        recipientDomain: to.split("@")[1] ?? "unknown",
      });
      return { sent: false, reason: "provider_error" as const };
    }

    const result = (await response.json()) as { id?: string };
    return { sent: true, id: result.id ?? null };
  } catch (error) {
    console.error("RESEND EMAIL REQUEST FAILED", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { sent: false, reason: "request_failed" as const };
  }
}

function candidateEmailHtml(fullName: string, jobTitle: string) {
  const safeName = escapeHtml(fullName);
  const safeJobTitle = escapeHtml(jobTitle);

  return `
    <div style="margin:0;padding:32px 16px;background:#f4f8ff;font-family:Arial,sans-serif;color:#172033;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
        <div style="padding:26px 30px;background:linear-gradient(135deg,#0B3D91,#1DA1F2);color:#ffffff;">
          <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">SDS Consulting Services</div>
          <h1 style="margin:8px 0 0;font-size:25px;line-height:1.25;">Application received</h1>
        </div>
        <div style="padding:30px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.65;">Hello ${safeName},</p>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.65;">Thank you for applying for the <strong>${safeJobTitle}</strong> position with SDS Consulting Services. We have received your application and résumé successfully.</p>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.65;">Our team will review your qualifications. If your background matches the role requirements, an SDS team member will contact you regarding next steps.</p>
          <div style="margin:24px 0;padding:18px;background:#f7faff;border-radius:12px;border:1px solid #dcecff;">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#64748b;">Position</div>
            <div style="margin-top:6px;font-size:17px;font-weight:700;color:#0B3D91;">${safeJobTitle}</div>
          </div>
          <p style="margin:0;font-size:14px;line-height:1.65;color:#64748b;">Please do not send sensitive personal information by email. If we need additional documents, our team will contact you directly.</p>
        </div>
        <div style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.6;color:#64748b;">
          SDS Consulting Services LLC<br/>AI & Data Center Experts<br/>sdsconsultingservice.com
        </div>
      </div>
    </div>
  `;
}

function hrEmailHtml({
  applicationId,
  fullName,
  email,
  phone,
  jobTitle,
  resumeFilename,
}: {
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  resumeFilename: string;
}) {
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || "Not provided");
  const safeJobTitle = escapeHtml(jobTitle);
  const safeResume = escapeHtml(resumeFilename);
  const safeId = escapeHtml(applicationId);

  return `
    <div style="margin:0;padding:32px 16px;background:#f4f8ff;font-family:Arial,sans-serif;color:#172033;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
        <div style="padding:26px 30px;background:#0B3D91;color:#ffffff;">
          <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">SDS Recruitment</div>
          <h1 style="margin:8px 0 0;font-size:25px;line-height:1.25;">New job application</h1>
        </div>
        <div style="padding:30px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;line-height:1.5;">
            <tr><td style="padding:9px 0;color:#64748b;width:145px;">Candidate</td><td style="padding:9px 0;font-weight:700;">${safeName}</td></tr>
            <tr><td style="padding:9px 0;color:#64748b;">Position</td><td style="padding:9px 0;font-weight:700;color:#0B3D91;">${safeJobTitle}</td></tr>
            <tr><td style="padding:9px 0;color:#64748b;">Email</td><td style="padding:9px 0;">${safeEmail}</td></tr>
            <tr><td style="padding:9px 0;color:#64748b;">Phone</td><td style="padding:9px 0;">${safePhone}</td></tr>
            <tr><td style="padding:9px 0;color:#64748b;">Résumé</td><td style="padding:9px 0;">${safeResume}</td></tr>
            <tr><td style="padding:9px 0;color:#64748b;">Application ID</td><td style="padding:9px 0;font-family:monospace;font-size:13px;">${safeId}</td></tr>
          </table>
          <div style="margin-top:26px;">
            <a href="${ADMIN_APPLICATIONS_URL}" style="display:inline-block;background:#0B3D91;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px;">Review in SDS Admin</a>
          </div>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">The résumé remains private in SDS storage. Use the Admin Applications page to generate a secure temporary download link.</p>
        </div>
      </div>
    </div>
  `;
}

export const prepareResumeUploadFn = createServerFn({ method: "POST" })
  .inputValidator(prepareUploadSchema)
  .handler(async ({ data }) => {
    const { client } = await requirePublishedJob(data.jobId);
    const safeName = sanitizeFileName(data.fileName);
    const objectPath = `${data.jobId}/${crypto.randomUUID()}-${safeName}`;

    const { data: signedUpload, error } = await client.storage
      .from("resumes")
      .createSignedUploadUrl(objectPath);

    if (error || !signedUpload?.token) {
      throw new Error("Unable to prepare the resume upload.");
    }

    return {
      path: objectPath,
      token: signedUpload.token,
    };
  });

export const submitJobApplicationFn = createServerFn({ method: "POST" })
  .inputValidator(submitApplicationSchema)
  .handler(async ({ data }) => {
    const { client, job } = await requirePublishedJob(data.jobId);

    if (!data.resumePath.startsWith(`${data.jobId}/`)) {
      throw new Error("Invalid resume upload.");
    }

    const sections = [
      data.aboutYourself ? `About the applicant:\n${data.aboutYourself}` : "",
      data.roleInterest ? `Why they are interested in this role:\n${data.roleInterest}` : "",
    ].filter(Boolean);

    const { data: application, error } = await client
      .from("job_applications")
      .insert({
        job_id: job.id,
        job_title: job.job_title,
        full_name: data.fullName,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        cover_letter: sections.join("\n\n") || null,
        resume_path: data.resumePath,
        resume_filename: data.resumeFilename,
        resume_mime_type: data.resumeMimeType,
        resume_size: data.resumeSize,
        status: "new",
      })
      .select("id")
      .single();

    if (error || !application) {
      await client.storage.from("resumes").remove([data.resumePath]);
      throw new Error("Unable to submit your application right now.");
    }

    await client.from("job_application_activity").insert({
      application_id: application.id,
      action: "application_submitted",
      new_status: "new",
      note: "Application submitted from the public careers page.",
    });

    const candidateEmail = await sendResendEmail({
      to: data.email.toLowerCase(),
      subject: `Application Received — ${job.job_title} | SDS Consulting Services`,
      html: candidateEmailHtml(data.fullName, job.job_title),
      replyTo: HR_EMAIL,
    });

    await client.from("job_application_activity").insert({
      application_id: application.id,
      action: candidateEmail.sent ? "candidate_confirmation_sent" : "candidate_confirmation_failed",
      new_status: "new",
      note: candidateEmail.sent
        ? "Application confirmation email sent to candidate."
        : "Candidate confirmation email could not be sent; application remains saved.",
    });

    const hrEmail = await sendResendEmail({
      to: HR_EMAIL,
      subject: `New Job Application — ${job.job_title} — ${data.fullName}`,
      html: hrEmailHtml({
        applicationId: application.id as string,
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        jobTitle: job.job_title,
        resumeFilename: data.resumeFilename,
      }),
      replyTo: data.email.toLowerCase(),
    });

    await client.from("job_application_activity").insert({
      application_id: application.id,
      action: hrEmail.sent ? "hr_notification_sent" : "hr_notification_failed",
      new_status: "new",
      note: hrEmail.sent
        ? "New application notification email sent to SDS HR."
        : "SDS HR notification email could not be sent; application remains saved.",
    });

    return {
      applicationId: application.id as string,
      jobTitle: job.job_title as string,
      emailNotifications: {
        candidate: candidateEmail.sent,
        hr: hrEmail.sent,
      },
    };
  });
