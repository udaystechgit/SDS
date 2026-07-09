import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BriefcaseBusiness, Cpu, Server, ShieldCheck } from "lucide-react";
import logo from "@/assets/brand/sds-logo-transparent.png";
import heroFallback from "@/assets/hero-fallback.jpg";

const capabilities = [
  { label: "AI Infrastructure", icon: Cpu },
  { label: "Data Center Operations", icon: Server },
  { label: "Enterprise Workforce", icon: BriefcaseBusiness },
  { label: "SLA-Backed Support", icon: ShieldCheck },
];

export function Hero() {
  const [videoError, setVideoError] = useState(false);

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-[#061229]">
      {videoError ? (
        <div className="absolute inset-0">
          <img
            src={heroFallback}
            alt="AI data center infrastructure with servers and intelligent operations"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_70%_20%,rgba(29,161,242,0.28),transparent_58%),linear-gradient(135deg,#061229_0%,#0A1E45_52%,#020617_100%)]" />
        </div>
      ) : (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={heroFallback}
          onError={() => setVideoError(true)}
        >
          <source src="/videos/ai-data-center-robots.mp4" type="video/mp4" />
        </video>
      )}

      <div className="absolute inset-0 bg-black/58" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#031027]/95 via-[#071b3d]/72 to-[#031027]/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#020817]/92 via-[#061229]/20 to-[#061229]/50" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl items-center px-4 py-28 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[color:var(--brand-bright)] shadow-[0_0_18px_rgba(29,161,242,0.9)]" />
            AI Data Center Workforce Partner
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-2 shadow-[0_18px_48px_rgba(3,16,39,0.55)] backdrop-blur">
              <img
                src={logo}
                alt="SDS Consulting Services"
                className="h-20 w-[5.4rem] object-contain md:h-24 md:w-[6.4rem]"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--brand-bright)]">
                SDS Consulting Services
              </p>
              <p className="mt-1 text-sm text-white/80 md:text-base">
                Staffing, infrastructure, and intelligent operations
              </p>
            </div>
          </div>

          <h1 className="mt-7 max-w-5xl font-heading text-4xl font-bold leading-[1.04] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] sm:text-5xl md:text-6xl lg:text-7xl">
            AI Data Center Staffing & Infrastructure Operations
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/88 drop-shadow-[0_2px_14px_rgba(0,0,0,0.8)] sm:text-lg md:text-xl">
            SDS Consulting Services connects skilled workforce, infrastructure teams, and
            intelligent operations for next-generation data centers.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/services"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-7 py-3.5 text-sm font-semibold text-white shadow-brand transition hover:opacity-95"
            >
              Explore Services <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/careers"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              View Careers
            </Link>
          </div>

          <div className="mt-10 grid max-w-4xl grid-cols-2 gap-3 lg:grid-cols-4">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex min-h-20 items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-bright)]/20 text-[color:var(--brand-bright)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium leading-snug">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
