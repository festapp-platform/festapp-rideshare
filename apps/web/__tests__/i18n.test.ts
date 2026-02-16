import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  LOCALE_STORAGE_KEY,
} from "@festapp/shared";
import type { SupportedLocale } from "@festapp/shared";
import { translations, type TranslationKeys } from "../lib/i18n/translations";

describe("i18n constants", () => {
  it("SUPPORTED_LOCALES contains exactly cs, sk, en", () => {
    expect([...SUPPORTED_LOCALES]).toEqual(["cs", "sk", "en"]);
  });

  it("DEFAULT_LOCALE is cs", () => {
    expect(DEFAULT_LOCALE).toBe("cs");
  });

  it("LOCALE_NAMES has entries for all supported locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_NAMES[locale]).toBeDefined();
      expect(typeof LOCALE_NAMES[locale]).toBe("string");
      expect(LOCALE_NAMES[locale].length).toBeGreaterThan(0);
    }
  });

  it("LOCALE_STORAGE_KEY is a non-empty string", () => {
    expect(LOCALE_STORAGE_KEY).toBe("festapp-locale");
  });
});

describe("translations", () => {
  const csKeys = Object.keys(translations.cs).sort();
  const skKeys = Object.keys(translations.sk).sort();
  const enKeys = Object.keys(translations.en).sort();

  it("all three locales have the same keys (no missing translations)", () => {
    expect(csKeys).toEqual(skKeys);
    expect(csKeys).toEqual(enKeys);
  });

  it("each locale has at least 50 translation keys", () => {
    expect(csKeys.length).toBeGreaterThanOrEqual(50);
    expect(skKeys.length).toBeGreaterThanOrEqual(50);
    expect(enKeys.length).toBeGreaterThanOrEqual(50);
  });

  it("no translation value is empty", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const dict = translations[locale] as Record<string, string>;
      for (const [key, value] of Object.entries(dict)) {
        expect(value.length, `${locale}.${key} should not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it("translations for different locales are actually different", () => {
    // English and Czech should differ for most keys
    const diffCount = csKeys.filter(
      (key) =>
        (translations.cs as Record<string, string>)[key] !==
        (translations.en as Record<string, string>)[key],
    ).length;
    expect(diffCount).toBeGreaterThan(30);
  });
});

describe("t() function behavior", () => {
  it("returns correct Czech string for a known key", () => {
    const dict = translations.cs as Record<string, string>;
    expect(dict["nav.search"]).toBe("Hledat");
  });

  it("returns correct English string for a known key", () => {
    const dict = translations.en as Record<string, string>;
    expect(dict["nav.search"]).toBe("Search");
  });

  it("returns correct Slovak string for a known key", () => {
    const dict = translations.sk as Record<string, string>;
    expect(dict["nav.search"]).toBe("Hladat");
  });

  it("returns undefined for an unknown key (provider returns key itself as fallback)", () => {
    const dict = translations.cs as Record<string, string>;
    expect(dict["nonexistent.key"]).toBeUndefined();
  });
});
