// Shared helper to build full SEO meta for a TanStack route.
const OG_IMAGE = "/sds-og.jpg";
const SITE_NAME = "SDS Consulting Services";

export function buildSeoMeta(opts: {
  title: string;
  description: string;
  path?: string;
  image?: string;
}) {
  const image = opts.image ?? OG_IMAGE;
  return [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:image", content: image },
    ...(opts.path ? [{ property: "og:url", content: opts.path }] : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
    { name: "twitter:image", content: image },
  ];
}
