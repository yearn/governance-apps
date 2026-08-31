import { describe, expect, it } from "vitest";
import { assertAlertCatalogueIntroductionHtml } from "@/workers/alerts-bot/src/catalogue-renderer";
import {
  ALERT_CATALOGUE_CANONICAL_FIXTURES,
  renderAlertCatalogueFixture,
} from "./alerts-bot.catalogue-fixtures";

const EXPECTED_TEMPLATES = [
  "S1", "S2", "S3",
  "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12",
  "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9",
  "I-styfi", "I-veyfi", "I-yeth",
] as const;

describe("approved alert catalogue", () => {
  it("contains every action template and three channel introductions", () => {
    expect(() => assertAlertCatalogueIntroductionHtml()).not.toThrow();
    expect(ALERT_CATALOGUE_CANONICAL_FIXTURES.map(({ template }) => template))
      .toEqual(EXPECTED_TEMPLATES);
  });

  for (const fixture of ALERT_CATALOGUE_CANONICAL_FIXTURES) {
    it(`${fixture.template} ${fixture.id}`, () => {
      const actual = renderAlertCatalogueFixture(fixture);
      if (process.env.ALERTS_PRINT_GOLDENS === "1") {
        console.log(`\n===== ${fixture.template} · ${fixture.id} =====\n${actual}`);
      }
      expect(actual).toBe(fixture.expectedHtml);
      expect(actual.length).toBeLessThanOrEqual(4_096);
      expect(actual).not.toMatch(/Shrimp|Fish|Dolphin|Shark|Impact basis/);
    });
  }
});
