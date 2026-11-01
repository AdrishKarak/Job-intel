import { z } from "zod";

export const ApplicationStatusEnum = z.enum([
  "DISCOVERED",
  "SAVED",
  "APPLIED",
  "OA_RECEIVED",
  "OA_CLEARED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_CLEARED",
  "OFFER",
  "REJECTED",
  "GHOSTED"
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;

export const AtsTypeEnum = z.enum([
  "GREENHOUSE",
  "LEVER",
  "ASHBY",
  "WORKDAY",
  "SMARTRECRUITERS",
  "WORKABLE",
  "WELLFOUND",
  "CUSTOM_FIRECRAWL",
  "CUSTOM_PUPPETEER"
]);
export type AtsType = z.infer<typeof AtsTypeEnum>;

export const JobSourceEnum = z.enum([
  "GREENHOUSE",
  "LEVER",
  "ASHBY",
  "WORKDAY",
  "SMARTRECRUITERS",
  "WORKABLE",
  "WELLFOUND",
  "FIRECRAWL",
  "PUPPETEER"
]);
export type JobSource = z.infer<typeof JobSourceEnum>;

export const JobFiltersSchema = z.object({
  role: z.string().optional(),
  location: z.string().optional(),
  company: z.string().optional(),
  minSalary: z.number().optional(),
  status: ApplicationStatusEnum.optional(),
  minMatchScore: z.number().min(0).max(100).optional(),
  remote: z.boolean().optional(),
  onlyMatching: z.boolean().optional()
});
export type JobFilters = z.infer<typeof JobFiltersSchema>;

export const UpdateJobStatusInputSchema = z.object({
  jobId: z.string(),
  status: ApplicationStatusEnum,
  note: z.string().optional()
});
export type UpdateJobStatusInput = z.infer<typeof UpdateJobStatusInputSchema>;

export const NormalizedJobSchema = z.object({
  externalId: z.string(),
  title: z.string(),
  companyName: z.string(),
  companyId: z.string().optional(),
  location: z.string().nullable().optional(),
  remote: z.boolean().default(false),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  description: z.string(),
  applicationUrl: z.string().url().or(z.string()),
  source: JobSourceEnum,
  skills: z.array(z.string()).default([])
});
export type NormalizedJob = z.infer<typeof NormalizedJobSchema>;

export const ScoredJobOutputSchema = z.object({
  jobId: z.string(),
  matchScore: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  aiExplanation: z.string()
});
export type ScoredJobOutput = z.infer<typeof ScoredJobOutputSchema>;
