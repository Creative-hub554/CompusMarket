import { SITE_NAME, SITE_DESCRIPTION, getSiteUrl } from "@/lib/site";

export function OrganizationJsonLd() {
  const url = getSiteUrl();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url,
        logo: `${url}/icon-512.png`,
      },
      {
        "@type": "WebSite",
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url,
        inLanguage: ["km", "en"],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
