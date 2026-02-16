import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// ---- Store metadata tests ----

describe("Store metadata", () => {
  const metadataPath = path.resolve(
    __dirname,
    "../public/store-metadata.json",
  );

  it("store-metadata.json exists and is valid JSON", () => {
    expect(fs.existsSync(metadataPath)).toBe(true);
    const content = fs.readFileSync(metadataPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed).toBeDefined();
  });

  it("has ios and android sections", () => {
    const content = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(content);
    expect(metadata.ios).toBeDefined();
    expect(metadata.android).toBeDefined();
  });

  it("ios has name, description, and privacy_url", () => {
    const content = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(content);
    expect(metadata.ios.name).toBeTruthy();
    expect(metadata.ios.description).toBeTruthy();
    expect(metadata.ios.privacy_url).toBeTruthy();
  });

  it("android has name, full_description, and privacy_policy", () => {
    const content = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(content);
    expect(metadata.android.name).toBeTruthy();
    expect(metadata.android.full_description).toBeTruthy();
    expect(metadata.android.privacy_policy).toBeTruthy();
  });

  it("iOS description is under 4000 characters", () => {
    const content = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(content);
    expect(metadata.ios.description.length).toBeLessThan(4000);
  });

  it("Android short_description is under 80 characters", () => {
    const content = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(content);
    expect(metadata.android.short_description.length).toBeLessThan(80);
  });

  it("Android full_description is under 4000 characters", () => {
    const content = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(content);
    expect(metadata.android.full_description.length).toBeLessThan(4000);
  });

  it("iOS keywords are comma-separated and under 100 characters", () => {
    const content = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(content);
    const keywords = metadata.ios.keywords;
    expect(keywords).toContain(",");
    expect(keywords.length).toBeLessThan(100);
  });
});

// ---- Page existence tests ----

describe("Launch pages exist", () => {
  it("terms page exists at app/(public)/terms/page.tsx", () => {
    const pagePath = path.resolve(
      __dirname,
      "../app/(public)/terms/page.tsx",
    );
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it("privacy page exists at app/(public)/privacy/page.tsx", () => {
    const pagePath = path.resolve(
      __dirname,
      "../app/(public)/privacy/page.tsx",
    );
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it("help page exists at app/(public)/help/page.tsx", () => {
    const pagePath = path.resolve(
      __dirname,
      "../app/(public)/help/page.tsx",
    );
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it("donate page exists at app/(app)/donate/page.tsx", () => {
    const pagePath = path.resolve(
      __dirname,
      "../app/(app)/donate/page.tsx",
    );
    expect(fs.existsSync(pagePath)).toBe(true);
  });
});

// ---- version.json tests ----

describe("version.json", () => {
  it("exists and has minVersion and latestVersion fields", () => {
    const versionPath = path.resolve(__dirname, "../public/version.json");
    expect(fs.existsSync(versionPath)).toBe(true);
    const content = fs.readFileSync(versionPath, "utf-8");
    const version = JSON.parse(content);
    expect(version.minVersion).toBeTruthy();
    expect(version.latestVersion).toBeTruthy();
  });
});

// ---- SITE_URL constant test ----

describe("SITE_URL constant", () => {
  it("SITE_URL is a valid URL", async () => {
    const { SITE_URL } = await import("@festapp/shared");
    expect(SITE_URL).toBeTruthy();
    // Should start with https://
    expect(SITE_URL).toMatch(/^https?:\/\//);
  });
});
