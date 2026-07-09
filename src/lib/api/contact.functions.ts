import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireServiceRoleClient } from "@/lib/api/auth.server";
import { setNoStoreResponseHeaders } from "@/lib/api/http.server";

const inquiries = [
  "Data Center Staffing",
  "AI Infrastructure Deployment",
  "Cloud & DevOps Support",
  "Network & Cabling",
  "Power & Cooling",
  "24/7 Monitoring & Remote Support",
  "Careers / Recruitment",
  "General Inquiry",
] as const;

const phoneRegex = /^[+()\d][\d\s().-]{6,19}$/;

export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(100, "Name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Work email is required")
    .email("Enter a valid email address")
    .max(255),
  company: z.string().trim().min(1, "Company name is required").max(150),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || phoneRegex.test(v), "Enter a valid phone number"),
  service: z.enum(inquiries, { message: "Please choose a service inquiry" }),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message is too long"),
});

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;

export const submitContactInquiryFn = createServerFn({ method: "POST" })
  .inputValidator(contactSubmissionSchema)
  .handler(async ({ data }) => {
    setNoStoreResponseHeaders();

    const client = requireServiceRoleClient();
    const normalized = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      company: data.company.trim(),
      phone: data.phone?.trim() || null,
      service: data.service,
      message: data.message.trim(),
    };

    const { error } = await client.from("contact_submissions").insert(normalized);

    if (error) {
      setResponseStatus(500);
      throw new Error("Unable to submit your inquiry right now.");
    }

    return { ok: true as const };
  });
