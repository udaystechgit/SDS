import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Hero } from "@/components/Hero";
import { ServiceDomains } from "@/components/ServiceDomains";
import { CtaBanner } from "@/components/CtaBanner";
import { Quote, Users, Server, Globe2 } from "lucide-react";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: buildSeoMeta({
      title: "SDS Consulting Services | AI Data Center Staffing & Infrastructure Experts",
      description:
        "SDS Consulting Services provides AI data center staffing, infrastructure deployment, cloud support, network cabling, power and cooling, and 24/7 monitoring for enterprise clients.",
      path: "/",
    }),
  }),
  component: Index,
});

const stats = [
  { icon: Users, value: "500+", label: "Certified Technicians" },
  { icon: Server, value: "120+", label: "Data Centers Served" },
  { icon: Globe2, value: "24/7", label: "Global NOC Coverage" },
  { icon: Quote, value: "99.99%", label: "Uptime Delivered" },
];

function Index() {
  return (
    <SiteShell>
      <Hero />

      {/* Stats strip */}
      <section className="bg-white border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-heading text-2xl font-bold text-[color:var(--brand-deep)]">{s.value}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <ServiceDomains />

      {/* Why SDS */}
      <section className="py-24 bg-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="img-hover-zoom rounded-3xl overflow-hidden shadow-brand">
            <img
              src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80"
              alt="Modern AI data center infrastructure"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brand-bright)]">Why SDS</div>
            <h2 className="mt-3 text-3xl md:text-5xl font-heading font-bold">
              Enterprise quality, <span className="text-gradient-brand">delivered fast</span>.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              SDS Consulting Services brings the rigor of top-tier consulting firms to the
              specialized world of AI data center operations. We blend skilled manpower
              with deep technical expertise to keep your infrastructure performing at peak.
            </p>
            <ul className="mt-8 grid sm:grid-cols-2 gap-4 text-sm">
              {[
                "Vetted, certified technicians",
                "SLA-backed response times",
                "Vendor-neutral architecture",
                "Hyperscaler-ready workflows",
                "24/7 NOC & remote hands",
                "Compliance & safety first",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-gradient-brand" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CtaBanner />
    </SiteShell>
  );
}
