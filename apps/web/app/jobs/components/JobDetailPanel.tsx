"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { statusColorMap } from "@/lib/utils";
import type { ApplicationStatus } from "@repo/shared-types";
import {
  X,
  ExternalLink,
  MapPin,
  DollarSign,
  Building,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface JobDetailPanelProps {
  jobId: string;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

const ALL_STATUSES: ApplicationStatus[] = [
  "DISCOVERED",
  "SAVED",
  "APPLIED",
  "OA_RECEIVED",
  "OA_CLEARED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_CLEARED",
  "OFFER",
  "REJECTED",
  "GHOSTED",
];

export function JobDetailPanel({
  jobId,
  onClose,
  onStatusUpdated,
}: JobDetailPanelProps) {
  const { data: job, isLoading } = trpc.jobs.getById.useQuery({ jobId });
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | null>(null);
  const [note, setNote] = useState("");

  const updateStatusMutation = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      onStatusUpdated?.();
      setNote("");
    },
  });

  const currentStatus = selectedStatus ?? job?.status ?? "DISCOVERED";
  const statusMeta = statusColorMap[currentStatus];

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    setSelectedStatus(newStatus);
    updateStatusMutation.mutate({
      jobId,
      status: newStatus,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex justify-end z-50">
      <div className="w-full max-w-2xl bg-paper min-h-screen border-l-4 border-ink shadow-neo-lg flex flex-col justify-between overflow-y-auto p-6 md:p-8 animate-in slide-in-from-right duration-200">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-ink pb-4">
            <div className="space-y-1">
              <span
                className={`inline-block px-2.5 py-0.5 border-2 border-ink text-xs font-mono font-bold uppercase shadow-neo-sm ${statusMeta.bg}`}
              >
                {statusMeta.label}
              </span>
              <h2 className="font-display text-2xl uppercase tracking-tight text-ink">
                {isLoading ? "Loading..." : job?.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-ink/80">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {job?.company.name}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {job?.location || (job?.remote ? "Remote" : "Not specified")}
                </span>
                {(job?.salaryMin || job?.salaryMax) && (
                  <span className="flex items-center gap-1 font-mono text-ink">
                    <DollarSign className="w-3.5 h-3.5" />
                    {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : "$0"} -{" "}
                    {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : "DOE"}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 border-2 border-ink bg-paper hover:bg-neutral-100 shadow-neo-sm neo-shadow-press"
            >
              <X className="w-5 h-5 text-ink" />
            </button>
          </div>

          {/* External Apply Button & HITL Notice */}
          <div className="p-4 bg-mint/30 border-2 border-ink shadow-neo-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-ink" />
                <span>Ready to Apply</span>
              </span>
              {job?.applicationUrl && (
                <a
                  href={job.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper border-2 border-ink shadow-neo-sm font-bold text-xs neo-shadow-press"
                >
                  <span>Apply on Company Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-[11px] font-mono text-ink/70">
              Rule 3 & HITL Policy: This platform discovers and ranks opportunities; you apply manually on the employer's official portal. We never auto-apply on your behalf.
            </p>
          </div>

          {/* Status Pipeline Transition Control (AC 16.1) */}
          <div className="neo-card p-5 bg-paper space-y-3">
            <label className="block text-xs font-bold uppercase text-ink">
              Update Application Status
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((status) => {
                const isSelected = currentStatus === status;
                const meta = statusColorMap[status];

                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`px-2.5 py-1 text-xs font-bold border-2 border-ink shadow-neo-sm neo-shadow-press ${
                      isSelected
                        ? "bg-ink text-paper shadow-neo"
                        : `${meta.bg} text-ink hover:opacity-90`
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional transition note (e.g. Completed initial recruiter screen)..."
                className="w-full px-3 py-1.5 border-2 border-ink bg-paper text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Match Analysis or Skills Breakdown */}
          <div className="neo-card p-5 bg-paper space-y-3">
            <h3 className="font-display text-sm uppercase text-ink">
              Tagged Skills ({job?.jobSkills?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {job?.jobSkills && job.jobSkills.length > 0 ? (
                job.jobSkills.map((js) => (
                  <span
                    key={js.id}
                    className="px-2.5 py-1 bg-paper border-2 border-ink shadow-neo-sm text-xs font-mono font-bold"
                  >
                    {js.skill.name}
                  </span>
                ))
              ) : (
                <span className="text-xs font-mono text-ink/60">
                  No explicit skill tags extracted yet.
                </span>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <h3 className="font-display text-sm uppercase text-ink">
              Job Description
            </h3>
            <div className="p-4 bg-neutral-50 border-2 border-ink max-h-72 overflow-y-auto text-xs font-sans leading-relaxed whitespace-pre-line">
              {job?.description}
            </div>
          </div>

          {/* Application Status History Timeline (AC 16.2) */}
          <div className="space-y-3 pt-2">
            <h3 className="font-display text-sm uppercase text-ink flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-ink" />
              <span>Status History (Append-only)</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-ink p-3 bg-paper">
              {job?.statusHistory && job.statusHistory.length > 0 ? (
                job.statusHistory.map((h) => {
                  const meta = statusColorMap[h.status];
                  return (
                    <div
                      key={h.id}
                      className="flex items-start justify-between text-xs font-mono border-b border-ink/20 pb-1.5 last:border-none"
                    >
                      <div>
                        <span
                          className={`px-1.5 py-0.2 border border-ink font-bold text-[10px] mr-2 ${meta.bg}`}
                        >
                          {meta.label}
                        </span>
                        {h.note && (
                          <span className="text-ink/80 italic">{h.note}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-ink/50 whitespace-nowrap">
                        {new Date(h.changedAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs font-mono text-ink/60">
                  No status transitions recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t-2 border-ink flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-ink text-paper border-2 border-ink shadow-neo font-bold text-xs neo-shadow-press"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
