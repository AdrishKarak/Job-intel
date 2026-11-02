"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  Sparkles,
  MapPin,
  DollarSign,
  Globe,
  Sliders,
  Check,
  GraduationCap,
  Save,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { EngineeringPositionSelector } from "@/components/profile/EngineeringPositionSelector";
import { ExperienceRangeDoubleSlider } from "@/components/profile/ExperienceRangeDoubleSlider";
import {
  CustomProfileIcon,
  CustomSparkleIcon,
  CustomIndiaIcon,
  CustomGlobeIcon,
} from "@/components/icons/CustomIcons";

export default function ProfilePage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.profile.get.useQuery();

  // Preferred search roles & experience window
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [minExpYears, setMinExpYears] = useState<number>(0);
  const [maxExpYears, setMaxExpYears] = useState<number>(5);
  const [globalSaveStatus, setGlobalSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [expSaveStatus, setExpSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [prefSaveStatus, setPrefSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Other search preferences
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

  // Upload & parsing state
  const [uploading, setUploading] = useState(false);
  const [parseJobId, setParseJobId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Instant discovery trigger state
  const [syncStatus, setSyncStatus] = useState<"idle" | "running" | "done">("idle");
  const [syncResultCount, setSyncResultCount] = useState<number | null>(null);

  // Sync profile data to form
  useEffect(() => {
    if (data?.profile) {
      if (Array.isArray(data.profile.preferredRoles)) {
        setPreferredRoles(data.profile.preferredRoles);
      }
      setPreferredLocations(data.profile.preferredLocations?.join(", ") || "");
      setMinSalary(data.profile.minSalary ?? "");
      setMaxSalary(data.profile.maxSalary ?? "");
      setRemotePreference(data.profile.remotePreference as any);

      const pMin =
        typeof (data.profile as any).minExperienceYears === "number"
          ? Math.max(0, Math.min(30, (data.profile as any).minExperienceYears))
          : 0;
      const pMax =
        typeof (data.profile as any).maxExperienceYears === "number"
          ? Math.max(pMin, Math.min(30, (data.profile as any).maxExperienceYears))
          : typeof data.profile.experienceYears === "number"
          ? Math.max(pMin, Math.min(30, Math.round(data.profile.experienceYears)))
          : 5;

      setMinExpYears(pMin);
      setMaxExpYears(pMax);
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

  const createUploadUrlMutation = trpc.profile.createResumeUploadUrl.useMutation();
  const uploadResumeMutation = trpc.profile.uploadResume.useMutation();
  const confirmUpdateMutation = trpc.profile.confirmResumeUpdate.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      setParseJobId(null);
    },
  });

  const syncDiscoveryMutation = trpc.jobs.syncDiscovery.useMutation({
    onSuccess: (res) => {
      setSyncStatus("done");
      setSyncResultCount(res.newJobsCount);
      utils.jobs.list.invalidate();
      utils.dashboard.getSummary.invalidate();
      setTimeout(() => setSyncStatus("idle"), 5000);
    },
    onError: (err: any) => {
      console.error("Discovery sync error:", err);
      setSyncStatus("idle");
    },
  });

  const handleLaunchDiscovery = () => {
    setSyncStatus("running");
    syncDiscoveryMutation.mutate({});
  };

  // Polling query for previewing parsed resume
  const { data: previewData } = trpc.profile.previewResumeUpdate.useQuery(
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
      // 1. Presigned upload URL
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
        console.warn("Direct upload failed, trying server fallback:", directErr);
      }

      if (!uploadSuccess) {
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

  const handleSaveWholeProfile = () => {
    setGlobalSaveStatus("saving");
    setExpSaveStatus("saving");
    setPrefSaveStatus("saving");
    updateProfileMutation.mutate(
      {
        preferredRoles,
        preferredLocations: preferredLocations
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        minSalary: typeof minSalary === "number" ? minSalary : null,
        maxSalary: typeof maxSalary === "number" ? maxSalary : null,
        remotePreference,
        minExperienceYears: minExpYears,
        maxExperienceYears: maxExpYears,
        experienceYears: maxExpYears,
      },
      {
        onSuccess: () => {
          setGlobalSaveStatus("saved");
          setExpSaveStatus("saved");
          setPrefSaveStatus("saved");
          setTimeout(() => {
            setGlobalSaveStatus("idle");
            setExpSaveStatus("idle");
            setPrefSaveStatus("idle");
          }, 2500);
        },
        onError: () => {
          setGlobalSaveStatus("idle");
          setExpSaveStatus("idle");
          setPrefSaveStatus("idle");
        },
      }
    );
  };

  const handleSavePreferences = () => {
    handleSaveWholeProfile();
  };

  const handleSaveExperienceRange = (min: number, max: number) => {
    setExpSaveStatus("saving");
    setGlobalSaveStatus("saving");
    updateProfileMutation.mutate(
      {
        minExperienceYears: min,
        maxExperienceYears: max,
        experienceYears: max,
        preferredRoles,
        preferredLocations: preferredLocations
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        minSalary: typeof minSalary === "number" ? minSalary : null,
        maxSalary: typeof maxSalary === "number" ? maxSalary : null,
        remotePreference,
      },
      {
        onSuccess: () => {
          setExpSaveStatus("saved");
          setGlobalSaveStatus("saved");
          setTimeout(() => {
            setExpSaveStatus("idle");
            setGlobalSaveStatus("idle");
          }, 2200);
        },
        onError: () => {
          setExpSaveStatus("idle");
          setGlobalSaveStatus("idle");
        },
      }
    );
  };

  const handleConfirmParse = () => {
    if (!parseJobId) return;
    confirmUpdateMutation.mutate({
      parseJobId,
      acceptedFields: [],
    });
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b-4 border-ink pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-mint border-2 border-ink shadow-neo-sm font-black">
                <CustomProfileIcon size={20} className="text-ink" />
              </span>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink uppercase">
                Candidate Profile
              </h1>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-ink/80 font-medium max-w-2xl">
              Configure target positions, preferred experience range, and search parameters to guide the autonomous job search agent.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap self-start md:self-auto">
            <button
              type="button"
              onClick={() => setShowSkillModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-paper text-ink border-2 border-ink shadow-neo-sm font-bold text-sm neo-shadow-press"
            >
              <Plus className="w-4 h-4" />
              <span>Add Skill</span>
            </button>
            <button
              type="button"
              onClick={handleSaveWholeProfile}
              disabled={updateProfileMutation.isPending || globalSaveStatus === "saving"}
              className="flex items-center gap-2 px-6 py-2.5 bg-mint text-ink border-2 border-ink shadow-neo font-display font-black text-sm uppercase tracking-wide neo-shadow-press"
            >
              {globalSaveStatus === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-ink" />
                  <span>Saving...</span>
                </>
              ) : globalSaveStatus === "saved" ? (
                <>
                  <Check className="w-4 h-4 text-ink" />
                  <span>Profile Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-ink" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Resume Skill Extraction Box */}
        <div className="neo-card p-6 md:p-8 bg-paper border-2 border-ink space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-mint border-2 border-ink shadow-neo">
                <UploadCloud className="w-8 h-8 text-ink" />
              </div>
              <div>
                <h2 className="font-display text-xl uppercase text-ink">
                  {data?.profile?.resumeParsedAt ? "Update Resume for Skill Extraction" : "Upload Resume for Skill Extraction"}
                </h2>
                <p className="text-xs font-mono text-ink/70">
                  PDF or DOCX (max 10MB). Used solely by Gemini to extract verified tech skills for job matching. Permanently deleted immediately after parsing.
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
                    <span>Select Resume</span>
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
                  Extracting verified skills with Gemini...
                </p>
                <p className="text-xs font-mono text-ink/80">
                  Parsing technical skills and domain categories.
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

        {/* HITL Review / Preview Diff Modal */}
        {parseJobId && previewData?.status === "ready" && previewData.extracted && (
          <div className="neo-card p-6 bg-paper border-4 border-ink shadow-neo-lg space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b-2 border-ink pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-mint border-2 border-ink shadow-neo-sm">
                  <Sparkles className="w-5 h-5 text-ink" />
                </span>
                <div>
                  <h2 className="font-display text-xl uppercase text-ink">
                    Review Extracted Skills (HITL Checkpoint)
                  </h2>
                  <p className="text-xs font-mono text-ink/70">
                    Verify AI-extracted technical skills before updating your profile.
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
                  <span>Confirm & Save Skills</span>
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
                    Manual Skills Preserved
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
            {previewData.extracted.professionalSummary && (
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase text-ink">
                  Professional Summary
                </h3>
                <p className="p-3 bg-neutral-50 border-2 border-ink text-sm font-sans">
                  {previewData.extracted.professionalSummary}
                </p>
              </div>
            )}

            {/* Education Summary */}
            {previewData.extracted.educationSummary && previewData.extracted.educationSummary.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase text-ink flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  <span>Education</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            )}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 1: TARGET ENGINEERING POSITIONS (100+ DROPDOWN)     */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="neo-card p-6 md:p-8 bg-paper border-2 border-ink space-y-4">
          <div className="border-b-2 border-ink pb-4">
            <div className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-ink" />
              <h2 className="font-display text-xl uppercase text-ink">
                Target Job Positions (140+ Engineering Suggestions)
              </h2>
            </div>
            <p className="text-xs font-mono text-ink/70 mt-1">
              Select or search positions like Graduate Engineer Trainee, Associate Engineer, Software Engineer, and 140+ specialized engineering roles. Add as many positions as you want the agent to search for.
            </p>
          </div>

          <EngineeringPositionSelector
            selectedRoles={preferredRoles}
            onChange={(newRoles) => setPreferredRoles(newRoles)}
          />
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 2: PREFERRED EXPERIENCE RANGE (DOUBLE SLIDER)        */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div id="experience-range-section">
          <ExperienceRangeDoubleSlider
            minYears={minExpYears}
            maxYears={maxExpYears}
            onChange={(min, max) => {
              setMinExpYears(min);
              setMaxExpYears(max);
            }}
            onSave={(min, max) => handleSaveExperienceRange(min, max)}
            isSaving={updateProfileMutation.isPending}
            saveStatus={expSaveStatus}
          />
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 3: LOCATION & SALARY PREFERENCES + VERIFIED SKILLS   */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Location & Compensation Filters */}
          <div className="lg:col-span-1 neo-card p-6 bg-paper space-y-6">
            <div className="flex items-center gap-2 border-b-2 border-ink pb-3">
              <Globe className="w-5 h-5 text-ink" />
              <h2 className="font-display text-lg uppercase text-ink">
                Location & Compensation
              </h2>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-ink mb-1 uppercase">
                  Preferred Locations (comma-separated)
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
                    Min Expected Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={minSalary}
                    onChange={(e) =>
                      setMinSalary(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="e.g. 1200000 (12 LPA)"
                    className="w-full px-3 py-2 border-2 border-ink bg-paper text-xs font-mono focus:outline-none"
                  />
                  {typeof minSalary === "number" && minSalary > 0 && (
                    <span className="text-[10px] text-ink/70 font-mono mt-1 block">
                      {minSalary >= 100000
                        ? `≈ ${(minSalary / 100000).toFixed(1)} LPA (₹${minSalary.toLocaleString("en-IN")})`
                        : `₹${minSalary.toLocaleString("en-IN")}`}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1 uppercase">
                    Max Expected Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={maxSalary}
                    onChange={(e) =>
                      setMaxSalary(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="e.g. 2500000 (25 LPA)"
                    className="w-full px-3 py-2 border-2 border-ink bg-paper text-xs font-mono focus:outline-none"
                  />
                  {typeof maxSalary === "number" && maxSalary > 0 && (
                    <span className="text-[10px] text-ink/70 font-mono mt-1 block">
                      {maxSalary >= 100000
                        ? `≈ ${(maxSalary / 100000).toFixed(1)} LPA (₹${maxSalary.toLocaleString("en-IN")})`
                        : `₹${maxSalary.toLocaleString("en-IN")}`}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1 uppercase">
                  Remote Preference
                </label>
                <select
                  value={remotePreference}
                  onChange={(e) => setRemotePreference(e.target.value as any)}
                  className="w-full px-3 py-2 border-2 border-ink bg-paper text-xs font-mono focus:outline-none cursor-pointer"
                >
                  <option value="REMOTE">Remote Only</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ONSITE">On-site</option>
                  <option value="NO_PREFERENCE">No Preference</option>
                </select>
              </div>

              {/* Experience Window Summary Pill */}
              <div className="p-3 bg-neutral-50 border-2 border-ink space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-ink/60">
                    Active Experience Window:
                  </span>
                  <a
                    href="#experience-range-section"
                    className="text-[10px] font-mono font-bold text-ink underline hover:text-mint"
                  >
                    Adjust Slider ↑
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-mint border border-ink text-xs font-mono font-bold">
                    {minExpYears} – {maxExpYears >= 30 ? "30+" : maxExpYears} Years
                  </span>
                  <span className="text-[11px] font-mono text-ink/70">
                    ({preferredRoles.length} target roles selected)
                  </span>
                </div>
              </div>

              <button
                onClick={handleSavePreferences}
                disabled={updateProfileMutation.isPending || prefSaveStatus === "saving"}
                className="w-full py-2.5 bg-ink text-paper border-2 border-ink shadow-neo font-bold text-xs uppercase neo-shadow-press flex items-center justify-center gap-2"
              >
                {prefSaveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-mint" />
                    <span>Saving All Preferences...</span>
                  </>
                ) : prefSaveStatus === "saved" ? (
                  <>
                    <Check className="w-4 h-4 text-mint" />
                    <span>Preferences Saved!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-mint" />
                    <span>Save All Preferences</span>
                  </>
                )}
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
                  Used directly by matching algorithms. Add missing skills to improve match accuracy.
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
                  Upload a resume above or click "+ Add Skill" to manually populate your skill profile.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 4: MASTER SAVE & SEARCH DISCOVERY CARD               */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="neo-card p-6 md:p-8 bg-paper border-4 border-ink shadow-neo-lg space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b-2 border-ink pb-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                <span className="p-2 bg-mint border-2 border-ink shadow-neo-xs">
                  <Save className="w-5 h-5 text-ink" />
                </span>
                <h2 className="font-display text-xl uppercase text-ink">
                  Save Entire Profile & Hunting Parameters
                </h2>
              </div>
              <p className="text-xs font-mono text-ink/70 max-w-xl">
                Saves all configured target roles ({preferredRoles.length} selected), preferred experience range ({minExpYears}–{maxExpYears >= 30 ? "30+" : maxExpYears} years), location preferences, and compensation settings.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveWholeProfile}
              disabled={updateProfileMutation.isPending || globalSaveStatus === "saving"}
              className="w-full sm:w-auto px-8 py-3.5 bg-ink text-paper border-2 border-ink shadow-neo font-display font-black text-sm uppercase tracking-wider neo-shadow-press flex items-center justify-center gap-2.5 shrink-0"
            >
              {globalSaveStatus === "saving" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-mint" />
                  <span>Saving Whole Profile...</span>
                </>
              ) : globalSaveStatus === "saved" ? (
                <>
                  <Check className="w-5 h-5 text-mint" />
                  <span>Whole Profile Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 text-mint" />
                  <span>Save Whole Profile</span>
                </>
              )}
            </button>
          </div>

          {/* Next Steps: Autonomous vs Instant Job Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-neutral-50 border-2 border-ink">
            <div className="space-y-1 text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-mint border border-ink text-[10px] font-mono font-bold uppercase">
                Autonomous Agent Active
              </span>
              <p className="text-xs font-mono text-ink font-bold">
                When does the agent search?
              </p>
              <p className="text-xs font-sans text-ink/70">
                • <strong>Automatic:</strong> Searches all 141 company ATS boards automatically every <strong>6 hours</strong>.
                <br />
                • <strong>Instant:</strong> You can trigger an immediate search right now to fetch matching openings immediately.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end shrink-0">
              <button
                type="button"
                onClick={handleLaunchDiscovery}
                disabled={syncDiscoveryMutation.isPending || syncStatus === "running"}
                className="px-5 py-2.5 bg-mint text-ink border-2 border-ink shadow-neo-sm font-display font-black text-xs uppercase neo-shadow-press flex items-center gap-2"
              >
                {syncStatus === "running" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-ink" />
                    <span>Searching 141 Companies...</span>
                  </>
                ) : syncStatus === "done" ? (
                  <>
                    <Check className="w-4 h-4 text-ink" />
                    <span>Discovered {syncResultCount ?? 0} Matching Jobs!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-ink" />
                    <span>Search Jobs Now (Instant)</span>
                  </>
                )}
              </button>

              <Link
                href="/jobs"
                className="px-4 py-2.5 bg-paper text-ink border-2 border-ink shadow-neo-sm font-bold text-xs uppercase neo-shadow-press flex items-center gap-1.5 hover:bg-neutral-100"
              >
                <span>View Jobs CRM</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Toast Notification */}
      {globalSaveStatus === "saved" && (
        <div className="fixed bottom-6 right-6 z-50 bg-mint border-3 border-ink shadow-neo-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-lg animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-ink text-paper flex items-center justify-center font-black shrink-0">
              <Check className="w-4 h-4 text-mint" />
            </div>
            <div>
              <p className="font-display text-xs uppercase text-ink font-black">
                Profile Saved Successfully!
              </p>
              <p className="text-[11px] font-mono text-ink/80">
                Agent hunts every 6 hours, or click Search Now for instant discovery.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={handleLaunchDiscovery}
              disabled={syncStatus === "running"}
              className="px-3 py-1.5 bg-ink text-paper border border-ink text-xs font-bold shadow-neo-xs flex items-center gap-1.5 neo-shadow-press"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "running" ? "animate-spin text-mint" : ""}`} />
              <span>{syncStatus === "running" ? "Searching..." : "Search Now"}</span>
            </button>
            <Link
              href="/jobs"
              className="px-3 py-1.5 bg-paper text-ink border border-ink text-xs font-bold shadow-neo-xs flex items-center gap-1 hover:bg-neutral-100"
            >
              <span>Jobs CRM</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Manual Add Skill Modal */}
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
                  placeholder="e.g. Docker, Kafka, Go, Rust"
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
    </AppShell>
  );
}
