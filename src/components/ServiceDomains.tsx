import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Cpu,
  Cloud,
  Network,
  Activity,
  Wrench,
  Cable,
  Snowflake,
  ServerCog,
  HardHat,
} from "lucide-react";

const itServices = [
  {
    icon: Cpu,
    title: "AI Infrastructure Deployment",
    text: "GPU clusters, model serving, MLOps pipelines.",
  },
  { icon: Cloud, title: "Cloud & DevOps", text: "AWS, Azure, GCP. CI/CD, Kubernetes, IaC." },
  { icon: Network, title: "Network Systems", text: "Spine-leaf design, SDN, secure connectivity." },
  {
    icon: Activity,
    title: "24/7 Monitoring & NOC",
    text: "Proactive alerts, incident response, uptime SLAs.",
  },
];

const dcServices = [
  { icon: HardHat, title: "Data Center Staffing", text: "Vetted technicians ready on-site." },
  {
    icon: ServerCog,
    title: "Rack & Stack",
    text: "Server install, cabling, labeling, commissioning.",
  },
  { icon: Cable, title: "Network Cabling", text: "Copper, fiber, structured cabling at scale." },
  { icon: Snowflake, title: "Power & Cooling", text: "PDU, UPS, CRAC, hot/cold aisle expertise." },
  { icon: Wrench, title: "Remote Hands", text: "On-demand smart hands, 24/7 globally." },
];

export function ServiceDomains() {
  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[color:var(--brand-bright)]/10 text-[color:var(--brand-deep)]">
            What we do
          </div>
          <h2 className="mt-4 text-3xl md:text-5xl font-heading font-bold">
            Our <span className="text-gradient-brand">Service Domains</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            From AI infrastructure to physical rack & stack — one partner for every layer of the
            modern data center.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* IT & AI */}
          <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-brand">
            <div className="img-hover-zoom h-56">
              <img
                src="https://images.unsplash.com/photo-1591808216268-ce0b82787efe?auto=format&fit=crop&w=1400&q=80"
                alt="AI infrastructure and GPU clusters"
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-t from-card via-card/30 to-transparent" />
            </div>
            <div className="p-8">
              <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brand-bright)]">
                Category A
              </div>
              <h3 className="mt-2 text-2xl md:text-3xl font-heading font-bold">IT & AI Services</h3>
              <ul className="mt-6 grid sm:grid-cols-2 gap-4">
                {itServices.map((s) => {
                  const Icon = s.icon;
                  return (
                    <li key={s.title} className="flex gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="font-semibold text-sm">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{s.text}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Link
                to="/services"
                hash="it-ai"
                className="mt-8 inline-flex items-center gap-2 font-semibold text-[color:var(--brand-deep)] hover:gap-3 transition-all"
              >
                Explore IT Services <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* DC & Infra */}
          <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-brand">
            <div className="img-hover-zoom h-56">
              <img
                src="https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1400&q=80"
                alt="Data center technicians working on server racks"
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-t from-card via-card/30 to-transparent" />
            </div>
            <div className="p-8">
              <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brand-bright)]">
                Category B
              </div>
              <h3 className="mt-2 text-2xl md:text-3xl font-heading font-bold">
                Data Center & Infrastructure
              </h3>
              <ul className="mt-6 grid sm:grid-cols-2 gap-4">
                {dcServices.map((s) => {
                  const Icon = s.icon;
                  return (
                    <li key={s.title} className="flex gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--navy)] text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="font-semibold text-sm">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{s.text}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Link
                to="/services"
                hash="data-center"
                className="mt-8 inline-flex items-center gap-2 font-semibold text-[color:var(--brand-deep)] hover:gap-3 transition-all"
              >
                Explore Infrastructure Services <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
