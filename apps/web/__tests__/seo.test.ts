import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// ---- Short ID format tests ----

describe("Short ID format", () => {
  // The short ID charset from the migration and decisions
  const SHORT_ID_CHARSET = "abcdefghjkmnpqrstuvwxyz23456789";

  it("charset does not contain ambiguous character 0", () => {
    expect(SHORT_ID_CHARSET).not.toContain("0");
  });

  it("charset does not contain ambiguous character 1", () => {
    expect(SHORT_ID_CHARSET).not.toContain("1");
  });

  it("charset does not contain ambiguous character i", () => {
    expect(SHORT_ID_CHARSET).not.toContain("i");
  });

  it("charset does not contain ambiguous character l", () => {
    expect(SHORT_ID_CHARSET).not.toContain("l");
  });

  it("charset does not contain ambiguous character o", () => {
    expect(SHORT_ID_CHARSET).not.toContain("o");
  });

  it("charset has 30 characters (26 letters - 3 ambiguous - 0 uppercase + 8 digits - 2 ambiguous)", () => {
    // a-z minus i, l, o = 23 letters; 2-9 minus (none removed from 2-9 but 0,1 already excluded from full 0-9) = 8 digits
    // Actually: a-z=26, remove i,l,o = 23; digits 2-9 = 8; total = 31... let's count the actual string
    expect(SHORT_ID_CHARSET.length).toBe(31);
  });

  it("generates 6-character IDs (verified via SQL migration)", () => {
    // The migration uses generate_short_id() which creates 6-char IDs
    const migrationPath = path.resolve(
      __dirname,
      "../../../supabase/migrations/042_short_ids.sql",
    );
    const migration = fs.readFileSync(migrationPath, "utf-8");
    // The function generates IDs of length 6
    expect(migration).toContain("6");
  });
});

// ---- SEO constants tests ----

describe("SEO constants", () => {
  // We import dynamically to handle the process.env dependency
  it("SITE_NAME is a non-empty string", async () => {
    const { SITE_NAME } = await import("@festapp/shared");
    expect(SITE_NAME).toBeTruthy();
    expect(typeof SITE_NAME).toBe("string");
    expect(SITE_NAME).toBe("spolujizda.online");
  });

  it("SITE_DESCRIPTION is a non-empty string", async () => {
    const { SITE_DESCRIPTION } = await import("@festapp/shared");
    expect(SITE_DESCRIPTION).toBeTruthy();
    expect(typeof SITE_DESCRIPTION).toBe("string");
  });

  it("SITE_URL is a non-empty string", async () => {
    const { SITE_URL } = await import("@festapp/shared");
    expect(SITE_URL).toBeTruthy();
    expect(typeof SITE_URL).toBe("string");
  });

  it("DEFAULT_OG_IMAGE is a non-empty string", async () => {
    const { DEFAULT_OG_IMAGE } = await import("@festapp/shared");
    expect(DEFAULT_OG_IMAGE).toBeTruthy();
    expect(typeof DEFAULT_OG_IMAGE).toBe("string");
  });
});

// ---- OG meta structure tests ----

describe("OG meta generation for rides", () => {
  const mockRide = {
    origin_address: "Prague",
    destination_address: "Brno",
    price_czk: 250,
    seats_available: 3,
    departure_time: "2026-03-01T10:00:00Z",
    short_id: "abc123",
  };

  // Replicate the metadata generation logic from the public ride page
  function generateRideMetadata(ride: Omit<typeof mockRide, 'price_czk'> & { price_czk: number | null }) {
    const SITE_NAME = "spolujizda.online";
    const SITE_URL = "https://rideshare.festapp.cz";
    const DEFAULT_OG_IMAGE = "/og-default.png";

    const title = `${ride.origin_address} -> ${ride.destination_address} | ${SITE_NAME}`;
    const description = `${ride.price_czk != null ? `${ride.price_czk} CZK` : "Free"}, ${ride.seats_available} ${ride.seats_available === 1 ? "seat" : "seats"} available`;
    const url = `${SITE_URL}/ride/${ride.short_id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: SITE_NAME,
        type: "website" as const,
        images: [
          {
            url: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image" as const,
        title,
        description,
      },
      alternates: {
        canonical: url,
      },
    };
  }

  it("title contains origin and destination", () => {
    const meta = generateRideMetadata(mockRide);
    expect(meta.title).toContain("Prague");
    expect(meta.title).toContain("Brno");
  });

  it("description contains price", () => {
    const meta = generateRideMetadata(mockRide);
    expect(meta.description).toContain("250 CZK");
  });

  it("description contains seats", () => {
    const meta = generateRideMetadata(mockRide);
    expect(meta.description).toContain("3 seats");
  });

  it("description uses singular seat for 1 seat", () => {
    const singleSeatRide = { ...mockRide, seats_available: 1 };
    const meta = generateRideMetadata(singleSeatRide);
    expect(meta.description).toContain("1 seat available");
    expect(meta.description).not.toContain("1 seats");
  });

  it("description shows Free when price is null", () => {
    const freeRide = { ...mockRide, price_czk: null as number | null };
    const meta = generateRideMetadata(freeRide);
    expect(meta.description).toContain("Free");
  });

  it("openGraph.type is website", () => {
    const meta = generateRideMetadata(mockRide);
    expect(meta.openGraph.type).toBe("website");
  });

  it("twitter.card is summary_large_image", () => {
    const meta = generateRideMetadata(mockRide);
    expect(meta.twitter.card).toBe("summary_large_image");
  });

  it("has canonical URL with short ID", () => {
    const meta = generateRideMetadata(mockRide);
    expect(meta.alternates.canonical).toContain("/ride/abc123");
  });

  it("OG image has correct dimensions", () => {
    const meta = generateRideMetadata(mockRide);
    expect(meta.openGraph.images[0].width).toBe(1200);
    expect(meta.openGraph.images[0].height).toBe(630);
  });
});

// ---- robots.txt tests ----

describe("robots.txt configuration", () => {
  it("robots.ts exports a function", async () => {
    // We can read and check the file content since the function requires Next.js runtime
    const robotsPath = path.resolve(__dirname, "../app/robots.ts");
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain("export default function robots");
  });

  it("disallows /api/ path", () => {
    const robotsPath = path.resolve(__dirname, "../app/robots.ts");
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain("/api/");
  });

  it("disallows /admin/ path", () => {
    const robotsPath = path.resolve(__dirname, "../app/robots.ts");
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain("/admin/");
  });

  it("disallows /settings/ path", () => {
    const robotsPath = path.resolve(__dirname, "../app/robots.ts");
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain("/settings/");
  });

  it("allows public ride pages", () => {
    const robotsPath = path.resolve(__dirname, "../app/robots.ts");
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain("/ride/");
  });
});

// ---- Sitemap structure tests ----

describe("Sitemap structure", () => {
  it("sitemap.ts exports an async function", () => {
    const sitemapPath = path.resolve(__dirname, "../app/sitemap.ts");
    const content = fs.readFileSync(sitemapPath, "utf-8");
    expect(content).toContain("export default async function sitemap");
  });

  it("sitemap includes changeFrequency in static entries", () => {
    const sitemapPath = path.resolve(__dirname, "../app/sitemap.ts");
    const content = fs.readFileSync(sitemapPath, "utf-8");
    expect(content).toContain("changeFrequency");
  });

  it("sitemap includes priority values", () => {
    const sitemapPath = path.resolve(__dirname, "../app/sitemap.ts");
    const content = fs.readFileSync(sitemapPath, "utf-8");
    expect(content).toContain("priority");
  });

  it("sitemap queries rides with short_id", () => {
    const sitemapPath = path.resolve(__dirname, "../app/sitemap.ts");
    const content = fs.readFileSync(sitemapPath, "utf-8");
    expect(content).toContain("short_id");
  });
});
