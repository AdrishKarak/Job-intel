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

export const USD_TO_INR_RATE = 85;

/**
 * Extracts salary min/max from text in Indian Rupees (INR / ₹ / Rs / LPA).
 * Handles:
 * - LPA / Lakhs: "8 - 14 LPA", "₹6.5 to 12 Lakhs", "15 LPA"
 * - Full Rupee figures: "₹8,00,000 - ₹15,00,000", "Rs. 600000 - 1200000"
 * - USD amounts converted to INR at ₹85/USD: "$120,000 - $180,000", "$120k - $160k"
 */
export function extractSalaryRange(
  text: string,
  options?: { convertUsdToInr?: boolean }
): {
  salaryMin: number | null;
  salaryMax: number | null;
} {
  if (!text) return { salaryMin: null, salaryMax: null };

  const convertUsd = options?.convertUsdToInr !== false;

  // 1. LPA / Lakhs range: "8 - 14 LPA", "₹6.5 to 12.5 Lakhs", "10-18 lpa"
  const lpaRange = text.match(
    /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?|lacs?|lac)\b/i
  );
  if (lpaRange && lpaRange[1] && lpaRange[2]) {
    const min = Math.round(parseFloat(lpaRange[1]) * 100_000);
    const max = Math.round(parseFloat(lpaRange[2]) * 100_000);
    if (!isNaN(min) && !isNaN(max) && min <= max) {
      return { salaryMin: min, salaryMax: max };
    }
  }

  // Single LPA: "15 LPA", "₹12 Lakhs"
  const singleLpa = text.match(
    /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?|lacs?|lac)\b/i
  );
  if (singleLpa && singleLpa[1]) {
    const val = Math.round(parseFloat(singleLpa[1]) * 100_000);
    if (!isNaN(val)) return { salaryMin: val, salaryMax: val };
  }

  // 2. Rupee full numbers: "₹6,00,000 - ₹12,00,000", "Rs. 500000 to 1000000"
  const inrRange = text.match(
    /(?:₹|rs\.?|inr)\s*(\d{1,2}(?:,\d{2})*(?:,\d{3})+|\d{5,8})\s*(?:-|to)\s*(?:₹|rs\.?|inr)?\s*(\d{1,2}(?:,\d{2})*(?:,\d{3})+|\d{5,8})/i
  );
  if (inrRange && inrRange[1] && inrRange[2]) {
    const min = parseInt(inrRange[1].replace(/,/g, ""), 10);
    const max = parseInt(inrRange[2].replace(/,/g, ""), 10);
    if (!isNaN(min) && !isNaN(max) && min <= max) {
      return { salaryMin: min, salaryMax: max };
    }
  }

  // 3. USD ($) converted to INR: "$120,000 - $180,000", "$120k - $180k"
  const usdRange = text.match(
    /(?:\$|usd)\s*(\d{1,3}(?:,\d{3})+|\d{2,3}k?)\s*(?:-|to)\s*(?:\$|usd)?\s*(\d{1,3}(?:,\d{3})+|\d{2,3}k?)/i
  );
  if (usdRange && usdRange[1] && usdRange[2]) {
    const parseNum = (str: string) => {
      let cleaned = str.replace(/,/g, "").toLowerCase();
      if (cleaned.endsWith("k")) {
        return parseInt(cleaned.slice(0, -1), 10) * 1000;
      }
      return parseInt(cleaned, 10);
    };

    const multiplier = convertUsd ? USD_TO_INR_RATE : 1;
    const min = parseNum(usdRange[1]) * multiplier;
    const max = parseNum(usdRange[2]) * multiplier;
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
    const start = /^\w/.test(skill) ? "(?:^|[^a-zA-Z0-9_])" : "(?:^|\\s)";
    const end = /\w$/.test(skill) ? "(?![a-zA-Z0-9_+#])" : "(?:$|[^a-zA-Z0-9_+#])";
    const regex = new RegExp(`${start}${escaped}${end}`, "i");
    if (regex.test(text)) {
      matched.add(skill === "Golang" ? "Go" : skill);
    }
  }
  return Array.from(matched);
}
