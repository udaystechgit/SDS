import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  getAnalyticsConsent,
  googleAnalyticsMeasurementId,
  loadGoogleAnalytics,
  setAnalyticsConsent,
  trackPageView,
  type AnalyticsConsent,
} from "@/lib/analytics";

export function AnalyticsConsentManager() {
  const location = useRouterState({ select: (state) => state.location });
  const [consent, setConsent] = useState<AnalyticsConsent>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const storedConsent = getAnalyticsConsent();
    setConsent(storedConsent);
    setInitialized(true);

    if (storedConsent === "granted") {
      loadGoogleAnalytics();
    }
  }, []);

  useEffect(() => {
    if (!initialized || consent !== "granted") return;
    trackPageView(location.pathname, document.title);
  }, [consent, initialized, location.pathname]);

  if (!googleAnalyticsMeasurementId || !initialized || consent !== null) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-border bg-background p-5 shadow-2xl md:flex md:items-center md:justify-between md:gap-6">
      <div>
        <p className="text-sm font-semibold text-foreground">Help us improve the SDS website</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          We use Google Analytics to understand website traffic and improve our services. Analytics
          is optional and is not loaded unless you accept. We do not intentionally send contact
          form names, email addresses, phone numbers, resumes, or message contents to Analytics. See
          our <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
      <div className="mt-4 flex shrink-0 gap-2 md:mt-0">
        <button
          type="button"
          onClick={() => {
            setAnalyticsConsent("denied");
            setConsent("denied");
          }}
          className="rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-accent"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => {
            setAnalyticsConsent("granted");
            setConsent("granted");
            loadGoogleAnalytics();
          }}
          className="rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-white shadow-brand hover:opacity-95"
        >
          Accept analytics
        </button>
      </div>
    </div>
  );
}
