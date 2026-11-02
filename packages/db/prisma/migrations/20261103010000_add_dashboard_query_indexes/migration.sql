-- Dashboard and jobs list queries are scoped to a user and then sorted or
-- filtered. These composite indexes prevent full per-user scans as job volume
-- grows, while preserving the existing data model and API behavior.
DROP INDEX "jobs_userId_status_idx";

CREATE INDEX "jobs_userId_status_discoveredAt_idx"
  ON "jobs"("userId", "status", "discoveredAt");

CREATE INDEX "jobs_userId_discoveredAt_idx"
  ON "jobs"("userId", "discoveredAt");

CREATE INDEX "jobs_userId_matchScore_discoveredAt_idx"
  ON "jobs"("userId", "matchScore", "discoveredAt");

CREATE INDEX "jobs_userId_salaryMax_idx"
  ON "jobs"("userId", "salaryMax");

CREATE INDEX "application_status_history_userId_changedAt_idx"
  ON "application_status_history"("userId", "changedAt");

CREATE INDEX "skill_gap_recommendations_userId_frequency_idx"
  ON "skill_gap_recommendations"("userId", "frequency");
