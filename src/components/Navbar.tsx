import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import logo from "@/assets/brand/sds-logo-transparent.png";

const links = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/careers", label: "Careers" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all ${
        scrolled ? "glass shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex min-w-0 items-center gap-3 group">
          <img
            src={logo}
            alt="SDS Consulting Services"
            className="h-12 w-14 object-contain sm:h-14 sm:w-16 md:h-16 md:w-[4.5rem]"
          />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-heading font-bold text-base md:text-lg text-[color:var(--brand-deep)]">
              SDS Consulting Services
            </span>
            <span className="text-[10px] md:text-xs text-muted-foreground tracking-wide uppercase">
              AI Data Center Experts
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-[color:var(--brand-deep)] bg-secondary" }}
              className="px-4 py-2 rounded-md text-sm font-medium text-foreground/80 hover:text-[color:var(--brand-deep)] hover:bg-secondary transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="tel:+12622709899"
            className="ml-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-[color:var(--brand-deep)] border border-border bg-white/80 hover:bg-secondary transition-colors"
          >
            <Phone className="h-4 w-4" />
            +1 262-270-9899
          </a>
          <Link
            to="/contact"
            className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-brand shadow-brand hover:opacity-95"
          >
            Get a Quote
          </Link>
        </nav>

        <button
          aria-label="Toggle menu"
          className="md:hidden p-2 rounded-md hover:bg-secondary"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass border-t border-border">
          <div className="px-4 py-3 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: l.to === "/" }}
                activeProps={{ className: "text-[color:var(--brand-deep)] bg-secondary" }}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 text-center px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-brand"
            >
              Get a Quote
            </Link>
            <a
              href="tel:+12622709899"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-[color:var(--brand-deep)] border border-border bg-white"
            >
              <Phone className="h-4 w-4" />
              +1 262-270-9899
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
