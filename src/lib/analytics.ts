const measurementIdCandidate = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? "";

export const googleAnalyticsMeasurementId = /^G-[A-Z0-9]+$/.test(measurementIdCandidate)
  ? measurementIdCandidate
  : null;

export type AnalyticsConsent = "granted" | "denied" | null;
export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

const CONSENT_STORAGE_KEY = "sds_analytics_consent";
const INTERNAL_PATH_PREFIXES = ["/admin", "/employee", "/client", "/employer"];

function isBrowser() {
  return typeof window !== "undefined";
}

function isInternalPath(pathname: string) {
  return INTERNAL_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function getAnalyticsConsent(): AnalyticsConsent {
  if (!isBrowser()) return null;
  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function setAnalyticsConsent(consent: Exclude<AnalyticsConsent, null>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);
}

export function loadGoogleAnalytics() {
  if (!isBrowser() || !googleAnalyticsMeasurementId || getAnalyticsConsent() !== "granted") {
    return false;
  }

  if (isInternalPath(window.location.pathname)) return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  if (!document.getElementById("sds-google-analytics")) {
    const script = document.createElement("script");
    script.id = "sds-google-analytics";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsMeasurementId}`;
    document.head.appendChild(script);
  }

  if (!window.__sdsGaConfigured) {
    window.gtag("js", new Date());
    window.gtag("config", googleAnalyticsMeasurementId, {
      send_page_view: false,
      anonymize_ip: true,
    });
    window.__sdsGaConfigured = true;
  }

  return true;
}

export function trackPageView(pathname: string, title?: string) {
  if (!loadGoogleAnalytics() || isInternalPath(pathname)) return;

  window.gtag?.("event", "page_view", {
    page_path: pathname,
    page_title: title || document.title,
    page_location: `${window.location.origin}${pathname}`,
  });
}

export function trackAnalyticsEvent(name: string, params: AnalyticsParams = {}) {
  if (!isBrowser() || isInternalPath(window.location.pathname) || !loadGoogleAnalytics()) return;

  const sanitized = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );

  window.gtag?.("event", name, sanitized);
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __sdsGaConfigured?: boolean;
  }
}
