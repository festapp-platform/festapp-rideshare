import type { MetadataRoute } from "next";
import { SITE_URL } from "@festapp/shared";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/ride/", "/u/", "/search"],
        disallow: ["/api/", "/admin/", "/settings/", "/onboarding/", "/messages/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
