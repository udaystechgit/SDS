import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/SiteShell";
import { buildSeoMeta } from "@/lib/seo";
import { COMPANY_EMAIL } from "@/lib/company";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: buildSeoMeta({
      title: "Privacy Policy | SDS Consulting Services",
      description:
        "Learn how SDS Consulting Services handles website analytics, contact inquiries, recruitment information, and privacy choices.",
      path: "/privacy",
    }),
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteShell>
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--brand-bright)]">
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-heading font-bold md:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: August 28, 2026</p>

          <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
            <section>
              <h2 className="text-xl font-heading font-bold text-foreground">Information you provide</h2>
              <p className="mt-2">
                When you contact SDS Consulting Services, we may collect the information you submit,
                such as your name, business email, company, phone number, service interest, and
                message. Recruitment forms may also request professional information and resume
                materials. We use this information to respond to inquiries, evaluate business needs,
                communicate about opportunities, and operate our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-foreground">Website analytics</h2>
              <p className="mt-2">
                We may use Google Analytics to understand general website usage, including page
                visits and selected interactions such as contact-form conversions. Analytics is
                optional on this website and is loaded only after you accept analytics cookies. We
                do not intentionally send names, email addresses, phone numbers, resumes, or contact
                message contents to Google Analytics.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-foreground">Cookies and choices</h2>
              <p className="mt-2">
                If analytics is configured, you can accept or decline optional analytics through the
                website consent notice. Essential website functionality does not depend on accepting
                analytics. Your analytics preference is stored in your browser so the website can
                remember your choice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-foreground">How information is protected</h2>
              <p className="mt-2">
                We use reasonable administrative and technical safeguards designed to protect
                information handled through our systems. No internet transmission or storage method
                is completely secure, so absolute security cannot be guaranteed.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-foreground">Service providers</h2>
              <p className="mt-2">
                We may use service providers that support website hosting, data storage, analytics,
                communications, recruiting, and security. These providers may process information as
                needed to provide their services to SDS Consulting Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-foreground">Contact us</h2>
              <p className="mt-2">
                For privacy questions or requests, contact us at{" "}
                <a className="font-medium text-foreground underline" href={`mailto:${COMPANY_EMAIL}`}>
                  {COMPANY_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
