import { describe, it, expect } from "vitest";
import { parseResumeWithGemini, extractTextFromBuffer } from "@/server/resumeParser";

describe("Resume Parser & Regex Guardrails", () => {
  it("parses resume containing C++, C#, and Next.js without regex syntax errors", async () => {
    const resumeText = `
      John Doe
      Senior Software Engineer
      5 years of experience in distributed systems.
      Skills: C++, C#, Python, React, Next.js, Docker, Kubernetes, AWS, Go.
    `;

    const result = await parseResumeWithGemini(resumeText);
    expect(result).toBeDefined();
    expect(result.skills).toBeInstanceOf(Array);

    const skillNames = result.skills.map((s) => s.name);
    expect(skillNames).toContain("C++");
    expect(skillNames).toContain("Python");
    expect(skillNames).toContain("React");
    expect(skillNames).toContain("Next.js");
  });

  it("extracts plain text from text buffer cleanly", async () => {
    const buffer = Buffer.from("Experienced C++ and TypeScript Developer with 4 years of experience.");
    const text = await extractTextFromBuffer(buffer, "resume.txt");
    expect(text).toContain("C++");
    expect(text).toContain("TypeScript");

    const parsed = await parseResumeWithGemini(text);
    expect(parsed.skills.map((s) => s.name)).toContain("C++");
    expect(parsed.skills.map((s) => s.name)).toContain("TypeScript");
  });
});
