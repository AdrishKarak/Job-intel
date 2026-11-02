"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { trpc } from "@/lib/trpc/client";
import { statusColorMap } from "@/lib/utils";
import type { ApplicationStatus } from "@repo/shared-types";
import {
  Sparkles,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  Award,
  RefreshCw,
  Building,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function DashboardPage() {
  const [matchesPage, setMatchesPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const activityPageSize = 5;

  const { data, isLoading, refetch, isRefetching } = trpc.dashboard.getSummary.useQuery();
  const { data: topMatchesData, isLoading: isMatchesLoading } = trpc.dashboard.getTopMatches.useQuery({
    page: matchesPage,
    limit: 5,
  });

  const stats = data?.stats;
  const scoreDist = data?.scoreDistribution;
  const statusCounts = data?.statusCounts || {};
  const topSkillGaps = data?.topSkillGaps || [];
  const recentActivity = data?.recentActivity || [];

  const paginatedActivities = recentActivity.slice(
    (activityPage - 1) * activityPageSize,
    activityPage * activityPageSize
  );
  const totalActivityPages = Math.max(1, Math.ceil(recentActivity.length / activityPageSize));

  const totalScored =
    (scoreDist?.high || 0) + (scoreDist?.good || 0) + (scoreDist?.moderate || 0);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b-4 border-ink pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight text-ink uppercase">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-ink/80 font-medium">
              Real-time job intelligence, pipeline tracking & match analytics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="flex items-center gap-2 px-3.5 py-2 bg-paper border-2 border-ink shadow-neo-sm font-bold text-xs neo-shadow-press"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              <span>Refresh Metrics</span>
            </button>
            <Link
              href="/jobs"
              className="flex items-center gap-1.5 px-4 py-2 bg-ink text-paper border-2 border-ink shadow-neo font-bold text-xs neo-shadow-press"
            >
              <span>Explore Jobs CRM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Jobs Discovered */}
          <div className="neo-card p-6 bg-paper">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
                Jobs Discovered
              </span>
              <span className="p-2 bg-sky border-2 border-ink shadow-neo-sm">
                <Briefcase className="w-4 h-4 text-ink" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl text-ink">
                {isLoading ? "--" : stats?.totalJobs ?? 0}
              </span>
              <span className="text-xs font-mono text-ink/60">
                ({stats?.jobsFoundToday ?? 0} today)
              </span>
            </div>
          </div>

          {/* Card 2: Active Applications */}
          <div className="neo-card p-6 bg-paper">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
                Active Applications
              </span>
              <span className="p-2 bg-pink border-2 border-ink shadow-neo-sm">
                <TrendingUp className="w-4 h-4 text-ink" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl text-ink">
                {isLoading ? "--" : stats?.activeApplications ?? 0}
              </span>
              <span className="text-xs font-mono text-ink/60">in pipeline</span>
            </div>
          </div>

          {/* Card 3: Interviews & Offers */}
          <div className="neo-card p-6 bg-paper">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
                Interviews & Offers
              </span>
              <span className="p-2 bg-mint border-2 border-ink shadow-neo-sm">
                <Award className="w-4 h-4 text-ink" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl text-ink">
                {isLoading ? "--" : (stats?.interviews ?? 0) + (stats?.offers ?? 0)}
              </span>
              <span className="text-xs font-mono text-ink/60">
                ({stats?.offers ?? 0} offers)
              </span>
            </div>
          </div>

          {/* Card 4: Average Fit */}
          <div className="neo-card p-6 bg-paper">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
                Avg Match Score
              </span>
              <span className="p-2 bg-yellow-300 border-2 border-ink shadow-neo-sm">
                <Sparkles className="w-4 h-4 text-ink" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl text-ink">
                {isLoading ? "--" : stats?.avgMatchScore ? `${stats.avgMatchScore}%` : "N/A"}
              </span>
              <span className="text-xs font-mono text-ink/60">grounded fit</span>
            </div>
          </div>
        </div>

        {/* Analytics & Pipeline Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Match Score Distribution */}
          <div className="neo-card p-6 bg-paper space-y-5">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <h2 className="font-display text-base uppercase text-ink flex items-center gap-2">
                <Layers className="w-4 h-4 text-ink" />
                <span>Match Score Distribution</span>
              </h2>
              <span className="text-xs font-mono font-bold text-ink/70">
                {totalScored} Scored
              </span>
            </div>

            <div className="space-y-4">
              {/* High Match (>=80%) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-mint border border-ink inline-block" />
                    <span>Strong Fit (80–100%)</span>
                  </span>
                  <span className="font-mono">{scoreDist?.high ?? 0} jobs</span>
                </div>
                <div className="w-full h-3 bg-neutral-100 border-2 border-ink overflow-hidden">
                  <div
                    className="h-full bg-mint transition-all"
                    style={{
                      width: `${totalScored > 0 ? ((scoreDist?.high || 0) / totalScored) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Good Match (70-79%) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-sky border border-ink inline-block" />
                    <span>Solid Fit (70–79%)</span>
                  </span>
                  <span className="font-mono">{scoreDist?.good ?? 0} jobs</span>
                </div>
                <div className="w-full h-3 bg-neutral-100 border-2 border-ink overflow-hidden">
                  <div
                    className="h-full bg-sky transition-all"
                    style={{
                      width: `${totalScored > 0 ? ((scoreDist?.good || 0) / totalScored) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Moderate Match (<70%) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-neutral-300 border border-ink inline-block" />
                    <span>Moderate / Low (&lt;70%)</span>
                  </span>
                  <span className="font-mono">{scoreDist?.moderate ?? 0} jobs</span>
                </div>
                <div className="w-full h-3 bg-neutral-100 border-2 border-ink overflow-hidden">
                  <div
                    className="h-full bg-neutral-300 transition-all"
                    style={{
                      width: `${totalScored > 0 ? ((scoreDist?.moderate || 0) / totalScored) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] font-mono text-ink/70 pt-2 border-t border-ink/10">
              Composite score: 70% rule-based (skills overlap, salary, location) + 30% pgvector semantic profile similarity.
            </p>
          </div>

          {/* Application Pipeline Stages */}
          <div className="neo-card p-6 bg-paper space-y-5">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <h2 className="font-display text-base uppercase text-ink flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-ink" />
                <span>Application Pipeline Breakdown</span>
              </h2>
              <span className="text-xs font-mono font-bold text-ink/70">
                {stats?.totalJobs ?? 0} Total
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(
                [
                  "DISCOVERED",
                  "SAVED",
                  "APPLIED",
                  "OA_RECEIVED",
                  "OA_CLEARED",
                  "INTERVIEW_SCHEDULED",
                  "INTERVIEW_CLEARED",
                  "OFFER",
                  "REJECTED",
                ] as ApplicationStatus[]
              ).map((status) => {
                const count = statusCounts[status] || 0;
                const meta = statusColorMap[status];

                return (
                  <div
                    key={status}
                    className={`p-2.5 border-2 border-ink shadow-neo-sm ${meta.bg} flex flex-col justify-between`}
                  >
                    <span className="text-[10px] font-mono font-bold uppercase text-ink/80 truncate">
                      {meta.label}
                    </span>
                    <span className="font-display text-xl text-ink mt-1">{count}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] font-mono text-ink/70 pt-1 border-t border-ink/10">
              Rule 3 & HITL Policy: Applications are submitted manually by you. Update statuses directly in the Jobs CRM.
            </p>
          </div>
        </div>

        {/* Curated Top Job Matches with Pagination */}
        <div className="neo-card p-6 bg-paper space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-ink pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-ink" />
                <h2 className="font-display text-lg uppercase text-ink">
                  Curated Top Job Matches
                </h2>
              </div>
              <p className="text-xs font-mono text-ink/70 mt-0.5">
                Filtered strictly by experience, location, and technical skills.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-paper border-2 border-ink shadow-neo-sm font-bold text-xs neo-shadow-press"
              >
                <span>Full Jobs CRM</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-ink bg-neutral-100 text-[11px] font-mono uppercase text-ink/80 tracking-wider">
                  <th className="py-2.5 px-3">Role & Company</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Fit Score</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Apply</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/10 text-xs font-sans">
                {isMatchesLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs font-mono text-ink/70">
                      Loading matching positions...
                    </td>
                  </tr>
                ) : topMatchesData?.jobs && topMatchesData.jobs.length > 0 ? (
                  topMatchesData.jobs.map((job) => {
                    const statusMeta = statusColorMap[job.status as ApplicationStatus];
                    const score = job.matchScore ? Math.round(job.matchScore) : null;

                    return (
                      <tr key={job.id} className="hover:bg-neutral-50 border-b border-ink/20">
                        <td className="py-2.5 px-3 font-bold text-ink">
                          <div>{job.title}</div>
                          <div className="text-[11px] font-mono text-ink/70 font-normal flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-ink/50" />
                            <span>{job.company.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-ink/80">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-ink/50" />
                            <span>{job.location || (job.remote ? "Remote" : "N/A")}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs">
                          {score !== null ? (
                            <span
                              className={`px-2 py-0.5 border border-ink font-bold ${
                                score >= 80 ? "bg-mint" : score >= 70 ? "bg-sky" : "bg-paper"
                              }`}
                            >
                              {score}%
                            </span>
                          ) : (
                            <span className="text-ink/40 font-mono">--</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.2 border border-ink text-[10px] font-mono font-bold uppercase ${statusMeta.bg}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {job.applicationUrl ? (
                            <a
                              href={job.applicationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-mint text-ink border border-ink text-xs font-bold shadow-neo-sm neo-shadow-press"
                              title="Open job application"
                            >
                              <span>Apply</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-ink/40 font-mono text-xs">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs font-mono text-ink/60">
                      No matching positions yet. Sync discovery from the Jobs CRM!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Dashboard Matches Pagination Controls */}
          {topMatchesData && topMatchesData.total > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-ink/10 text-xs font-mono">
              <span className="text-ink/70">
                Showing {(matchesPage - 1) * 5 + 1} - {Math.min(matchesPage * 5, topMatchesData.total)} of {topMatchesData.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMatchesPage((p) => Math.max(1, p - 1))}
                  disabled={matchesPage <= 1}
                  className="px-2.5 py-1 bg-paper border border-ink shadow-neo-sm font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed neo-shadow-press"
                >
                  <ChevronLeft className="w-3.5 h-3.5 inline mr-0.5" />
                  <span>Prev</span>
                </button>
                <span className="px-2 py-0.5 bg-neutral-100 border border-ink font-bold">
                  {matchesPage} / {topMatchesData.totalPages || 1}
                </span>
                <button
                  onClick={() => setMatchesPage((p) => Math.min(topMatchesData.totalPages || 1, p + 1))}
                  disabled={matchesPage >= (topMatchesData.totalPages || 1)}
                  className="px-2.5 py-1 bg-paper border border-ink shadow-neo-sm font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed neo-shadow-press"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5 inline ml-0.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Grids: Skill Gaps & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Skill Gap Intelligence Widget */}
          <div className="neo-card p-6 bg-paper space-y-4">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <h2 className="font-display text-base uppercase text-ink flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-ink" />
                <span>Top Missing Skills</span>
              </h2>
              <span className="text-[10px] font-mono bg-coral/30 px-2 py-0.5 border border-ink font-bold">
                HIGH IMPACT
              </span>
            </div>

            <p className="text-xs text-ink/80 leading-relaxed">
              Most frequent requirements across your discovered jobs that are not yet verified on your profile.
            </p>

            <div className="space-y-3 pt-2">
              {topSkillGaps.length > 0 ? (
                topSkillGaps.map((gap) => (
                  <div key={gap.skillName} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="font-bold text-ink">{gap.skillName}</span>
                      <span className="text-ink/70 font-semibold">
                        {gap.count} jobs ({gap.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 border border-ink">
                      <div
                        className="h-full bg-coral transition-all"
                        style={{ width: `${Math.min(100, gap.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs font-mono text-ink/60 border-2 border-dashed border-ink/30">
                  No missing skill gaps detected yet. Add more target jobs in the CRM!
                </div>
              )}
            </div>

            <div className="pt-2">
              <Link
                href="/profile"
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-neutral-100 hover:bg-neutral-200 border-2 border-ink shadow-neo-sm font-bold text-xs neo-shadow-press text-ink"
              >
                <span>Add Skills to Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 neo-card p-6 bg-paper space-y-4">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <h2 className="font-display text-base uppercase text-ink flex items-center gap-2">
                <Clock className="w-4 h-4 text-ink" />
                <span>Recent Pipeline Activity</span>
              </h2>
              <Link
                href="/jobs"
                className="text-xs font-mono font-bold text-ink hover:underline flex items-center gap-1"
              >
                <span>View All Jobs</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {paginatedActivities.length > 0 ? (
                paginatedActivities.map((activity) => {
                  const meta = statusColorMap[activity.status];
                  const isTransition = activity.type === "STATUS_TRANSITION";

                  return (
                    <div
                      key={activity.id}
                      className="p-3 border-2 border-ink bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-neo-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 border border-ink text-[10px] font-mono font-bold uppercase ${meta.bg}`}
                          >
                            {isTransition ? `Moved to ${meta.label}` : "Discovered"}
                          </span>
                          <span className="font-bold text-xs text-ink">{activity.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-ink/70">
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-ink/50" />
                            {activity.company}
                          </span>
                          {activity.note && (
                            <>
                              <span>•</span>
                              <span className="italic">{activity.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-ink/50 whitespace-nowrap self-end sm:self-auto">
                        {new Date(activity.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs font-mono text-ink/60 border-2 border-dashed border-ink/30 space-y-2">
                  <p>No recent activity recorded.</p>
                  <Link
                    href="/jobs"
                    className="inline-block px-3 py-1 bg-ink text-paper text-xs font-bold border border-ink shadow-neo-sm"
                  >
                    Sync Discovery in Jobs CRM
                  </Link>
                </div>
              )}
            </div>

            {/* Activity Pagination Controls */}
            {recentActivity.length > activityPageSize && (
              <div className="flex items-center justify-between pt-2 border-t border-ink/10 text-xs font-mono">
                <span className="text-ink/60">
                  Page {activityPage} of {totalActivityPages} ({recentActivity.length} items)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                    disabled={activityPage <= 1}
                    className="px-2 py-0.5 bg-paper border border-ink shadow-neo-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed neo-shadow-press"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setActivityPage((p) => Math.min(totalActivityPages, p + 1))}
                    disabled={activityPage >= totalActivityPages}
                    className="px-2 py-0.5 bg-paper border border-ink shadow-neo-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed neo-shadow-press"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
