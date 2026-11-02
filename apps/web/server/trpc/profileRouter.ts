import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./trpc";
import {
  CandidateProfileUpdateInputSchema,
  AddSkillInputSchema,
  type ProfileDiff,
} from "@repo/shared-types";
import {
  createPresignedUploadUrl,
  getResumeFileBuffer,
  deleteResumeFile,
} from "@/server/storage";
import { checkRateLimit } from "@/server/rateLimit";
import { logger, createRunId } from "@/server/logger";
import {
  setParseJob,
  getParseJob,
  extractTextFromBuffer,
  parseResumeWithGemini,
  type ParseJob,
} from "@/server/resumeParser";
import crypto from "crypto";

export const profileRouter = router({
  // 1. Get profile
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.prisma.candidateProfile.findUnique({
      where: { userId: ctx.userId },
    });

    const userSkills = await ctx.prisma.userSkill.findMany({
      where: { userId: ctx.userId },
      include: { skill: true },
      orderBy: { createdAt: "asc" },
    });

    return {
      profile,
      skills: userSkills,
    };
  }),

  // 2. Update profile preferences
  update: protectedProcedure
    .input(CandidateProfileUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.prisma.candidateProfile.upsert({
        where: { userId: ctx.userId },
        update: {
          experienceYears: input.experienceYears ?? input.maxExperienceYears ?? undefined,
          minExperienceYears: input.minExperienceYears,
          maxExperienceYears: input.maxExperienceYears,
          professionalSummary: input.professionalSummary,
          preferredRoles: input.preferredRoles,
          preferredLocations: input.preferredLocations,
          minSalary: input.minSalary,
          maxSalary: input.maxSalary,
          remotePreference: input.remotePreference,
          experienceSummary: input.experienceSummary as any,
          projectsSummary: input.projectsSummary as any,
          educationSummary: input.educationSummary as any,
        },
        create: {
          userId: ctx.userId,
          experienceYears: input.experienceYears ?? input.maxExperienceYears ?? 0,
          minExperienceYears: input.minExperienceYears ?? 0,
          maxExperienceYears: input.maxExperienceYears ?? 5,
          professionalSummary: input.professionalSummary,
          preferredRoles: input.preferredRoles ?? [],
          preferredLocations: input.preferredLocations ?? [],
          minSalary: input.minSalary,
          maxSalary: input.maxSalary,
          remotePreference: input.remotePreference ?? "NO_PREFERENCE",
          experienceSummary: input.experienceSummary as any,
          projectsSummary: input.projectsSummary as any,
          educationSummary: input.educationSummary as any,
        },
      });

      return updated;
    }),

  // 3. Add skill (Manual or Resume)
  addSkill: protectedProcedure
    .input(AddSkillInputSchema)
    .mutation(async ({ ctx, input }) => {
      const normalizedName = input.name.trim();
      if (!normalizedName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Skill name cannot be empty",
        });
      }

      // Upsert global skill
      const skill = await ctx.prisma.skill.upsert({
        where: { name: normalizedName },
        update: {},
        create: { name: normalizedName },
      });

      // Upsert UserSkill
      const userSkill = await ctx.prisma.userSkill.upsert({
        where: {
          userId_skillId: {
            userId: ctx.userId,
            skillId: skill.id,
          },
        },
        update: {
          proficiency: input.proficiency,
          yearsOfUse: input.yearsOfUse,
          source: "MANUAL",
        },
        create: {
          userId: ctx.userId,
          skillId: skill.id,
          proficiency: input.proficiency,
          yearsOfUse: input.yearsOfUse,
          source: "MANUAL",
        },
        include: { skill: true },
      });

      return userSkill;
    }),

  // 4. Remove skill
  removeSkill: protectedProcedure
    .input(z.object({ skillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userSkill.deleteMany({
        where: {
          userId: ctx.userId,
          skillId: input.skillId,
        },
      });

      return { success: true };
    }),

  // 4b. Add work experience item with company, title, and area/location
  addExperience: protectedProcedure
    .input(
      z.object({
        company: z.string().min(1, "Company is required"),
        title: z.string().min(1, "Job title is required"),
        location: z.string().optional(), // Area / Location
        start: z.string().min(1, "Start period is required"),
        end: z.string().optional(),
        highlights: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx.userId, "profile.addExperience", { maxRequests: 20, windowMs: 60_000 });
      const currentProfile = await ctx.prisma.candidateProfile.findUnique({
        where: { userId: ctx.userId },
      });

      const currentList = Array.isArray(currentProfile?.experienceSummary)
        ? (currentProfile.experienceSummary as any[])
        : [];

      const newItem = {
        company: input.company.trim(),
        title: input.title.trim(),
        location: input.location?.trim() || null,
        start: input.start.trim(),
        end: input.end?.trim() || null,
        highlights: input.highlights,
      };

      const updatedList = [newItem, ...currentList];

      await ctx.prisma.candidateProfile.upsert({
        where: { userId: ctx.userId },
        update: {
          experienceSummary: updatedList,
        },
        create: {
          userId: ctx.userId,
          experienceSummary: updatedList,
          preferredRoles: [],
          preferredLocations: [],
        },
      });

      return { success: true, experienceSummary: updatedList };
    }),

  // 4c. Remove work experience item
  removeExperience: protectedProcedure
    .input(z.object({ index: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const currentProfile = await ctx.prisma.candidateProfile.findUnique({
        where: { userId: ctx.userId },
      });

      if (!currentProfile || !Array.isArray(currentProfile.experienceSummary)) {
        return { success: true };
      }

      const list = [...(currentProfile.experienceSummary as any[])];
      if (input.index >= 0 && input.index < list.length) {
        list.splice(input.index, 1);
        await ctx.prisma.candidateProfile.update({
          where: { userId: ctx.userId },
          data: { experienceSummary: list },
        });
      }

      return { success: true, experienceSummary: list };
    }),

  // 5. Create resume upload URL
  createResumeUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        sizeBytes: z.number().max(10 * 1024 * 1024, "File size must be under 10MB"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx.userId, "profile.createResumeUploadUrl", { maxRequests: 10, windowMs: 60_000 });
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
      ];

      const ext = input.filename.toLowerCase();
      const isAllowedExt = ext.endsWith(".pdf") || ext.endsWith(".docx") || ext.endsWith(".txt");

      if (!isAllowedExt && !allowedTypes.includes(input.contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only PDF, DOCX, or TXT resumes are supported",
        });
      }

      const result = await createPresignedUploadUrl(
        ctx.userId,
        input.filename,
        input.contentType
      );

      return result;
    }),

  // 6. Upload resume (kick off async parsing)
  uploadResume: protectedProcedure
    .input(z.object({ storagePath: z.string() }))
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx.userId, "profile.uploadResume", { maxRequests: 10, windowMs: 60_000 });
      const runId = createRunId();

      // Security: ensure storage path is scoped to session userId (AC 27.1)
      if (!input.storagePath.startsWith(`resumes/${ctx.userId}/`)) {
        logger.warn("profile.uploadResume", "Unauthorized storage path access attempt", {
          runId,
          userId: ctx.userId,
          metadata: { attemptedPath: input.storagePath },
        });
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot access resume storage outside your user partition",
        });
      }

      logger.info("profile.uploadResume", "Starting async resume parsing", {
        runId,
        userId: ctx.userId,
      });

      const parseJobId = crypto.randomUUID();
      const job: ParseJob = {
        id: parseJobId,
        userId: ctx.userId,
        storagePath: input.storagePath,
        status: "pending",
        createdAt: new Date(),
      };
      setParseJob(job);

      // Async parsing execution
      (async () => {
        try {
          const buffer = await getResumeFileBuffer(input.storagePath);
          const rawText = await extractTextFromBuffer(buffer, input.storagePath);
          const extracted = await parseResumeWithGemini(rawText);

          job.extracted = extracted;
          job.status = "ready";
          setParseJob(job);
        } catch (err: any) {
          console.error("Async resume parsing failed:", err);
          job.status = "failed";
          job.error = err.message || "Failed to parse resume";
          setParseJob(job);
        }
      })();

      return { parseJobId };
    }),

  // 7. Preview resume update (polling + diff calculation)
  previewResumeUpdate: protectedProcedure
    .input(z.object({ parseJobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = getParseJob(input.parseJobId);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parse job not found",
        });
      }

      if (job.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to parse job",
        });
      }

      if (job.status === "failed") {
        return {
          status: "failed" as const,
          error: job.error || "Parsing failed",
        };
      }

      if (job.status === "pending" || !job.extracted) {
        return {
          status: "pending" as const,
        };
      }

      // Compute diff against existing profile (AC 6.1, AC 6.2)
      const existingProfile = await ctx.prisma.candidateProfile.findUnique({
        where: { userId: ctx.userId },
      });
      const existingSkills = await ctx.prisma.userSkill.findMany({
        where: { userId: ctx.userId },
        include: { skill: true },
      });

      const existingSkillNames = existingSkills.map((s) => s.skill.name);
      const manualSkillNames = existingSkills
        .filter((s) => s.source === "MANUAL")
        .map((s) => s.skill.name);

      const newSkillNames = job.extracted.skills.map((s) => s.name);
      const skillsToAdd = newSkillNames.filter(
        (name) => !existingSkillNames.some((e) => e.toLowerCase() === name.toLowerCase())
      );

      // Manual skills preserved (AC 6.2): not present in new resume, but kept
      const manualSkillsPreserved = manualSkillNames.filter(
        (name) => !newSkillNames.some((n) => n.toLowerCase() === name.toLowerCase())
      );

      const diff: ProfileDiff = {
        skillsToAdd,
        skillsExisting: existingSkillNames,
        manualSkillsPreserved,
        experienceYearsNew: job.extracted.experienceYears,
        experienceYearsOld: existingProfile?.experienceYears,
        professionalSummaryNew: job.extracted.professionalSummary,
        professionalSummaryOld: existingProfile?.professionalSummary,
        experienceSummaryNew: job.extracted.experienceSummary,
        projectsSummaryNew: job.extracted.projectsSummary,
        educationSummaryNew: job.extracted.educationSummary,
      };

      return {
        status: "ready" as const,
        extracted: job.extracted,
        diff,
      };
    }),

  // 8. Confirm resume update (apply to DB and delete original file)
  confirmResumeUpdate: protectedProcedure
    .input(
      z.object({
        parseJobId: z.string(),
        acceptedFields: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx.userId, "profile.confirmResumeUpdate", { maxRequests: 20, windowMs: 60_000 });
      const runId = createRunId();

      const job = getParseJob(input.parseJobId);
      if (!job || !job.extracted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parse job not ready or not found",
        });
      }

      if (job.userId !== ctx.userId) {
        logger.warn("profile.confirmResumeUpdate", "Cross-tenant parse confirmation blocked", {
          runId,
          userId: ctx.userId,
          metadata: { targetOwner: job.userId },
        });
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const extracted = job.extracted;
      logger.info("profile.confirmResumeUpdate", "Applying resume update to profile", {
        runId,
        userId: ctx.userId,
      });

      // Upsert CandidateProfile
      const profile = await ctx.prisma.candidateProfile.upsert({
        where: { userId: ctx.userId },
        update: {
          experienceYears: extracted.experienceYears ?? undefined,
          professionalSummary: extracted.professionalSummary ?? undefined,
          experienceSummary: extracted.experienceSummary as any,
          projectsSummary: extracted.projectsSummary as any,
          educationSummary: extracted.educationSummary as any,
          resumeUploadedAt: job.createdAt,
          resumeParsedAt: new Date(),
        },
        create: {
          userId: ctx.userId,
          experienceYears: extracted.experienceYears ?? 0,
          professionalSummary: extracted.professionalSummary ?? "",
          experienceSummary: extracted.experienceSummary as any,
          projectsSummary: extracted.projectsSummary as any,
          educationSummary: extracted.educationSummary as any,
          resumeUploadedAt: job.createdAt,
          resumeParsedAt: new Date(),
        },
      });

      // Insert extracted skills with source = RESUME, preserving manual skills (AC 6.2)
      for (const skillItem of extracted.skills) {
        const skillName = skillItem.name.trim();
        if (!skillName) continue;

        const skill = await ctx.prisma.skill.upsert({
          where: { name: skillName },
          update: { category: skillItem.category ?? undefined },
          create: { name: skillName, category: skillItem.category },
        });

        // Upsert userSkill: only overwrite source if it was not already MANUAL
        const existing = await ctx.prisma.userSkill.findUnique({
          where: {
            userId_skillId: {
              userId: ctx.userId,
              skillId: skill.id,
            },
          },
        });

        if (!existing) {
          await ctx.prisma.userSkill.create({
            data: {
              userId: ctx.userId,
              skillId: skill.id,
              source: "RESUME",
            },
          });
        }
      }

      // Permanent file deletion after confirmation (AC 2.3, ADR-005, ADR-013)
      await deleteResumeFile(job.storagePath);

      return profile;
    }),
});
