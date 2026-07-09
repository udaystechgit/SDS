import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { PageHero } from "@/components/PageHero";
import { CtaBanner } from "@/components/CtaBanner";
import { Target, Eye, Award, Shield, Zap, Heart } from "lucide-react";
import logo from "@/assets/brand/sds-logo-transparent.png";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: buildSeoMeta({
      title: "About SDS Consulting Services | AI Infrastructure & Data Center Experts",
      description:
        "Learn about SDS Consulting Services, a Wisconsin-based AI data center staffing and infrastructure support company focused on reliable, scalable, and enterprise-ready solutions.",
      path: "/about",
    }),
  }),
  component: AboutPage,
});

const strengths = [
  {
    icon: Shield,
    title: "Trusted by Enterprises",
    text: "Hyperscalers and Fortune 500 operators rely on SDS.",
  },
  {
    icon: Zap,
    title: "Rapid Mobilization",
    text: "Teams on-site in 48 hours across North America.",
  },
  {
    icon: Award,
    title: "Certified Talent",
    text: "BICSI, CCNA, CompTIA, NVIDIA-certified technicians.",
  },
  {
    icon: Heart,
    title: "People-first Culture",
    text: "We invest in our staff so they invest in your uptime.",
  },
];

const team = [
  {
    name: "Daniel R.",
    role: "CEO & Founder",
    img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Priya S.",
    role: "VP, Infrastructure",
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Marcus L.",
    role: "Director, NOC",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Elena K.",
    role: "Head of Talent",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80",
  },
];

function AboutPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="About SDS"
        title="Built for the Future of AI Infrastructure"
        description="Based in Green Bay, Wisconsin, SDS Consulting Services blends elite consulting rigor with hands-on data center expertise."
        image="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1920&q=80"
        showLogo
      />

      {/* Story */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="img-hover-zoom rounded-3xl overflow-hidden shadow-brand">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80"
              alt="SDS team at work"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brand-bright)]">
              Our Story
            </div>
            <h2 className="mt-3 text-3xl md:text-5xl font-heading font-bold">
              From Green Bay, for the world's data centers.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              SDS was founded by veteran data center engineers who saw a gap between traditional
              staffing firms and the specialized, fast-moving needs of AI infrastructure. Today we
              deploy hundreds of technicians across North America and partner with global operators
              to keep AI online — 24/7.
            </p>
          </div>
        </div>
      </section>

      {/* Brand Identity */}
      <section className="py-16 bg-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-10 items-center">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-[color:var(--brand-bright)]/20 blur-2xl" />
              <img
                src={logo}
                alt="SDS Consulting Services logo"
                className="relative h-auto w-64 object-contain drop-shadow-[0_22px_34px_rgba(11,61,145,0.22)]"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brand-bright)]">
              Brand Identity
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-heading font-bold">The SDS mark</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Our logo brings together two interlocking circuit shapes — a metaphor for the human +
              machine partnership that defines modern AI infrastructure. The deep blue represents
              trust and engineering precision; the silver represents the physical hardware we deploy
              and maintain.
            </p>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-8">
          <div className="rounded-3xl p-8 bg-card border border-border shadow-sm">
            <Target className="h-8 w-8 text-[color:var(--brand-deep)]" />
            <h3 className="mt-4 text-2xl font-heading font-bold">Mission</h3>
            <p className="mt-3 text-muted-foreground">
              To power the world's AI ambitions with the most skilled, most reliable data center
              workforce on the planet.
            </p>
          </div>
          <div className="rounded-3xl p-8 bg-gradient-brand text-white shadow-brand">
            <Eye className="h-8 w-8" />
            <h3 className="mt-4 text-2xl font-heading font-bold">Vision</h3>
            <p className="mt-3 text-white/85">
              A world where every breakthrough in AI is matched by the infrastructure excellence
              required to deliver it — at any scale, anywhere.
            </p>
          </div>
        </div>
      </section>

      {/* Strengths */}
      <section className="py-20 bg-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center">
            Why teams choose SDS
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {strengths.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="rounded-2xl p-6 bg-card border border-border">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h4 className="mt-4 font-heading font-bold">{s.title}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center">Leadership</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m) => (
              <div
                key={m.name}
                className="rounded-2xl overflow-hidden border border-border bg-card"
              >
                <div className="img-hover-zoom aspect-[4/5]">
                  <img
                    src={m.img}
                    alt={m.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <div className="font-heading font-bold">{m.name}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    {m.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[color:var(--navy)] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: "500+", l: "Technicians" },
            { v: "120+", l: "Data Centers" },
            { v: "24/7", l: "Global NOC" },
            { v: "99.99%", l: "Uptime" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-4xl md:text-5xl font-heading font-bold text-gradient-brand bg-[linear-gradient(135deg,#9ECBFF,#1DA1F2)]">
                {s.v}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-white/70">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner />
    </SiteShell>
  );
}
