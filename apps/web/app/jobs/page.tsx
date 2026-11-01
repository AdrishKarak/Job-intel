"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { trpc } from "@/lib/trpc/client";
import { statusColorMap } from "@/lib/utils";
import { JobDetailPanel } from "./components/JobDetailPanel";
import type { ApplicationStatus } from "@repo/shared-types";
import {
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ChevronRight,
  MapPin,
  Building,
  Download,
} from "lucide-react";

export default function JobsPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [onlyMatching, setOnlyMatching] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const filters = {
    role: search.trim() || undefined,
    status: selectedStatus === "ALL" ? undefined : (selectedStatus as ApplicationStatus),
    remote: remoteOnly ? true : undefined,
    onlyMatching: onlyMatching,
  };

  const { data, isLoading, refetch } = trpc.jobs.list.useQuery({
    filters,
    limit: 50,
  });

  const syncMutation = trpc.jobs.syncDiscovery.useMutation({
    onSuccess: () => {
      utils.jobs.list.invalidate();
    },
  });

  const scoreAllMutation = trpc.jobs.scoreAll.useMutation({
    onSuccess: (res) => {
      utils.jobs.list.invalidate();
      alert(`Scored ${res.scoredCount} jobs against your profile.`);
    },
  });

  const cleanupMutation = trpc.jobs.cleanupExpired.useMutation({
    onSuccess: (res) => {
      utils.jobs.list.invalidate();
      alert(`Cleaned up ${res.deletedCount} expired jobs (>40 days).`);
    },
  });

  const exportExcelMutation = trpc.reports.exportExcel.useMutation({
    onSuccess: (res) => {
      const byteCharacters = atob(res.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: res.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b-4 border-ink pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight text-ink uppercase">
              Jobs CRM
            </h1>
            <p className="mt-2 text-sm text-ink/80 font-medium">
              Browse discovered positions, evaluate fit, and update application milestones.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => exportExcelMutation.mutate()}
              disabled={exportExcelMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-paper border-2 border-ink shadow-neo-sm font-bold text-xs neo-shadow-press"
            >
              <Download className={`w-3.5 h-3.5 ${exportExcelMutation.isPending ? "animate-bounce" : ""}`} />
              <span>{exportExcelMutation.isPending ? "Exporting..." : "Export Excel"}</span>
            </button>
            <button
              onClick={() => scoreAllMutation.mutate({})}
              disabled={scoreAllMutation.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-mint border-2 border-ink shadow-neo-sm font-bold text-xs neo-shadow-press"
            >
              <Sparkles className={`w-3.5 h-3.5 ${scoreAllMutation.isPending ? "animate-spin" : ""}`} />
              <span>{scoreAllMutation.isPending ? "Scoring..." : "Score All Jobs"}</span>
            </button>
            <button
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
              className="px-3.5 py-2 bg-paper border-2 border-ink shadow-neo-sm font-bold text-xs neo-shadow-press"
            >
              Cleanup Stale Jobs (40d)
            </button>
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-ink text-paper border-2 border-ink shadow-neo font-bold text-xs neo-shadow-press"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              <span>{syncMutation.isPending ? "Polling ATS..." : "Sync Discovery"}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="neo-card p-4 bg-paper flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-ink/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role or company..."
              className="w-full pl-9 pr-4 py-2 border-2 border-ink bg-paper text-xs font-mono focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink/70" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border-2 border-ink bg-paper text-xs font-bold uppercase focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="DISCOVERED">Discovered</option>
              <option value="SAVED">Saved</option>
              <option value="APPLIED">Applied</option>
              <option value="OA_RECEIVED">OA Received</option>
              <option value="OA_CLEARED">OA Cleared</option>
              <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
              <option value="INTERVIEW_CLEARED">Interview Cleared</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTED">Rejected</option>
              <option value="GHOSTED">Ghosted</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold uppercase text-ink">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="w-4 h-4 accent-ink border-2 border-ink"
            />
            <span>Remote Only</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold uppercase text-ink px-2.5 py-1 bg-mint/30 border border-ink shadow-neo-sm">
            <input
              type="checkbox"
              checked={onlyMatching}
              onChange={(e) => setOnlyMatching(e.target.checked)}
              className="w-4 h-4 accent-ink border-2 border-ink"
            />
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-ink" />
              <span>Match My Locations & Skills</span>
            </span>
          </label>
        </div>

        {/* Jobs Table */}
        <div className="neo-card bg-paper overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-ink bg-neutral-100 text-[11px] font-mono uppercase text-ink/80 tracking-wider">
                  <th className="py-3 px-4">Role & Company</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Compensation</th>
                  <th className="py-3 px-4">Match Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/10 text-xs font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs font-mono text-ink/70">
                      Loading discovered jobs...
                    </td>
                  </tr>
                ) : data?.jobs && data.jobs.length > 0 ? (
                  data.jobs.map((job) => {
                    const statusMeta = statusColorMap[job.status as ApplicationStatus];
                    const score = job.matchScore ? Math.round(job.matchScore) : null;

                    return (
                      <tr
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className="hover:bg-neutral-50 transition-none cursor-pointer border-b border-ink/20"
                      >
                        <td className="py-3.5 px-4 font-bold text-ink">
                          <div className="flex items-center gap-2">
                            <span>{job.title}</span>
                          </div>
                          <div className="text-[11px] font-mono text-ink/70 font-normal flex items-center gap-1.5 mt-0.5">
                            <Building className="w-3 h-3" />
                            <span>{job.company.name}</span>
                            <span className="text-[9px] px-1 bg-neutral-200 border border-ink/40">
                              {job.source}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-ink/80 font-mono text-xs">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-ink/50" />
                            <span>{job.location || (job.remote ? "Remote" : "N/A")}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-ink">
                          {job.salaryMin || job.salaryMax ? (
                            <span>
                              {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : "$0"} -{" "}
                              {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : "DOE"}
                            </span>
                          ) : (
                            <span className="text-ink/40 font-mono">--</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs">
                          {score !== null ? (
                            <span
                              className={`px-2 py-0.5 border border-ink font-bold ${
                                score >= 80
                                  ? "bg-mint"
                                  : score >= 70
                                  ? "bg-sky"
                                  : "bg-paper"
                              }`}
                            >
                              {score}%
                            </span>
                          ) : (
                            <span className="text-ink/40 font-mono">--</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 border border-ink text-[10px] font-mono font-bold uppercase shadow-neo-sm ${statusMeta.bg}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJobId(job.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-paper border border-ink text-xs font-bold shadow-neo-sm neo-shadow-press"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center space-y-3">
                      <div className="inline-block p-4 bg-paper border-2 border-ink shadow-neo">
                        <Briefcase className="w-6 h-6 text-ink" />
                      </div>
                      <p className="font-display text-sm uppercase text-ink">
                        No Jobs Matching Your Criteria
                      </p>
                      <p className="text-xs font-mono text-ink/60">
                        Click "Sync Discovery" to poll Greenhouse & Lever boards.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-over Detail Panel */}
      {selectedJobId && (
        <JobDetailPanel
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onStatusUpdated={() => utils.jobs.list.invalidate()}
        />
      )}
    </AppShell>
  );
}
