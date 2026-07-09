import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/brand/sds-logo-transparent.png";
import {
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_MAPS_URL,
  COMPANY_PHONE_DISPLAY,
  COMPANY_PHONE_TEL,
} from "@/lib/company";

export function Footer() {
  return (
    <footer className="bg-[color:var(--navy)] text-white/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="SDS Consulting Services"
              className="h-auto w-48 object-contain sm:w-56"
            />
            <div>
              <div className="font-heading font-bold text-lg">SDS Consulting Services</div>
              <div className="text-xs text-white/60 uppercase tracking-wider">
                AI Data Center Staffing & Infrastructure Experts
              </div>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm text-white/70 leading-relaxed">
            Enterprise-grade staffing, AI infrastructure deployment, and 24/7 operational services
            for the world's most demanding data centers.
          </p>
        </div>

        <div>
          <h4 className="font-heading font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <Link to="/about" className="hover:text-white">
                About
              </Link>
            </li>
            <li>
              <Link to="/services" className="hover:text-white">
                Services
              </Link>
            </li>
            <li>
              <Link to="/careers" className="hover:text-white">
                Careers
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-semibold mb-4">Contact</h4>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-[color:var(--brand-bright)]" />
              <a
                href={COMPANY_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                {COMPANY_ADDRESS}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-[color:var(--brand-bright)]" />
              {COMPANY_EMAIL}
            </li>
            <li className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 text-[color:var(--brand-bright)]" />
              <a href={`tel:${COMPANY_PHONE_TEL}`} className="hover:text-white">
                {COMPANY_PHONE_DISPLAY}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 text-xs text-white/50 flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} SDS Consulting Services. All rights reserved.</span>
          <span>Green Bay, WI • Built for enterprise data centers</span>
        </div>
      </div>
    </footer>
  );
}
