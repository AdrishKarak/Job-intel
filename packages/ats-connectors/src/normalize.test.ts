import { describe, it, expect } from "vitest";
import {
  stripHtml,
  isRemotePosition,
  extractSalaryRange,
  extractSkillsFromText,
} from "./normalize";

describe("ATS Connector Normalization", () => {
  it("strips HTML tags and unescapes entities", () => {
    const raw = "<p>Join our <strong>Engineering</strong> team &amp; build the future.</p><br><li>React &amp; Node</li>";
    const cleaned = stripHtml(raw);
    expect(cleaned).toContain("Join our Engineering team & build the future.");
    expect(cleaned).toContain("React & Node");
    expect(cleaned).not.toContain("<p>");
    expect(cleaned).not.toContain("&amp;");
  });

  it("detects remote positions correctly", () => {
    expect(isRemotePosition("Remote - US", "Staff Engineer")).toBe(true);
    expect(isRemotePosition("San Francisco, CA", "Remote Backend Lead")).toBe(true);
    expect(isRemotePosition("Distributed, Global", "Developer")).toBe(true);
    expect(isRemotePosition("New York, NY", "Account Executive")).toBe(false);
  });

  it("extracts salary ranges in Indian Rupees (LPA, INR, converted USD)", () => {
    // 1. Indian Rupee in LPA
    const textLpa = "The expected compensation for this role is 8.5 - 16 LPA depending on experience.";
    const resultLpa = extractSalaryRange(textLpa);
    expect(resultLpa.salaryMin).toBe(850000);
    expect(resultLpa.salaryMax).toBe(1600000);

    // 2. Indian Rupee in full numbers
    const textInr = "Compensation: ₹8,00,000 to ₹14,00,000 per annum.";
    const resultInr = extractSalaryRange(textInr);
    expect(resultInr.salaryMin).toBe(800000);
    expect(resultInr.salaryMax).toBe(1400000);

    // 3. USD amounts converted to INR
    const textUsd = "The expected salary range for this role is $150,000 - $210,000 USD plus equity.";
    const resultUsd = extractSalaryRange(textUsd);
    expect(resultUsd.salaryMin).toBe(150000 * 85);
    expect(resultUsd.salaryMax).toBe(210000 * 85);

    // 4. Raw USD without conversion when option passed
    const textRawUsd = "Compensation: $140k to $180k depending on experience.";
    const resultRawUsd = extractSalaryRange(textRawUsd, { convertUsdToInr: false });
    expect(resultRawUsd.salaryMin).toBe(140000);
    expect(resultRawUsd.salaryMax).toBe(180000);

    // 5. Unlisted compensation
    const textEmpty = "No salary listed here.";
    const resultEmpty = extractSalaryRange(textEmpty);
    expect(resultEmpty.salaryMin).toBeNull();
    expect(resultEmpty.salaryMax).toBeNull();
  });

  it("extracts recognized technical skill keywords", () => {
    const text = "We are seeking a Senior TypeScript developer experienced with React, Next.js, PostgreSQL, and Docker.";
    const skills = extractSkillsFromText(text);
    expect(skills).toContain("TypeScript");
    expect(skills).toContain("React");
    expect(skills).toContain("Next.js");
    expect(skills).toContain("PostgreSQL");
    expect(skills).toContain("Docker");
  });
});
