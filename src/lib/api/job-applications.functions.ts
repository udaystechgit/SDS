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

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return cleaned || "resume";
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

    return {
      applicationId: application.id as string,
      jobTitle: job.job_title as string,
    };
  });
