"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { trpc } from "@/lib/trpc/client";
import {
  UserCircle,
  UploadCloud,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Briefcase,
  GraduationCap,
  Sparkles,
  MapPin,
  Calendar,
  Building,
} from "lucide-react";

export default function ProfilePage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.profile.get.useQuery();

  // Preferences form state
  const [preferredRoles, setPreferredRoles] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [minSalary, setMinSalary] = useState<number | "">("");
  const [maxSalary, setMaxSalary] = useState<number | "">("");
  const [remotePreference, setRemotePreference] = useState<
    "REMOTE" | "HYBRID" | "ONSITE" | "NO_PREFERENCE"
  >("NO_PREFERENCE");

  // Manual skill state
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProficiency, setNewSkillProficiency] = useState("Intermediate");

  // Work experience state
  const [showExpModal, setShowExpModal] = useState(false);
  const [expCompany, setExpCompany] = useState("");
  const [expTitle, setExpTitle] = useState("");
  const [expLocation, setExpLocation] = useState("");
  const [expStart, setExpStart] = useState("");
  const [expEnd, setExpEnd] = useState("");
  const [expHighlights, setExpHighlights] = useState("");

  // Upload & parsing state
  const [uploading, setUploading] = useState(false);
  const [parseJobId, setParseJobId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync profile data to form
  useEffect(() => {
    if (data?.profile) {
      setPreferredRoles(data.profile.preferredRoles?.join(", ") || "");
      setPreferredLocations(data.profile.preferredLocations?.join(", ") || "");
      setMinSalary(data.profile.minSalary ?? "");
      setMaxSalary(data.profile.maxSalary ?? "");
      setRemotePreference(data.profile.remotePreference as any);
    }
  }, [data]);

  // Mutations
  const updateProfileMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
    },
  });

  const addSkillMutation = trpc.profile.addSkill.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      setNewSkillName("");
      setShowSkillModal(false);
    },
  });

  const removeSkillMutation = trpc.profile.removeSkill.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
    },
  });

  const addExperienceMutation = trpc.profile.addExperience.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      setShowExpModal(false);
      setExpCompany("");
      setExpTitle("");
      setExpLocation("");
      setExpStart("");
      setExpEnd("");
      setExpHighlights("");
    },
  });

  const removeExperienceMutation = trpc.profile.removeExperience.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
    },
  });

  const createUploadUrlMutation = trpc.profile.createResumeUploadUrl.useMutation();
  const uploadResumeMutation = trpc.profile.uploadResume.useMutation();
  const confirmUpdateMutation = trpc.profile.confirmResumeUpdate.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      setParseJobId(null);
    },
  });

  // Polling query for previewing parsed resume
  const { data: previewData, isFetching: isPreviewFetching } =
    trpc.profile.previewResumeUpdate.useQuery(
      { parseJobId: parseJobId! },
      {
        enabled: Boolean(parseJobId),
        refetchInterval: (query) => {
          const status = query.state.data?.status;
          return status === "ready" || status === "failed" ? false : 1500;
        },
      }
    );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Get presigned upload URL
      const { uploadUrl, storagePath } = await createUploadUrlMutation.mutateAsync({
        filename: file.name,
        contentType: file.type || "application/pdf",
        sizeBytes: file.size,
      });

      // 2. Upload file to URL with automatic server fallback
      let uploadSuccess = false;
      try {
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });
        if (uploadRes.ok) {
          uploadSuccess = true;
        }
      } catch (directErr) {
        console.warn("Direct upload failed (e.g. CORS or network policy), trying server fallback:", directErr);
      }

      if (!uploadSuccess) {
        // Fallback to internal same-origin route
        const fallbackUrl = `/api/upload-resume-direct?path=${encodeURIComponent(storagePath)}`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!fallbackRes.ok) {
          throw new Error("Failed to upload resume file to storage. Please try again.");
        }
      }

      // 3. Kick off async extraction
      const { parseJobId } = await uploadResumeMutation.mutateAsync({
        storagePath,
      });
      setParseJobId(parseJobId);
    } catch (err: any) {
      console.error("Resume upload error:", err);
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSavePreferences = () => {
    updateProfileMutation.mutate({
      preferredRoles: preferredRoles
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
      preferredLocations: preferredLocations
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
      minSalary: typeof minSalary === "number" ? minSalary : null,
      maxSalary: typeof maxSalary === "number" ? maxSalary : null,
      remotePreference,
    });
  };

  const handleConfirmParse = () => {
    if (!parseJobId) return;
    confirmUpdateMutation.mutate({
      parseJobId,
      acceptedFields: [],
    });
  };

  const experiences = (Array.isArray(data?.profile?.experienceSummary)
    ? (data.profile.experienceSummary as Array<{
        company: string;
        title: string;
        location?: string | null;
        start: string;
        end?: string | null;
        highlights?: string[];
      }>)
    : []);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b-4 border-ink pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight text-ink uppercase">
              Candidate Profile
            </h1>
            <p className="mt-2 text-sm text-ink/80 font-medium">
              Manage your verified skills, experience, and search preferences.
            </p>
          </div>
          <button
            onClick={() => setShowSkillModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-ink text-paper border-2 border-ink shadow-neo-sm font-bold text-sm neo-shadow-press"
          >
            <Plus className="w-4 h-4" />
            <span>Add Manual Skill</span>
          </button>
        </div>

        {/* Resume Upload / In-progress Box */}
        <div className="neo-card p-8 bg-paper border-2 border-ink space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-mint border-2 border-ink shadow-neo">
                <UploadCloud className="w-8 h-8 text-ink" />
              </div>
              <div>
                <h2 className="font-display text-xl uppercase text-ink">
                  {data?.profile?.resumeParsedAt ? "Re-upload Resume" : "Upload Resume"}
                </h2>
                <p className="text-xs font-mono text-ink/70">
                  PDF or DOCX (max 10MB). File is parsed by Gemini and permanently deleted immediately.
                </p>
                {data?.profile?.resumeParsedAt && (
                  <p className="text-xs font-mono text-ink/60 mt-1">
                    Last parsed: {new Date(data.profile.resumeParsedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 bg-ink text-paper border-2 border-ink shadow-neo font-bold text-sm neo-shadow-press">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Select File</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading || Boolean(parseJobId)}
                />
              </label>
            </div>
          </div>

          {uploadError && (
            <div className="p-4 bg-blush border-2 border-ink shadow-neo-sm text-xs font-mono flex items-center gap-2 text-ink">
              <AlertCircle className="w-4 h-4" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Parsing status banner */}
          {parseJobId && previewData?.status === "pending" && (
            <div className="p-4 bg-sky border-2 border-ink shadow-neo-sm flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-ink" />
              <div>
                <p className="text-sm font-bold text-ink">
                  Extracting skills and experience with Gemini...
                </p>
                <p className="text-xs font-mono text-ink/80">
                  Applying strict guardrails and formatting structured output.
                </p>
              </div>
            </div>
          )}

          {/* Parse error banner */}
          {parseJobId && previewData?.status === "failed" && (
            <div className="p-4 bg-blush border-2 border-ink shadow-neo-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-ink" />
                <span className="text-sm font-bold text-ink">
                  Resume parsing failed: {previewData.error || "Malformed file"}
                </span>
              </div>
              <button
                onClick={() => setParseJobId(null)}
                className="px-3 py-1 bg-paper border-2 border-ink text-xs font-bold shadow-neo-sm"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* HITL Review / Preview Diff Modal / Panel (AC 2.1, AC 6.1, AC 6.2) */}
        {parseJobId && previewData?.status === "ready" && previewData.extracted && (
          <div className="neo-card p-6 bg-paper border-4 border-ink shadow-neo-lg space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b-2 border-ink pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-mint border-2 border-ink shadow-neo-sm">
                  <Sparkles className="w-5 h-5 text-ink" />
                </span>
                <div>
                  <h2 className="font-display text-xl uppercase text-ink">
                    Review Extracted Profile (HITL Checkpoint)
                  </h2>
                  <p className="text-xs font-mono text-ink/70">
                    Verify AI-extracted information before it overwrites your profile.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setParseJobId(null)}
                  className="px-4 py-2 bg-paper border-2 border-ink font-bold text-xs shadow-neo-sm neo-shadow-press"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmParse}
                  disabled={confirmUpdateMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-mint border-2 border-ink font-bold text-xs shadow-neo neo-shadow-press"
                >
                  {confirmUpdateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Confirm & Save Profile</span>
                </button>
              </div>
            </div>

            {/* Diff highlights */}
            {previewData.diff && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-mint/40 border-2 border-ink shadow-neo-sm space-y-2">
                  <h3 className="font-bold text-xs uppercase text-ink">
                    New Skills to Add ({previewData.diff.skillsToAdd.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {previewData.diff.skillsToAdd.length > 0 ? (
                      previewData.diff.skillsToAdd.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-paper border border-ink text-xs font-mono font-bold"
                        >
                          +{s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-mono text-ink/60">
                        No new skills detected
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-sky/40 border-2 border-ink shadow-neo-sm space-y-2">
                  <h3 className="font-bold text-xs uppercase text-ink">
                    Manual Skills Preserved (AC 6.2)
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {previewData.diff.manualSkillsPreserved.length > 0 ? (
                      previewData.diff.manualSkillsPreserved.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-paper border border-ink text-xs font-mono font-bold"
                        >
                          {s} (Preserved)
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-mono text-ink/60">
                        All manual skills accounted for
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Professional Summary */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase text-ink">
                Professional Summary
              </h3>
              <p className="p-3 bg-neutral-50 border-2 border-ink text-sm font-sans">
                {previewData.extracted.professionalSummary || "No summary extracted."}
              </p>
            </div>

            {/* Experience & Projects breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase text-ink flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  <span>Work Experience</span>
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {previewData.extracted.experienceSummary.map((exp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-paper border-2 border-ink shadow-neo-sm text-xs"
                    >
                      <div className="font-bold text-ink">{exp.title}</div>
                      <div className="text-ink/70 font-mono">
                        {exp.company} ({exp.start} - {exp.end || "Present"})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase text-ink flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  <span>Education</span>
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {previewData.extracted.educationSummary.map((edu, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-paper border-2 border-ink shadow-neo-sm text-xs"
                    >
                      <div className="font-bold text-ink">
                        {edu.degree} in {edu.field}
                      </div>
                      <div className="text-ink/70 font-mono">
                        {edu.school} {edu.year ? `(${edu.year})` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preferences & Skills Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preferences Column */}
          <div className="lg:col-span-1 neo-card p-6 bg-paper space-y-6">
            <div className="flex items-center gap-2 border-b-2 border-ink pb-3">
              <UserCircle className="w-5 h-5 text-ink" />
              <h2 className="font-display text-lg uppercase text-ink">
                Search Preferences
              </h2>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-ink mb-1 uppercase">
                  Target Roles (comma-separated)
                </label>
                <input
                  type="text"
                  value={preferredRoles}
                  onChange={(e) => setPreferredRoles(e.target.value)}
                  placeholder="e.g. Full Stack Engineer, Backend Lead"
                  className="w-full px-3 py-2 border-2 border-ink bg-paper text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1 uppercase">
                  Preferred Locations
                </label>
                <input
                  type="text"
                  value={preferredLocations}
                  onChange={(e) => setPreferredLocations(e.target.value)}
                  placeholder="e.g. Remote, San Francisco, Bangalore"
                  className="w-full px-3 py-2 border-2 border-ink bg-paper text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1 uppercase">
                    Min Salary ($)
                  </label>
                  <input
                    type="number"
                    value={minSalary}
                    onChange={(e) =>
                      setMinSalary(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="120000"
                    className="w-full px-3 py-2 border-2 border-ink bg-paper text-xs font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1 uppercase">
                    Max Salary ($)
                  </label>
                  <input
                    type="number"
                    value={maxSalary}
                    onChange={(e) =>
                      setMaxSalary(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="180000"
                    className="w-full px-3 py-2 border-2 border-ink bg-paper text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1 uppercase">
                  Remote Preference
                </label>
                <select
                  value={remotePreference}
                  onChange={(e) => setRemotePreference(e.target.value as any)}
                  className="w-full px-3 py-2 border-2 border-ink bg-paper text-xs font-mono focus:outline-none"
                >
                  <option value="REMOTE">Remote Only</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ONSITE">On-site</option>
                  <option value="NO_PREFERENCE">No Preference</option>
                </select>
              </div>

              <button
                onClick={handleSavePreferences}
                disabled={updateProfileMutation.isPending}
                className="w-full py-2.5 bg-ink text-paper border-2 border-ink shadow-neo font-bold text-xs uppercase neo-shadow-press"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>

          {/* Verified Skills Column */}
          <div className="lg:col-span-2 neo-card p-6 bg-paper space-y-6">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <div>
                <h2 className="font-display text-lg uppercase text-ink">
                  Verified Skills ({data?.skills?.length || 0})
                </h2>
                <p className="text-xs font-mono text-ink/70">
                  Used directly by matching algorithms. Add missing skills to improve accuracy.
                </p>
              </div>
              <button
                onClick={() => setShowSkillModal(true)}
                className="px-3 py-1.5 bg-paper border-2 border-ink text-xs font-bold shadow-neo-sm neo-shadow-press"
              >
                + Add Skill
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs font-mono text-ink/70">
                Loading profile skills...
              </div>
            ) : data?.skills && data.skills.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.skills.map((userSkill) => (
                  <div
                    key={userSkill.id}
                    className="p-2.5 bg-paper border-2 border-ink shadow-neo-sm flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-ink truncate">
                        {userSkill.skill.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[9px] px-1 py-0.2 border border-ink font-mono uppercase font-bold ${
                            userSkill.source === "MANUAL" ? "bg-sky" : "bg-mint"
                          }`}
                        >
                          {userSkill.source}
                        </span>
                        {userSkill.proficiency && (
                          <span className="text-[10px] font-mono text-ink/60">
                            {userSkill.proficiency}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        removeSkillMutation.mutate({ skillId: userSkill.skillId })
                      }
                      className="p-1 text-ink/40 hover:text-ink transition-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-ink/40 text-center space-y-2">
                <p className="font-display text-sm uppercase text-ink">
                  No Skills Extracted Yet
                </p>
                <p className="text-xs font-mono text-ink/60">
                  Upload a resume above or click "+ Add Skill" to manually populate your profile.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Work Experience & Areas Section */}
        <div className="neo-card p-6 bg-paper space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-ink pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-ink" />
                <h2 className="font-display text-xl uppercase text-ink">
                  Work Experience & Areas ({experiences.length})
                </h2>
              </div>
              <p className="text-xs font-mono text-ink/70 mt-1">
                Add your roles, companies, and geographical area to tailor search discovery and matching.
              </p>
            </div>
            <button
              onClick={() => setShowExpModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ink text-paper border-2 border-ink shadow-neo-sm font-bold text-xs neo-shadow-press self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Experience</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs font-mono text-ink/70">
              Loading work experience...
            </div>
          ) : experiences.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {experiences.map((exp, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-paper border-2 border-ink shadow-neo-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-ink">{exp.title}</h3>
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-ink/80 mt-0.5">
                          <Building className="w-3.5 h-3.5 text-ink/60" />
                          <span>{exp.company}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeExperienceMutation.mutate({ index: idx })}
                        disabled={removeExperienceMutation.isPending}
                        className="p-1.5 text-ink/40 hover:text-ink hover:bg-blush/20 border border-transparent hover:border-ink transition-none"
                        title="Remove experience"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      {exp.location && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-mint/40 border border-ink font-bold text-[11px]">
                          <MapPin className="w-3 h-3 text-ink" />
                          <span>{exp.location}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-paper border border-ink text-ink/70 text-[11px]">
                        <Calendar className="w-3 h-3 text-ink/50" />
                        <span>
                          {exp.start} — {exp.end || "Present"}
                        </span>
                      </span>
                    </div>

                    {exp.highlights && exp.highlights.length > 0 && (
                      <ul className="list-disc list-inside text-xs font-sans text-ink/80 space-y-1 pt-1 border-t border-ink/20">
                        {exp.highlights.map((hl, hIdx) => (
                          <li key={hIdx} className="leading-relaxed">
                            {hl}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-ink/40 text-center space-y-2">
              <p className="font-display text-sm uppercase text-ink">
                No Work Experience Added Yet
              </p>
              <p className="text-xs font-mono text-ink/60">
                Click "+ Add Experience" or upload your resume to automatically populate past roles and locations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Add Skill Modal (HITL #4) */}
      {showSkillModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="neo-card p-6 bg-paper max-w-sm w-full space-y-4 border-4 border-ink shadow-neo-lg">
            <h3 className="font-display text-lg uppercase text-ink">
              Add Manual Skill
            </h3>
            <p className="text-xs font-mono text-ink/70">
              Manually added skills represent ground truth and are never overwritten automatically.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Docker, Kafka, Go"
                  className="w-full px-3 py-2 border-2 border-ink text-sm font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Proficiency
                </label>
                <select
                  value={newSkillProficiency}
                  onChange={(e) => setNewSkillProficiency(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-ink text-sm font-mono focus:outline-none"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-ink">
              <button
                onClick={() => setShowSkillModal(false)}
                className="px-4 py-2 border-2 border-ink text-xs font-bold shadow-neo-sm neo-shadow-press"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newSkillName.trim()) {
                    addSkillMutation.mutate({
                      name: newSkillName.trim(),
                      proficiency: newSkillProficiency,
                    });
                  }
                }}
                disabled={!newSkillName.trim() || addSkillMutation.isPending}
                className="px-5 py-2 bg-ink text-paper border-2 border-ink text-xs font-bold shadow-neo neo-shadow-press"
              >
                {addSkillMutation.isPending ? "Adding..." : "Add Skill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Experience Modal */}
      {showExpModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="neo-card p-6 bg-paper max-w-md w-full space-y-4 border-4 border-ink shadow-neo-lg">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <h3 className="font-display text-lg uppercase text-ink">
                Add Work Experience & Area
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expCompany}
                  onChange={(e) => setExpCompany(e.target.value)}
                  placeholder="e.g. Acme Corp or Stripe"
                  className="w-full px-3 py-2 border-2 border-ink text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3 py-2 border-2 border-ink text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Area / Location (City, State, or Country)
                </label>
                <input
                  type="text"
                  value={expLocation}
                  onChange={(e) => setExpLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA or Remote"
                  className="w-full px-3 py-2 border-2 border-ink text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    Start Period <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={expStart}
                    onChange={(e) => setExpStart(e.target.value)}
                    placeholder="e.g. 2021 or Jan 2021"
                    className="w-full px-3 py-2 border-2 border-ink text-xs font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    End Period (or Present)
                  </label>
                  <input
                    type="text"
                    value={expEnd}
                    onChange={(e) => setExpEnd(e.target.value)}
                    placeholder="e.g. Present or 2024"
                    className="w-full px-3 py-2 border-2 border-ink text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Key Highlights / Responsibilities (comma or newline separated)
                </label>
                <textarea
                  rows={3}
                  value={expHighlights}
                  onChange={(e) => setExpHighlights(e.target.value)}
                  placeholder="e.g. Built real-time matching engine&#10;Scaled backend services to 10M daily requests"
                  className="w-full px-3 py-2 border-2 border-ink text-xs font-sans focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-ink">
              <button
                onClick={() => setShowExpModal(false)}
                className="px-4 py-2 border-2 border-ink text-xs font-bold shadow-neo-sm neo-shadow-press"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (expCompany.trim() && expTitle.trim() && expStart.trim()) {
                    const parsedHighlights = expHighlights
                      .split(/[\n,]/)
                      .map((h) => h.trim())
                      .filter(Boolean);

                    addExperienceMutation.mutate({
                      company: expCompany.trim(),
                      title: expTitle.trim(),
                      location: expLocation.trim() || undefined,
                      start: expStart.trim(),
                      end: expEnd.trim() || undefined,
                      highlights: parsedHighlights.length > 0 ? parsedHighlights : undefined,
                    });
                  }
                }}
                disabled={
                  !expCompany.trim() ||
                  !expTitle.trim() ||
                  !expStart.trim() ||
                  addExperienceMutation.isPending
                }
                className="px-5 py-2 bg-ink text-paper border-2 border-ink text-xs font-bold shadow-neo neo-shadow-press disabled:opacity-50"
              >
                {addExperienceMutation.isPending ? "Saving..." : "Add Experience"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
