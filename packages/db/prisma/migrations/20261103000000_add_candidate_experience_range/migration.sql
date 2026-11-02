-- Keep the deployed database aligned with the candidate profile fields used by
-- dashboard and job-filter queries.  Defaults preserve existing profiles.
ALTER TABLE "candidate_profiles"
  ADD COLUMN "minExperienceYears" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN "maxExperienceYears" DOUBLE PRECISION DEFAULT 5;
