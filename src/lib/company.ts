export const COMPANY_NAME = "SDS Consulting Services";
export const COMPANY_EMAIL = "hr@sdsconsultingservice.com";
export const COMPANY_PHONE_DISPLAY = "+1 262-270-9899";
export const COMPANY_PHONE_TEL = "+12622709899";
export const COMPANY_ADDRESS = "2761 Allied Street, 1st Floor, Green Bay, WI 54304";
export const COMPANY_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=2761%20Allied%20Street%2C%201st%20Floor%2C%20Green%20Bay%2C%20WI%2054304";

export const companyJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: COMPANY_NAME,
  email: COMPANY_EMAIL,
  telephone: COMPANY_PHONE_DISPLAY,
  address: {
    "@type": "PostalAddress",
    streetAddress: "2761 Allied Street, 1st Floor",
    addressLocality: "Green Bay",
    addressRegion: "WI",
    postalCode: "54304",
    addressCountry: "US",
  },
  areaServed: "North America",
  url: "/",
};
