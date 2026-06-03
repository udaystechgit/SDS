import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { PageHero } from "@/components/PageHero";
import { CtaBanner } from "@/components/CtaBanner";
import { Cpu, Cloud, Network, Activity, HardHat, ServerCog, Cable, Snowflake, Wrench, ArrowRight } from "lucide-react";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: buildSeoMeta({
      title: "Services | AI, IT & Data Center Infrastructure Solutions | SDS Consulting",
      description:
        "Explore SDS Consulting Services for IT and AI services, data center staffing, remote hands, cloud and DevOps support, network cabling, power and cooling, and 24/7 monitoring.",
      path: "/services",
    }),
  }),
  component: ServicesPage,
});

type Service = {
  icon: typeof Cpu;
  title: string;
  text: string;
  image: string;
  bullets: string[];
  idealFor: string[];
};

const it: Service[] = [
  {
    icon: Cpu,
    title: "AI Infrastructure Deployment",
    text: "Design, deploy, and optimize GPU-dense compute for AI training and inference.",
    image: "https://images.unsplash.com/photo-1591808216268-ce0b82787efe?auto=format&fit=crop&w=1400&q=80",
    bullets: ["NVIDIA HGX / DGX deployments", "InfiniBand & RoCE fabrics", "Model serving & MLOps"],
    idealFor: ["AI Startups", "Hyperscalers", "Research Labs"],
  },
  {
    icon: Cloud,
    title: "Cloud & DevOps",
    text: "Multi-cloud architecture, CI/CD, Kubernetes, and infrastructure-as-code at scale.",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80",
    bullets: ["AWS / Azure / GCP", "Kubernetes & Terraform", "Observability & SRE"],
    idealFor: ["SaaS", "FinTech", "Enterprise IT"],
  },
  {
    icon: Network,
    title: "Network Systems",
    text: "Spine-leaf architectures, SDN, and secure connectivity for modern workloads.",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1400&q=80",
    bullets: ["Spine-leaf design", "BGP / EVPN-VXLAN", "Zero-trust networking"],
    idealFor: ["Data Centers", "Colos", "Edge Sites"],
  },
  {
    icon: Activity,
    title: "24/7 Monitoring & NOC",
    text: "Proactive alerting, incident response, and uptime SLAs you can stake your business on.",
    image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1400&q=80",
    bullets: ["Follow-the-sun NOC", "Custom runbooks", "ITIL-aligned response"],
    idealFor: ["MSPs", "Operators", "Enterprises"],
  },
];

const dc: Service[] = [
  {
    icon: HardHat,
    title: "Data Center Staffing",
    text: "Vetted, certified technicians ready to deploy on-site, on short notice.",
    image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1400&q=80",
    bullets: ["Background-checked staff", "Surge capacity", "Project & permanent placement"],
    idealFor: ["Colos", "Hyperscalers", "Enterprises"],
  },
  {
    icon: ServerCog,
    title: "Rack & Stack",
    text: "Server install, cabling, labeling, and commissioning across thousands of nodes.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1400&q=80",
    bullets: ["Site surveys", "Bulk deployments", "QA & sign-off"],
    idealFor: ["New Builds", "Refresh Projects"],
  },
  {
    icon: Cable,
    title: "Network Cabling",
    text: "Structured copper and fiber cabling for high-density, high-speed environments.",
    image: "https://images.unsplash.com/photo-1606166187734-a4cb74079037?auto=format&fit=crop&w=1400&q=80",
    bullets: ["MPO / OS2 fiber", "Cat6A copper", "Documentation & testing"],
    idealFor: ["Colos", "Campuses", "AI Halls"],
  },
  {
    icon: Snowflake,
    title: "Power & Cooling",
    text: "PDU, UPS, CRAC and liquid cooling expertise for next-generation AI workloads.",
    image: "https://images.unsplash.com/photo-1610563166150-b34df4f3bcd6?auto=format&fit=crop&w=1400&q=80",
    bullets: ["Hot/cold aisle containment", "Liquid cooling", "Capacity planning"],
    idealFor: ["GPU Halls", "HPC Sites"],
  },
  {
    icon: Wrench,
    title: "Remote Hands",
    text: "On-demand smart hands available globally, 24/7, with rigorous SLAs.",
    image: "https://images.unsplash.com/photo-1551808525-51a94da548ce?auto=format&fit=crop&w=1400&q=80",
    bullets: ["Tier 1–3 tasks", "Emergency dispatch", "Audit-ready reporting"],
    idealFor: ["Global Operators", "MSPs"],
  },
];

function ServiceCard({ s }: { s: Service }) {
  const Icon = s.icon;
  return (
    <article className="group rounded-3xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-brand transition-shadow">
      <div className="img-hover-zoom h-48">
        <img src={s.image} alt={s.title} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="font-heading text-lg font-bold">{s.title}</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{s.text}</p>
        <ul className="mt-4 space-y-1.5 text-sm">
          {s.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[color:var(--brand-bright)]" />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          {s.idealFor.map((t) => (
            <span key={t} className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-semibold">
              {t}
            </span>
          ))}
        </div>
        <Link to="/contact" className="mt-6 inline-flex items-center gap-2 font-semibold text-[color:var(--brand-deep)] text-sm hover:gap-3 transition-all">
          Discuss this service <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function ServicesPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="What we deliver"
        title="AI, IT & Data Center Infrastructure Services"
        description="Two complementary practices — IT & AI services, plus end-to-end physical data center operations. One trusted partner."
        image="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1920&q=80"
      />

      <section id="it-ai" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brand-bright)]">Category A</div>
              <h2 className="mt-2 text-3xl md:text-4xl font-heading font-bold">IT & AI Services</h2>
            </div>
            <Link to="/contact" className="text-sm font-semibold text-[color:var(--brand-deep)] inline-flex items-center gap-2 hover:gap-3 transition-all">
              Request a consultation <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {it.map((s) => <ServiceCard key={s.title} s={s} />)}
          </div>
        </div>
      </section>

      <section id="data-center" className="py-20 bg-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brand-bright)]">Category B</div>
              <h2 className="mt-2 text-3xl md:text-4xl font-heading font-bold">Data Center & Infrastructure</h2>
            </div>
            <Link to="/contact" className="text-sm font-semibold text-[color:var(--brand-deep)] inline-flex items-center gap-2 hover:gap-3 transition-all">
              Request a consultation <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dc.map((s) => <ServiceCard key={s.title} s={s} />)}
          </div>
        </div>
      </section>

      <CtaBanner />
    </SiteShell>
  );
}
