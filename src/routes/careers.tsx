import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { PageHero } from "@/components/PageHero";
import { Briefcase, Heart, GraduationCap, Globe, ArrowRight } from "lucide-react";
import logo from "@/assets/brand/sds-logo-transparent.png";
import { buildSeoMeta } from "@/lib/seo";
import { getPublishedJobRequirements, readJobRequirements, type JobRequirement } from "@/lib/jobs";
import { listJobRequirementsFn } from "@/lib/api/jobs.functions";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: buildSeoMeta({
      title: "Careers | Join SDS Consulting Services",
      description:
        "Build your career with SDS Consulting Services in AI infrastructure, data center operations, cloud support, network systems, and enterprise technology services.",
      path: "/careers",
    }),
  }),
  component: CareersPage,
});

const whys = [
  {
    icon: Briefcase,
    t: "Meaningful Work",
    d: "Power the infrastructure behind the world's AI breakthroughs.",
  },
  {
    icon: GraduationCap,
    t: "Growth & Certs",
    d: "Funded training: NVIDIA, BICSI, Cisco, AWS, and more.",
  },
  {
    icon: Heart,
    t: "Care First",
    d: "Comprehensive benefits, mental health, and PTO that respects you.",
  },
  {
    icon: Globe,
    t: "Global Footprint",
    d: "Work with hyperscalers and Fortune 500 operators worldwide.",
  },
];

function CareersPage() {
  const [sent, setSent] = useState(false);
  const [publishedRoles, setPublishedRoles] = useState<JobRequirement[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [jobTypeFilter, setJobTypeFilter] = useState("All Job Types");

  useEffect(() => {
    let cancelled = false;

    const loadPublishedRoles = async () => {
      try {
        const result = await listJobRequirementsFn({ data: { onlyPublished: true } });
        if (!cancelled && result.configured) {
          setPublishedRoles(result.jobs);
          return;
        }
      } catch {
        // Fall back to local storage data if backend is not available yet.
      }

      if (!cancelled) {
        setPublishedRoles(getPublishedJobRequirements(readJobRequirements()));
      }
    };

    void loadPublishedRoles();

    const sync = () => {
      setPublishedRoles(getPublishedJobRequirements(readJobRequirements()));
    };

    window.addEventListener("storage", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", sync);
    };
  }, []);

  const roleOptions =
    publishedRoles.length > 0 ? publishedRoles.map((r) => r.jobTitle) : ["General Application"];

  const departmentOptions = useMemo(
    () => ["All Departments", ...new Set(publishedRoles.map((r) => r.department))],
    [publishedRoles],
  );

  const locationOptions = useMemo(
    () => ["All Locations", ...new Set(publishedRoles.map((r) => r.location))],
    [publishedRoles],
  );

  const jobTypeOptions = useMemo(
    () => ["All Job Types", ...new Set(publishedRoles.map((r) => r.jobType))],
    [publishedRoles],
  );

  const filteredPublishedRoles = useMemo(() => {
    return publishedRoles.filter((role) => {
      const matchesDepartment =
        departmentFilter === "All Departments" || role.department === departmentFilter;
      const matchesLocation =
        locationFilter === "All Locations" || role.location === locationFilter;
      const matchesJobType = jobTypeFilter === "All Job Types" || role.jobType === jobTypeFilter;
      return matchesDepartment && matchesLocation && matchesJobType;
    });
  }, [publishedRoles, departmentFilter, locationFilter, jobTypeFilter]);

  return (
    <SiteShell>
      <PageHero
        eyebrow="Careers"
        title="Build Your Career in AI Infrastructure"
        description="Join a Green Bay-headquartered team deploying the data centers that power tomorrow's AI."
        image="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1920&q=80"
        showLogo
      />

      {/* Why */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-heading font-bold">Why work with us</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whys.map((w) => {
              const Icon = w.icon;
              return (
                <div
                  key={w.t}
                  className="rounded-2xl p-6 bg-card border border-border hover:shadow-brand transition-shadow"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-heading font-bold">{w.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{w.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20 bg-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-heading font-bold">Open roles</h2>

          {publishedRoles.length > 0 ? (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#0B3D91]"
              >
                {departmentOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#0B3D91]"
              >
                {locationOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#0B3D91]"
              >
                {jobTypeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          ) : null}

          {publishedRoles.length === 0 ? (
            <div className="mt-10 rounded-2xl bg-card border border-border p-6 text-muted-foreground">
              No open roles right now. Please send us your profile and we&apos;ll contact you when a
              matching opportunity is available.
            </div>
          ) : filteredPublishedRoles.length === 0 ? (
            <div className="mt-10 rounded-2xl bg-card border border-border p-6 text-muted-foreground">
              No roles match your selected filters right now.
            </div>
          ) : (
            <div className="mt-10 grid gap-4">
              {filteredPublishedRoles.map((r) => (
                <div
                  key={r.id}
                  className="group flex items-center justify-between gap-4 rounded-2xl bg-card border border-border p-5 hover:shadow-brand transition-shadow"
                >
                  <div>
                    <div className="font-heading font-bold">{r.jobTitle}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      {r.location} • {r.jobType}
                    </div>
                  </div>
                  <a
                    href="#apply"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--brand-deep)] group-hover:gap-3 transition-all"
                  >
                    Apply <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Culture */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="img-hover-zoom rounded-3xl overflow-hidden shadow-brand">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80"
              alt="SDS team culture"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brand-bright)]">
              Our Culture
            </div>
            <h2 className="mt-3 text-3xl md:text-5xl font-heading font-bold">
              A team that has each other's back.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              We work at the edge of AI infrastructure — and we take care of each other while we do
              it. Expect mentorship, real ownership, and the support to grow your career fast.
            </p>
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="py-20 bg-secondary">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-card border border-border p-8 md:p-10 shadow-brand">
            <div className="flex items-center gap-4 mb-6">
              <img src={logo} alt="SDS Consulting Services" className="h-16 w-20 object-contain" />
              <div>
                <h2 className="text-2xl font-heading font-bold">Apply to SDS</h2>
                <p className="text-sm text-muted-foreground">We review every application.</p>
              </div>
            </div>
            {sent ? (
              <div className="rounded-xl bg-[color:var(--brand-bright)]/10 text-[color:var(--brand-deep)] p-6 font-medium">
                Thanks! We received your application and will be in touch shortly.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="grid gap-4"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full name" name="name" required />
                  <Field label="Email" name="email" type="email" required />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Phone" name="phone" />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Role of interest</label>
                    <select
                      name="role"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                    >
                      {roleOptions.map((title) => (
                        <option key={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Upload resume <span className="text-destructive"> *</span>
                  </label>
                  <input
                    name="resume"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[color:var(--brand-bright)]/15 file:px-3 file:py-1.5 file:text-[color:var(--brand-deep)] file:font-medium"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Accepted formats: PDF, DOC, DOCX
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tell us about yourself</label>
                  <textarea
                    name="message"
                    rows={5}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Why are you interested in this role?
                  </label>
                  <textarea
                    name="roleInterest"
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                    placeholder="Share what excites you about this role and how your experience aligns."
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 inline-flex justify-center items-center gap-2 px-6 py-3 rounded-full bg-gradient-brand text-white font-semibold shadow-brand hover:opacity-95"
                >
                  Submit application <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
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
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
      />
    </div>
  );
}
