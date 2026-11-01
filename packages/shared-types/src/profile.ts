import { z } from "zod";

export const RemotePreferenceEnum = z.enum(["REMOTE", "HYBRID", "ONSITE", "NO_PREFERENCE"]);
export type RemotePreference = z.infer<typeof RemotePreferenceEnum>;

export const SkillSourceEnum = z.enum(["RESUME", "MANUAL"]);
export type SkillSource = z.infer<typeof SkillSourceEnum>;

export const ExperienceItemSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().nullable().optional(),
  start: z.string(),
  end: z.string().nullable().optional(),
  highlights: z.array(z.string()).default([])
});
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;

export const ProjectItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  tech: z.array(z.string()).default([])
});
export type ProjectItem = z.infer<typeof ProjectItemSchema>;

export const EducationItemSchema = z.object({
  school: z.string(),
  degree: z.string(),
  field: z.string(),
  year: z.number().nullable().optional()
});
export type EducationItem = z.infer<typeof EducationItemSchema>;

export const ResumeSkillSchema = z.object({
  name: z.string(),
  category: z.string().nullable().optional()
});
export type ResumeSkill = z.infer<typeof ResumeSkillSchema>;

export const ResumeParsedOutputSchema = z.object({
  skills: z.array(ResumeSkillSchema).default([]),
  experienceYears: z.number().nullable().optional(),
  experienceSummary: z.array(ExperienceItemSchema).default([]),
  projectsSummary: z.array(ProjectItemSchema).default([]),
  educationSummary: z.array(EducationItemSchema).default([]),
  professionalSummary: z.string().nullable().optional()
});
export type ResumeParsedOutput = z.infer<typeof ResumeParsedOutputSchema>;

export const CandidateProfileUpdateInputSchema = z.object({
  experienceYears: z.number().nullable().optional(),
  professionalSummary: z.string().nullable().optional(),
  preferredRoles: z.array(z.string()).optional(),
  preferredLocations: z.array(z.string()).optional(),
  minSalary: z.number().nullable().optional(),
  maxSalary: z.number().nullable().optional(),
  remotePreference: RemotePreferenceEnum.optional(),
  experienceSummary: z.array(ExperienceItemSchema).optional(),
  projectsSummary: z.array(ProjectItemSchema).optional(),
  educationSummary: z.array(EducationItemSchema).optional()
});
export type CandidateProfileUpdateInput = z.infer<typeof CandidateProfileUpdateInputSchema>;

export const AddSkillInputSchema = z.object({
  name: z.string().min(1),
  proficiency: z.string().optional(),
  yearsOfUse: z.number().optional()
});
export type AddSkillInput = z.infer<typeof AddSkillInputSchema>;

export const ProfileDiffSchema = z.object({
  skillsToAdd: z.array(z.string()),
  skillsExisting: z.array(z.string()),
  manualSkillsPreserved: z.array(z.string()),
  experienceYearsNew: z.number().nullable().optional(),
  experienceYearsOld: z.number().nullable().optional(),
  professionalSummaryNew: z.string().nullable().optional(),
  professionalSummaryOld: z.string().nullable().optional(),
  experienceSummaryNew: z.array(ExperienceItemSchema),
  projectsSummaryNew: z.array(ProjectItemSchema),
  educationSummaryNew: z.array(EducationItemSchema)
});
export type ProfileDiff = z.infer<typeof ProfileDiffSchema>;
