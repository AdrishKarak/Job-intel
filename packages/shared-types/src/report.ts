import { z } from "zod";

export const ReportTypeEnum = z.enum(["DAILY", "WEEKLY"]);
export type ReportType = z.infer<typeof ReportTypeEnum>;

export const BestMatchSchema = z.object({
  jobId: z.string(),
  title: z.string(),
  company: z.string(),
  matchScore: z.number()
});
export type BestMatch = z.infer<typeof BestMatchSchema>;

export const SkillGapSummaryItemSchema = z.object({
  skill: z.string(),
  frequency: z.number()
});
export type SkillGapSummaryItem = z.infer<typeof SkillGapSummaryItemSchema>;

export const StatusChangeSummaryItemSchema = z.object({
  jobId: z.string(),
  from: z.string(),
  to: z.string()
});
export type StatusChangeSummaryItem = z.infer<typeof StatusChangeSummaryItemSchema>;

export const ReportSummarySchema = z.object({
  newJobs: z.number().default(0),
  bestMatches: z.array(BestMatchSchema).default([]),
  skillGaps: z.array(SkillGapSummaryItemSchema).default([]),
  statusChanges: z.array(StatusChangeSummaryItemSchema).default([])
});
export type ReportSummary = z.infer<typeof ReportSummarySchema>;

export const SkillGapRecommendationItemSchema = z.object({
  skillName: z.string(),
  frequency: z.number(),
  trendScore: z.number().optional(),
  estimatedLift: z.number().optional()
});
export type SkillGapRecommendationItem = z.infer<typeof SkillGapRecommendationItemSchema>;

export const UpdateSkillGapsInputSchema = z.object({
  userId: z.string(),
  recommendations: z.array(SkillGapRecommendationItemSchema)
});
export type UpdateSkillGapsInput = z.infer<typeof UpdateSkillGapsInputSchema>;
