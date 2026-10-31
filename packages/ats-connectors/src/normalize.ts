import type { NormalizedJob } from "@repo/shared-types";

/**
 * Strips HTML formatting and normalizes whitespace
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detects whether a position is remote from location or title
 */
export function isRemotePosition(location?: string | null, title?: string): boolean {
  const combined = `${location || ""} ${title || ""}`.toLowerCase();
  return (
    combined.includes("remote") ||
    combined.includes("anywhere") ||
    combined.includes("distributed") ||
    combined.includes("work from home") ||
    combined.includes("virtual")
  );
}

/**
 * Extracts salary min/max from text if specified
 */
export function extractSalaryRange(text: string): {
  salaryMin: number | null;
  salaryMax: number | null;
} {
  // Matches "$120,000 - $180,000" or "$120k - $180k"
  const rangeMatch = text.match(
    /\$(\d{1,3}(?:,\d{3})+|\d{2,3}k?)\s*(?:-|to)\s*\$(\d{1,3}(?:,\d{3})+|\d{2,3}k?)/i
  );

  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const parseNum = (str: string) => {
      let cleaned = str.replace(/,/g, "").toLowerCase();
      if (cleaned.endsWith("k")) {
        return parseInt(cleaned.slice(0, -1), 10) * 1000;
      }
      return parseInt(cleaned, 10);
    };

    const min = parseNum(rangeMatch[1]);
    const max = parseNum(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max) && min <= max) {
      return { salaryMin: min, salaryMax: max };
    }
  }

  return { salaryMin: null, salaryMax: null };
}

/**
 * Common technical keywords to extract as JobSkill tags
 */
const KNOWN_SKILLS = [
  "TypeScript", "JavaScript", "Python", "Go", "Golang", "Rust", "Java", "C++", "C#",
  "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "NestJS", "FastAPI", "Django",
  "GraphQL", "REST", "gRPC", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux",
  "Kafka", "RabbitMQ", "Microservices", "Distributed Systems", "Machine Learning", "LLM"
];

export function extractSkillsFromText(text: string): string[] {
  const matched = new Set<string>();
  const escapeRegex = (s: string) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

  for (const skill of KNOWN_SKILLS) {
    const escaped = escapeRegex(skill);
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(text)) {
      matched.add(skill === "Golang" ? "Go" : skill);
    }
  }
  return Array.from(matched);
}
