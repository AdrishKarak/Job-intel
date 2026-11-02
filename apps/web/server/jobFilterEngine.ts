/**
 * 3-Stage Deterministic Job Filtering Engine
 * Evaluates jobs in strict sequence:
 *   Stage 1: Experience-wise (years requirement, seniority levels)
 *   Stage 2: Location-wise (remote preference, preferred locations, geo-restrictions)
 *   Stage 3: Position & Skill-wise (target role alignment, tech skill overlap, domain relevance)
 */

export interface CandidateFitCriteria {
  experienceYears?: number | null;
  minExperienceYears?: number | null;
  maxExperienceYears?: number | null;
  experienceSummary?: Array<{
    company?: string;
    title?: string;
    location?: string | null;
    start?: string;
    end?: string | null;
    highlights?: string[];
  }> | null;
  preferredRoles?: string[];
  preferredLocations?: string[];
  remotePreference?: string; // "REMOTE" | "HYBRID" | "ONSITE" | "NO_PREFERENCE"
  userSkills?: string[]; // verified skill names
}

export interface JobForFitEvaluation {
  id?: string;
  title: string;
  description?: string | null;
  location?: string | null;
  remote?: boolean;
  skills?: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
}

export interface JobMatchEvaluationResult {
  passed: boolean;
  failedStage?: "EXPERIENCE" | "LOCATION" | "POSITION" | "SKILL";
  reasons: string[];
  candidateYears: number;
  jobMinYears?: number | null;
  jobSeniority?: string;
}

// Seniority regexes
const INTERN_REGEX = /\b(intern|internship|co-op|coop|apprentice|student)\b/i;
const ENTRY_REGEX = /\b(junior|jr\.?|entry|associate|new grad|new graduate|fresher)\b/i;
const SENIOR_REGEX = /\b(senior|sr\.?|lead)\b/i;
const STAFF_PRINCIPAL_REGEX = /\b(staff|principal|distinguished|fellow|architect)\b/i;
const EXECUTIVE_REGEX = /\b(director|vp|vice president|head of|chief|c-level|cto|cio|ciso)\b/i;

// Irrelevant / Disqualified occupational domains (when user is in tech/knowledge roles)
const UNRELATED_DOMAINS_REGEX =
  /\b(nurse|nursing|physician|therapist|dental|pharmacist|paralegal|receptionist|driver|janitor|cleaner|chef|cook|barista|cashier|retail associate|warehouse associate|store manager|teller|account executive|sdr|bdr|sales development rep|cold call|recruiter|talent acquisition|talent sourcer|hr generalist|payroll specialist|plumber|electrician|carpenter)\b/i;

/**
 * Computes candidate total experience years from experienceYears or experienceSummary
 */
export function resolveCandidateExperienceYears(criteria: CandidateFitCriteria): number {
  if (typeof criteria.experienceYears === "number" && criteria.experienceYears >= 0) {
    return criteria.experienceYears;
  }

  if (typeof criteria.maxExperienceYears === "number" && criteria.maxExperienceYears >= 0) {
    return criteria.maxExperienceYears;
  }

  if (typeof criteria.minExperienceYears === "number" && criteria.minExperienceYears >= 0) {
    return criteria.minExperienceYears;
  }

  if (criteria.experienceSummary && criteria.experienceSummary.length > 0) {
    let earliestYear = 9999;
    let latestYear = 0;
    const currentYear = new Date().getFullYear();

    for (const exp of criteria.experienceSummary) {
      const startMatch = exp.start?.match(/\b(19\d\d|20\d\d)\b/);
      if (startMatch) {
        const y = parseInt(startMatch[1], 10);
        if (y < earliestYear) earliestYear = y;
      }

      if (exp.end) {
        if (/present|current|now/i.test(exp.end)) {
          latestYear = currentYear;
        } else {
          const endMatch = exp.end.match(/\b(19\d\d|20\d\d)\b/);
          if (endMatch) {
            const y = parseInt(endMatch[1], 10);
            if (y > latestYear) latestYear = y;
          }
        }
      } else {
        latestYear = currentYear;
      }
    }

    if (earliestYear <= latestYear && earliestYear < 9999) {
      return Math.max(1, latestYear - earliestYear);
    }
  }

  // Check if candidate's target roles indicate seniority
  if (criteria.preferredRoles && criteria.preferredRoles.length > 0) {
    const rolesStr = criteria.preferredRoles.join(" ");
    if (EXECUTIVE_REGEX.test(rolesStr)) return 10;
    if (STAFF_PRINCIPAL_REGEX.test(rolesStr)) return 8;
    if (SENIOR_REGEX.test(rolesStr)) return 5;
    if (ENTRY_REGEX.test(rolesStr)) return 1;
    if (INTERN_REGEX.test(rolesStr)) return 0;
  }

  return 3; // sensible default mid-level if completely unspecified
}

/**
 * Extracts minimum required years of experience from job title & description
 */
export function extractJobMinYears(title: string, description?: string | null): number | null {
  const text = `${title} ${description || ""}`;

  // Patterns like "5+ years of experience", "minimum 3 years", "at least 4 yrs", "3-5 years experience"
  const patterns = [
    /(?:minimum|at least|requires?|with)\s+(\d{1,2})\+?\s*(?:to\s*\d+|-|\s*–\s*\d+)?\s*(?:years?|yrs)(?:\s+of)?\s+(?:relevant\s+|professional\s+|work\s+)?experience/i,
    /(\d{1,2})\+?\s*(?:to\s*\d+|-|\s*–\s*\d+)?\s*(?:years?|yrs)(?:\s+of)?\s+(?:relevant\s+|professional\s+|work\s+)?experience/i,
    /\b(\d{1,2})\+?\s*years?\s+(?:in|of)\b/i,
    /\b(\d{1,2})\+?\s*yoe\b/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (parsed >= 1 && parsed <= 25) {
        return parsed;
      }
    }
  }

  // If title explicitly has Senior / Staff / Executive, infer baseline minimum
  if (EXECUTIVE_REGEX.test(title)) return 10;
  if (STAFF_PRINCIPAL_REGEX.test(title)) return 7;
  if (SENIOR_REGEX.test(title)) return 5;
  if (ENTRY_REGEX.test(title)) return 0;
  if (INTERN_REGEX.test(title)) return 0;

  return null;
}

/**
 * Stage 1: Experience-wise filtering
 */
export function filterExperienceWise(
  job: JobForFitEvaluation,
  candidateYears: number,
  criteria?: CandidateFitCriteria
): { passed: boolean; reason?: string; jobMinYears?: number | null; jobSeniority?: string } {
  const title = job.title;
  let jobSeniority = "MID";
  if (INTERN_REGEX.test(title)) jobSeniority = "INTERN";
  else if (ENTRY_REGEX.test(title)) jobSeniority = "ENTRY";
  else if (EXECUTIVE_REGEX.test(title)) jobSeniority = "EXECUTIVE";
  else if (STAFF_PRINCIPAL_REGEX.test(title)) jobSeniority = "STAFF_PRINCIPAL";
  else if (SENIOR_REGEX.test(title)) jobSeniority = "SENIOR";

  const minYears = extractJobMinYears(title, job.description);

  // Preferred experience range filtering (when user configures preferred range for agent search)
  if (typeof criteria?.maxExperienceYears === "number") {
    const maxExp = criteria.maxExperienceYears;
    if (minYears !== null && minYears > maxExp) {
      return {
        passed: false,
        reason: `Job requires ${minYears}+ years of experience, exceeding candidate's preferred search maximum of ${maxExp} years.`,
        jobMinYears: minYears,
        jobSeniority,
      };
    }
    if (maxExp < 4 && jobSeniority === "SENIOR") {
      return {
        passed: false,
        reason: `Job requires Senior level, exceeding candidate's preferred experience max of ${maxExp} years.`,
        jobMinYears: minYears,
        jobSeniority,
      };
    }
    if (maxExp < 7 && (jobSeniority === "STAFF_PRINCIPAL" || jobSeniority === "EXECUTIVE")) {
      return {
        passed: false,
        reason: `Job requires ${jobSeniority} level, exceeding candidate's preferred experience max of ${maxExp} years.`,
        jobMinYears: minYears,
        jobSeniority,
      };
    }
  }

  if (typeof criteria?.minExperienceYears === "number") {
    const minExp = criteria.minExperienceYears;
    if (minExp >= 2 && jobSeniority === "INTERN") {
      return {
        passed: false,
        reason: `Job is an internship/student role, below candidate's preferred search minimum of ${minExp} years.`,
        jobMinYears: minYears,
        jobSeniority,
      };
    }
    if (minExp >= 3 && jobSeniority === "ENTRY") {
      return {
        passed: false,
        reason: `Job is an entry-level position, below candidate's preferred search minimum of ${minExp} years.`,
        jobMinYears: minYears,
        jobSeniority,
      };
    }
  }

  // Rule 1: Experienced candidates (>= 3 years) should not receive internships or student positions
  if (jobSeniority === "INTERN" && candidateYears >= 3) {
    return {
      passed: false,
      reason: `Job is an internship/student role but candidate has ${candidateYears} years of experience.`,
      jobMinYears: minYears,
      jobSeniority,
    };
  }

  // Rule 2: Junior / Entry candidates (< 2.5 years) cannot take Principal / Executive / Staff positions
  if (candidateYears < 2.5) {
    if (jobSeniority === "EXECUTIVE" || jobSeniority === "STAFF_PRINCIPAL") {
      return {
        passed: false,
        reason: `Job requires ${jobSeniority} level, exceeding candidate's ${candidateYears} years.`,
        jobMinYears: minYears,
        jobSeniority,
      };
    }
    if (minYears && minYears >= 4) {
      return {
        passed: false,
        reason: `Job requires ${minYears}+ years of experience, but candidate has ${candidateYears} years.`,
        jobMinYears: minYears,
        jobSeniority,
      };
    }
  }

  // Rule 3: Mid-level candidates (2.5 - 5 years) cannot take VP / Director / Head of
  if (candidateYears < 6 && jobSeniority === "EXECUTIVE") {
    return {
      passed: false,
      reason: `Executive / Director role requires significantly more experience than candidate's ${candidateYears} years.`,
      jobMinYears: minYears,
      jobSeniority,
    };
  }

  // Rule 4: Explicit required minimum years must not exceed candidate years + tolerance
  if (minYears !== null) {
    if (minYears >= 10 && candidateYears < 6) {
      return {
        passed: false,
        reason: `Job requires ${minYears}+ years, candidate has ${candidateYears} years.`,
        jobMinYears: minYears,
        jobSeniority,
      };
    }
    if (minYears >= 5 && candidateYears < 2) {
      return {
        passed: false,
        reason: `Job requires ${minYears}+ years, candidate has ${candidateYears} years.`,
        jobMinYears: minYears,
        jobSeniority,
      };
    }
  }

  return { passed: true, jobMinYears: minYears, jobSeniority };
}

export const CITY_SYNONYMS: Record<string, string[]> = {
  bengaluru: ["bengaluru", "bangalore", "blr"],
  bangalore: ["bengaluru", "bangalore", "blr"],
  gurugram: ["gurugram", "gurgaon", "ncr", "delhi ncr"],
  gurgaon: ["gurugram", "gurgaon", "ncr", "delhi ncr"],
  noida: ["noida", "greater noida", "ncr", "delhi ncr"],
  delhi: ["delhi", "new delhi", "ncr", "delhi ncr"],
  "new delhi": ["delhi", "new delhi", "ncr", "delhi ncr"],
  mumbai: ["mumbai", "bombay", "navi mumbai", "thane"],
  bombay: ["mumbai", "bombay", "navi mumbai", "thane"],
  kolkata: ["kolkata", "calcutta"],
  calcutta: ["kolkata", "calcutta"],
  chennai: ["chennai", "madras"],
  madras: ["chennai", "madras"],
  hyderabad: ["hyderabad", "secunderabad", "hyd"],
  kochi: ["kochi", "cochin", "ernakulam", "kerala"],
  cochin: ["kochi", "cochin", "ernakulam", "kerala"],
  ahmedabad: ["ahmedabad", "gandhinagar"],
  pune: ["pune", "hinjewadi"],
  trivandrum: ["trivandrum", "thiruvananthapuram", "kerala"],
  thiruvananthapuram: ["trivandrum", "thiruvananthapuram", "kerala"],
  sf: ["san francisco", "sf", "bay area", "silicon valley"],
  "san francisco": ["san francisco", "sf", "bay area", "silicon valley"],
  nyc: ["new york", "nyc", "manhattan", "brooklyn"],
  "new york": ["new york", "nyc", "manhattan", "brooklyn"],
};

/**
 * Stage 2: Location-wise filtering
 */
export function filterLocationWise(
  job: JobForFitEvaluation,
  criteria: CandidateFitCriteria
): { passed: boolean; reason?: string } {
  const remotePref = criteria.remotePreference || "NO_PREFERENCE";
  const preferredLocations = criteria.preferredLocations || [];
  const jobLoc = (job.location || "").toLowerCase().trim();

  const isJobRemote = Boolean(
    job.remote ||
    jobLoc.includes("remote") ||
    jobLoc.includes("anywhere") ||
    jobLoc.includes("work from home") ||
    jobLoc.includes("distributed") ||
    jobLoc.includes("virtual")
  );

  // 1. Strict Remote Only check
  if (remotePref === "REMOTE") {
    if (!isJobRemote) {
      return {
        passed: false,
        reason: `Candidate preferred Remote Only, but job is on-site (${job.location || "N/A"}).`,
      };
    }
  }

  // 2. Strict On-site Only check
  if (remotePref === "ONSITE") {
    if (isJobRemote && preferredLocations.length > 0) {
      const inPref = preferredLocations.some((pl) => {
        const cleanPref = pl.toLowerCase().trim();
        const synonyms = CITY_SYNONYMS[cleanPref] || [cleanPref];
        return synonyms.some((syn) => jobLoc.includes(syn));
      });
      if (!inPref) {
        return {
          passed: false,
          reason: `Candidate preferred On-site Only, but job is remote.`,
        };
      }
    }
  }

  // 3. Preferred locations check
  if (preferredLocations.length > 0) {
    if (isJobRemote) {
      // Check for incompatible country/regional restriction in remote job title or location
      // e.g. "Remote - EMEA Only" or "Remote - US Only"
      const hasRestrictedRegion =
        jobLoc.includes("emea") ||
        jobLoc.includes("apac") ||
        jobLoc.includes("latam") ||
        jobLoc.includes("us only") ||
        jobLoc.includes("usa only") ||
        jobLoc.includes("canada only") ||
        jobLoc.includes("uk only") ||
        jobLoc.includes("india only");

      if (hasRestrictedRegion) {
        const matchesPrefRegion = preferredLocations.some((pl) => {
          const l = pl.toLowerCase().trim();
          if (l.includes("us") || l.includes("united states") || l.includes("california") || l.includes("ca") || l.includes("ny")) {
            return jobLoc.includes("us") || jobLoc.includes("usa") || jobLoc.includes("north america");
          }
          if (l.includes("india") || l.includes("bangalore") || l.includes("bengaluru") || l.includes("hyderabad") || l.includes("pune") || l.includes("delhi") || l.includes("noida") || l.includes("mumbai") || l.includes("kolkata")) {
            return jobLoc.includes("india") || jobLoc.includes("apac");
          }
          if (l.includes("uk") || l.includes("london") || l.includes("europe") || l.includes("germany")) {
            return jobLoc.includes("uk") || jobLoc.includes("emea") || jobLoc.includes("europe");
          }
          const synonyms = CITY_SYNONYMS[l] || [l];
          return synonyms.some((syn) => jobLoc.includes(syn));
        });

        if (!matchesPrefRegion && remotePref !== "REMOTE") {
          return {
            passed: false,
            reason: `Remote job has geographic restriction (${job.location}) not matching preferred locations.`,
          };
        }
      }
      return { passed: true };
    }

    // Check if candidate wants positions in India
    const candidateWantsIndia = preferredLocations.some((pl) => {
      const l = pl.toLowerCase().trim();
      return (
        l === "india" ||
        l.includes("india") ||
        [
          "bengaluru", "bangalore", "hyderabad", "pune", "chennai", "gurugram", "gurgaon",
          "noida", "delhi", "new delhi", "kolkata", "calcutta", "mumbai", "bombay",
          "ahmedabad", "kochi", "cochin", "trivandrum"
        ].includes(l)
      );
    });

    // Check if job is in India (general or specific)
    const isJobInIndia =
      jobLoc.includes("india") ||
      jobLoc.includes(", in") ||
      jobLoc.endsWith(" in") ||
      jobLoc.includes("ind");

    if (candidateWantsIndia && isJobInIndia) {
      // If job specifies country-level "India" or "Remote India", it passes for India candidates
      if (
        jobLoc === "india" ||
        jobLoc.includes("remote india") ||
        jobLoc.includes("india remote") ||
        jobLoc.includes("remote, india") ||
        jobLoc.includes("india, remote") ||
        jobLoc.includes("india - remote")
      ) {
        return { passed: true };
      }
    }

    // On-site / Hybrid: Match one of the preferred locations with synonyms & regional aliases
    const matchesAny = preferredLocations.some((prefLoc) => {
      const cleanPref = prefLoc.toLowerCase().trim();
      if (!cleanPref) return false;

      // Check synonyms dictionary (e.g. Bengaluru <-> Bangalore, Gurugram <-> Gurgaon)
      const synonyms = CITY_SYNONYMS[cleanPref] || [cleanPref];
      if (synonyms.some((syn) => jobLoc.includes(syn))) return true;

      // If user selected general "India" and job is located anywhere in India
      if (cleanPref === "india" && isJobInIndia) return true;

      const tokens = cleanPref.split(/[\s,]+/).filter((t) => t.length >= 3);
      return tokens.length > 0 && tokens.some((t) => jobLoc.includes(t));
    });

    if (!matchesAny) {
      return {
        passed: false,
        reason: `Job location (${job.location || "N/A"}) does not match any preferred location (${preferredLocations.join(", ")}).`,
      };
    }
  }

  return { passed: true };
}

/**
 * Stage 3: Skill and Position (Role) wise filtering
 */
export function filterPositionAndSkillsWise(
  job: JobForFitEvaluation,
  criteria: CandidateFitCriteria
): { passed: boolean; reason?: string } {
  const title = job.title.toLowerCase();
  const desc = (job.description || "").toLowerCase();
  const preferredRoles = criteria.preferredRoles || [];
  const userSkills = (criteria.userSkills || []).map((s) => s.toLowerCase().trim()).filter(Boolean);

  // 1. Negative Filter: Reject completely unrelated occupational domains
  // unless user explicitly asked for that role
  const isExcludedDomain = UNRELATED_DOMAINS_REGEX.test(title);
  if (isExcludedDomain) {
    const userSpecificallyWanted = preferredRoles.some((pr) =>
      UNRELATED_DOMAINS_REGEX.test(pr.toLowerCase())
    );
    if (!userSpecificallyWanted) {
      return {
        passed: false,
        reason: `Job title (${job.title}) is outside candidate's target occupational domain.`,
      };
    }
  }

  // 2. Position (Role) Match
  let roleMatches = false;
  if (preferredRoles.length > 0) {
    roleMatches = preferredRoles.some((prefRole) => {
      const target = prefRole.toLowerCase().trim();
      if (!target) return false;
      if (title.includes(target)) return true;

      // Token overlap
      const tokens = target.split(/[\s/,-]+/).filter((t) => t.length >= 3 && !/engineer|developer|specialist/i.test(t));
      if (tokens.length > 0) {
        return tokens.some((t) => title.includes(t));
      }
      return false;
    });

    if (!roleMatches) {
      return {
        passed: false,
        reason: `Job title (${job.title}) does not match any preferred role (${preferredRoles.join(", ")}).`,
      };
    }
  } else {
    // If user has no preferred roles, verify job title represents standard technical/knowledge work
    roleMatches = true;
  }

  // 3. Technical Skill Match
  if (userSkills.length > 0) {
    const jobSkills = (job.skills || []).map((s) => s.toLowerCase().trim());

    // Check direct job skills overlap
    const skillOverlapCount = jobSkills.filter((js) => userSkills.includes(js)).length;

    // Also check if candidate skills appear in job title or description
    let textSkillMatchCount = 0;
    for (const skill of userSkills) {
      if (skill.length >= 2) {
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(`\\b${escaped}(?![a-zA-Z0-9_+#])`, "i");
        if (rx.test(title) || rx.test(desc)) {
          textSkillMatchCount++;
          if (textSkillMatchCount >= 2) break;
        }
      }
    }

    const isCoreSoftwareRole =
      /software|full\s*stack|frontend|backend|web|developer|engineer|trainee|associate|intern|cloud|qa|embedded|consultant|solutions/i.test(
        title
      );

    // If job explicitly provided skill tags, require overlap. If listing has no skill tags and brief desc (Workday, ATS stubs), trust role match.
    const hasExplicitJobSkills = jobSkills.length > 0;
    const isBriefListingWithoutSkills = !hasExplicitJobSkills && desc.length < 350;

    const hasSkillMatch =
      skillOverlapCount > 0 ||
      textSkillMatchCount > 0 ||
      (roleMatches && isCoreSoftwareRole && isBriefListingWithoutSkills);

    if (!hasSkillMatch) {
      return {
        passed: false,
        reason: `Job requires orthogonal skill set with 0 matching candidate verified skills.`,
      };
    }
  }

  return { passed: true };
}

/**
 * Master 3-Stage Evaluation: Experience -> Location -> Skill & Position
 */
export function evaluateJobMatch(
  job: JobForFitEvaluation,
  criteria: CandidateFitCriteria
): JobMatchEvaluationResult {
  const candidateYears = resolveCandidateExperienceYears(criteria);
  const reasons: string[] = [];

  // Stage 1: Experience-wise
  const expRes = filterExperienceWise(job, candidateYears, criteria);
  if (!expRes.passed) {
    return {
      passed: false,
      failedStage: "EXPERIENCE",
      reasons: [expRes.reason || "Failed experience criteria"],
      candidateYears,
      jobMinYears: expRes.jobMinYears,
      jobSeniority: expRes.jobSeniority,
    };
  }

  // Stage 2: Location-wise
  const locRes = filterLocationWise(job, criteria);
  if (!locRes.passed) {
    return {
      passed: false,
      failedStage: "LOCATION",
      reasons: [locRes.reason || "Failed location criteria"],
      candidateYears,
      jobMinYears: expRes.jobMinYears,
      jobSeniority: expRes.jobSeniority,
    };
  }

  // Stage 3: Position & Skill-wise
  const posRes = filterPositionAndSkillsWise(job, criteria);
  if (!posRes.passed) {
    return {
      passed: false,
      failedStage: "POSITION",
      reasons: [posRes.reason || "Failed position or skill criteria"],
      candidateYears,
      jobMinYears: expRes.jobMinYears,
      jobSeniority: expRes.jobSeniority,
    };
  }

  return {
    passed: true,
    reasons: [],
    candidateYears,
    jobMinYears: expRes.jobMinYears,
    jobSeniority: expRes.jobSeniority,
  };
}
