import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SiteShell } from "@/components/SiteShell";
import { PageHero } from "@/components/PageHero";
import { Mail, Phone, MapPin, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import logo from "@/assets/sds-logo.png";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: buildSeoMeta({
      title: "Contact SDS Consulting Services | Request AI Data Center Support",
      description:
        "Contact SDS Consulting Services for AI data center staffing, infrastructure deployment, cloud and DevOps support, network cabling, monitoring, and enterprise support needs.",
      path: "/contact",
    }),
  }),
  component: ContactPage,
});

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

// Loose international phone regex — digits, spaces, +, -, () — 7-20 chars
const phoneRegex = /^[+()\d][\d\s().-]{6,19}$/;

const contactSchema = z.object({
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

type ContactValues = z.infer<typeof contactSchema>;
type ContactErrors = Partial<Record<keyof ContactValues, string>>;

const initial: ContactValues = {
  name: "",
  email: "",
  company: "",
  phone: "",
  service: "Data Center Staffing",
  message: "",
};

function ContactPage() {
  const [values, setValues] = useState<ContactValues>(initial);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [sent, setSent] = useState(false);

  const update = <K extends keyof ContactValues>(key: K, v: ContactValues[K]) => {
    setValues((p) => ({ ...p, [key]: v }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(values);
    if (!result.success) {
      const next: ContactErrors = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof ContactValues;
        if (k && !next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSent(true);
    setValues(initial);
  };

  return (
    <SiteShell>
      <PageHero
        eyebrow="Contact"
        title="Let's Talk About Your Infrastructure Needs"
        description="Tell us about your project. Our team in Chicago will respond within one business day."
        image="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1920&q=80"
      />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-5 gap-10">
          {/* Form */}
          <div className="lg:col-span-3 rounded-3xl bg-card border border-border p-8 md:p-10 shadow-brand">
            <h2 className="text-2xl md:text-3xl font-heading font-bold">Send us a message</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All fields marked with <span className="text-destructive">*</span> are required.
            </p>

            {sent && (
              <div
                role="status"
                className="mt-6 flex items-start gap-3 rounded-xl border border-[color:var(--brand-bright)]/30 bg-[color:var(--brand-bright)]/10 p-5"
              >
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-[color:var(--brand-deep)]" />
                <p className="text-sm font-medium text-[color:var(--brand-deep)]">
                  Thank you! Your inquiry has been received. Our SDS Consulting team will
                  contact you shortly.
                </p>
              </div>
            )}

            <form noValidate onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Full Name"
                  name="name"
                  required
                  value={values.name}
                  onChange={(v) => update("name", v)}
                  error={errors.name}
                  autoComplete="name"
                />
                <Field
                  label="Company Name"
                  name="company"
                  required
                  value={values.company}
                  onChange={(v) => update("company", v)}
                  error={errors.company}
                  autoComplete="organization"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Work Email"
                  name="email"
                  type="email"
                  required
                  value={values.email}
                  onChange={(v) => update("email", v)}
                  error={errors.email}
                  autoComplete="email"
                />
                <Field
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={values.phone ?? ""}
                  onChange={(v) => update("phone", v)}
                  error={errors.phone}
                  autoComplete="tel"
                  hint="Optional"
                />
              </div>

              <div>
                <label htmlFor="service" className="block text-sm font-medium mb-1.5">
                  Service Inquiry <span className="text-destructive">*</span>
                </label>
                <select
                  id="service"
                  name="service"
                  value={values.service}
                  onChange={(e) => update("service", e.target.value as ContactValues["service"])}
                  aria-invalid={!!errors.service}
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm ${
                    errors.service ? "border-destructive" : "border-input"
                  }`}
                >
                  {inquiries.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                {errors.service && (
                  <p className="mt-1 text-xs text-destructive">{errors.service}</p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1.5">
                  Message <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={values.message}
                  onChange={(e) => update("message", e.target.value)}
                  aria-invalid={!!errors.message}
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm ${
                    errors.message ? "border-destructive" : "border-input"
                  }`}
                  placeholder="Tell us about your project, scale, timeline, and locations."
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-destructive">{errors.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex justify-center items-center gap-2 px-6 py-3 rounded-full bg-gradient-brand text-white font-semibold shadow-brand hover:opacity-95"
              >
                Send message <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl bg-[color:var(--navy)] text-white p-8 shadow-brand">
              <img src={logo} alt="SDS Consulting Services" className="h-14 w-auto bg-white rounded-xl p-1.5 mb-5" />
              <h2 className="font-heading font-bold text-xl">SDS Consulting Services</h2>
              <p className="mt-1 text-sm text-white/70">
                AI Data Center Staffing & Infrastructure Experts
              </p>
              <ul className="mt-6 space-y-4 text-sm">
                <li className="flex items-start gap-3"><MapPin className="h-5 w-5 text-[color:var(--brand-bright)]" /> Address: To be updated</li>
                <li className="flex items-start gap-3"><Mail className="h-5 w-5 text-[color:var(--brand-bright)]" /> hr@sdsconsultingservice.com</li>
                <li className="flex items-start gap-3"><Phone className="h-5 w-5 text-[color:var(--brand-bright)]" /> Contact number: To be updated</li>
                <li className="flex items-start gap-3"><Clock className="h-5 w-5 text-[color:var(--brand-bright)]" /> 24/7 NOC Support</li>
              </ul>
            </div>
            <div className="rounded-3xl overflow-hidden border border-border img-hover-zoom">
              <img
                src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80"
                alt="Chicago skyline"
                className="h-64 w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="rounded-3xl bg-card border border-border p-6">
              <h3 className="font-heading font-bold">Chicago Headquarters</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Our Chicago HQ is home to our NOC, training center, and leadership team.
                Visits by appointment only.
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  value,
  onChange,
  error,
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-destructive"> *</span>}
        {hint && !required && <span className="ml-1 text-xs text-muted-foreground">({hint})</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm ${
          error ? "border-destructive" : "border-input"
        }`}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
