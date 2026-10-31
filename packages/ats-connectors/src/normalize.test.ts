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

  it("extracts salary ranges from varied textual formats", () => {
    const text1 = "The expected salary range for this role is $150,000 - $210,000 USD plus equity.";
    const result1 = extractSalaryRange(text1);
    expect(result1.salaryMin).toBe(150000);
    expect(result1.salaryMax).toBe(210000);

    const text2 = "Compensation: $140k to $180k depending on experience.";
    const result2 = extractSalaryRange(text2);
    expect(result2.salaryMin).toBe(140000);
    expect(result2.salaryMax).toBe(180000);

    const text3 = "No salary listed here.";
    const result3 = extractSalaryRange(text3);
    expect(result3.salaryMin).toBeNull();
    expect(result3.salaryMax).toBeNull();
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
