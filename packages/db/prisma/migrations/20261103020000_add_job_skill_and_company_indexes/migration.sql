-- Accelerate foreign key joins and skill matching filters
CREATE INDEX "job_skills_skillId_idx" ON "job_skills"("skillId");
CREATE INDEX "jobs_companyId_idx" ON "jobs"("companyId");
