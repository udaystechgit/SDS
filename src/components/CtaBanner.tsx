import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 md:p-14 shadow-brand">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl md:text-4xl font-heading font-bold text-white">
                Scaling an AI data center? Let's talk.
              </h3>
              <p className="mt-3 text-white/85 max-w-xl">
                From 10 technicians to 500. From a single rack to a full hall. SDS is your trusted
                Wisconsin-based partner for AI infrastructure at every scale.
              </p>
            </div>
            <div className="flex md:justify-end gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[color:var(--brand-deep)] font-semibold hover:bg-white/90"
              >
                Get a Quote <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-white/30 text-white font-semibold hover:bg-white/20"
              >
                Our Services
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
