import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Cpu,
  Cloud,
  Network,
  Zap,
  Snowflake,
  Activity,
  Server,
  ShieldCheck,
  Gauge,
  Building2,
  Database,
  Sparkles,
} from "lucide-react";
import logo from "@/assets/sds-logo.png";
import heroFallback from "@/assets/hero-fallback.jpg";

// Cinematic robot + AI data center footage (royalty-free Pexels).
// Videos chosen to communicate: AI-powered infrastructure staffed by skilled engineers + automation.
// Browsers play the first <source> that loads successfully; remaining
// entries act as resilient fallbacks if a CDN is unreachable.
const VIDEO_SOURCES = [
  // Robotic arm operating in high-tech environment — primary shot
  "https://videos.pexels.com/video-files/3912953/3912953-uhd_2560_1440_25fps.mp4",
  // Industrial robotic arms with engineers — AI + human workforce theme
  "https://videos.pexels.com/video-files/4834177/4834177-hd_1920_1080_25fps.mp4",
  // Humanoid robot / AI concept — futuristic tech
  "https://videos.pexels.com/video-files/8566526/8566526-uhd_2560_1440_25fps.mp4",
  // Data center server racks — infrastructure context
  "https://videos.pexels.com/video-files/3252919/3252919-uhd_3840_2160_25fps.mp4",
];

const badges = [
  { label: "AI Infrastructure", icon: Cpu },
  { label: "Data Center Operations", icon: Server },
  { label: "Cloud & DevOps", icon: Cloud },
  { label: "Network & Cabling", icon: Network },
  { label: "Power & Cooling", icon: Snowflake },
  { label: "24/7 Monitoring", icon: Activity },
];

const rotatingPhrases = [
  "AI Infrastructure",
  "Data Center Operations",
  "Cloud & DevOps",
  "Enterprise Support",
  "24/7 Monitoring",
];

const heroStats = [
  { value: "99.95%", label: "SLA Uptime" },
  { value: "24/7", label: "NOC Coverage" },
  { value: "500+", label: "Engineers & Techs" },
  { value: "48h", label: "Rapid Staffing" },
];

const capabilityRows = [
  { icon: Gauge, title: "Operations Command", desc: "Real-time monitoring, incident triage, and escalation workflows." },
  { icon: Building2, title: "Enterprise Delivery", desc: "Staff augmentation and project execution for mission-critical sites." },
  { icon: Database, title: "AI Data Infrastructure", desc: "Compute, network, and storage readiness for AI-heavy workloads." },
];

export function Hero() {
  const [videoError, setVideoError] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const id = window.setInterval(
      () => setPhraseIndex((i) => (i + 1) % rotatingPhrases.length),
      2400,
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) return;

    let rafId = 0;
    const onMove = (event: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        setParallax({ x, y });
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden">
      {/* Background: video, with image fallback */}
      {videoError ? (
        <img
          src={heroFallback}
          alt="AI-powered data center with robotic inspection arm and engineer at monitoring dashboard"
          className="absolute inset-0 h-full w-full object-cover"
        />
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
          {VIDEO_SOURCES.map((src) => (
            <source key={src} src={src} type="video/mp4" />
          ))}
        </video>
      )}

      {/* Premium overlays */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_75%_at_16%_18%,rgba(29,161,242,0.38)_0%,rgba(29,161,242,0)_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_88%_12%,rgba(11,61,145,0.42)_0%,rgba(11,61,145,0)_62%)]" />
      <div className="absolute inset-0 hero-gradient-sheen" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07142d]/90 via-[#0A1E45]/60 to-[#07142d]/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#061229]/88 via-transparent to-[#081735]/38" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div
        className="absolute -top-20 -right-24 h-80 w-80 rounded-full bg-[#1DA1F2]/20 blur-3xl animate-pulse parallax-soft"
        style={{
          transform: `translate3d(${parallax.x * 14}px, ${parallax.y * 12}px, 0)`,
        }}
      />
      <div
        className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#0B3D91]/25 blur-3xl animate-pulse parallax-soft"
        style={{
          transform: `translate3d(${parallax.x * -12}px, ${parallax.y * -10}px, 0)`,
        }}
      />
      <div
        className="absolute inset-0 hero-aurora parallax-soft"
        style={{
          transform: `translate3d(${parallax.x * 8}px, ${parallax.y * 5}px, 0)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-12">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur animate-fade-up">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--brand-bright)]" />
              Premium AI Data Center Workforce Partner
            </div>

            <div className="mt-4 flex items-center gap-4 animate-fade-up">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#1DA1F2]/60 via-[#0B3D91]/40 to-[#1DA1F2]/60 blur-xl animate-glow-pulse" />
              {/* Premium glass border frame */}
              <div className="relative rounded-2xl p-[2px] bg-gradient-to-br from-white/60 via-[#1DA1F2]/40 to-white/20 shadow-[0_8px_32px_rgba(29,161,242,0.45),0_2px_8px_rgba(0,0,0,0.4)]">
                <div className="rounded-[14px] bg-gradient-to-br from-[#0a1628]/90 via-[#0B3D91]/70 to-[#0a1628]/90 backdrop-blur-sm p-2">
                  <img
                    src={logo}
                    alt="SDS Consulting Services"
                    className="relative h-14 md:h-16 w-auto drop-shadow-[0_0_12px_rgba(29,161,242,0.6)]"
                  />
                </div>
              </div>
            </div>
            <div className="text-white/90">
              <div className="text-xs md:text-sm uppercase tracking-[0.2em] text-[color:var(--brand-bright)] drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                SDS Consulting Services
              </div>
              <div className="text-sm md:text-base text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                Chicago, Illinois
              </div>
            </div>
            </div>

            <h1
              className="mt-5 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold text-white leading-[1.03] animate-fade-up drop-shadow-[0_3px_20px_rgba(0,0,0,0.95)]"
              style={{
                animationDelay: "0.1s",
                transform: `translate3d(${parallax.x * 4}px, ${parallax.y * 2}px, 0)`,
              }}
            >
              Elite Staffing for
              <span className="block text-gradient-brand bg-[linear-gradient(135deg,#b8d9ff_0%,#1DA1F2_52%,#79d0ff_100%)]">
                AI-Driven Data Centers
              </span>
            </h1>

          {/* Rotating service phrase */}
            <div
              className="mt-3 flex items-center gap-3 text-white animate-fade-up drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]"
              style={{ animationDelay: "0.15s" }}
            >
              <span className="text-xs uppercase tracking-[0.25em] text-[color:var(--brand-bright)]">
                We deliver
              </span>
              <span className="relative inline-block min-w-[14ch] h-7 md:h-8 overflow-hidden align-middle">
                {rotatingPhrases.map((p, i) => (
                  <span
                    key={p}
                    className={`absolute inset-0 font-heading font-semibold text-lg md:text-xl text-white transition-all duration-700 ease-out ${
                      i === phraseIndex
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-3"
                    }`}
                  >
                    {p}
                  </span>
                ))}
              </span>
            </div>

            <p
              className="mt-3 max-w-2xl text-base md:text-lg text-white/95 leading-relaxed animate-fade-up drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]"
              style={{ animationDelay: "0.2s" }}
            >
              SDS deploys high-performance talent across infrastructure, cloud,
              and AI operations so enterprise data centers scale with speed,
              reliability, and execution precision.
            </p>

            <div
              className="mt-5 flex flex-wrap gap-4 animate-fade-up"
              style={{ animationDelay: "0.3s" }}
            >
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-brand text-white font-semibold shadow-brand hover:opacity-95"
              >
                Start a Staffing Plan <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white/10 border border-white/30 text-white font-semibold backdrop-blur hover:bg-white/20"
              >
                Explore Services
              </Link>
            </div>

            <div
              className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up"
              style={{ animationDelay: "0.38s" }}
            >
              {heroStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md"
                >
                  <p className="text-xl md:text-2xl font-heading font-bold text-white">{item.value}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-white/70">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <aside
            className="hidden lg:block animate-fade-up parallax-soft"
            style={{
              animationDelay: "0.28s",
              transform: `translate3d(${parallax.x * -10}px, ${parallax.y * -6}px, 0)`,
            }}
          >
            <div className="relative rounded-3xl border border-white/20 bg-[linear-gradient(155deg,rgba(255,255,255,0.17),rgba(255,255,255,0.05))] p-6 backdrop-blur-xl shadow-[0_30px_70px_-36px_rgba(9,27,66,0.85)]">
              <div className="absolute -top-12 right-10 h-28 w-28 rounded-full bg-[#1DA1F2]/22 blur-2xl" />
              <div className="absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-[#0B3D91]/28 blur-2xl" />

              <div className="relative">
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--brand-bright)]">Operational Excellence</p>
                <h3 className="mt-2 text-2xl font-heading font-bold text-white leading-tight">
                  SDS Delivery Command
                </h3>
                <p className="mt-2 text-sm text-white/80">
                  Structured workflows, certified specialists, and SLA-backed execution for high-impact AI data center programs.
                </p>

                <div className="mt-5 space-y-3">
                  {capabilityRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <div key={row.title} className="rounded-2xl border border-white/15 bg-[#061735]/35 p-3.5">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#1DA1F2]/20 text-[#9bd6ff]">
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white">{row.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-white/72">{row.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Floating service badges */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {badges.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={b.label}
                className="glass-dark rounded-xl px-4 py-3 flex items-center gap-2 text-white text-sm font-medium border border-white/15 animate-float"
                style={{
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${5 + i * 0.4}s`,
                }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--brand-bright)]/20 text-[color:var(--brand-bright)]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate">{b.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-5 text-white/60 text-xs uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--brand-bright)]" />{" "}
            Enterprise Grade
          </span>
          <span>•</span>
          <span className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-[color:var(--brand-bright)]" /> 24/7
            NOC
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">SLA Backed</span>
        </div>
      </div>
    </section>
  );
}
