"use client";

import { AppShell } from "@/components/layout/AppShell";
import { trpc } from "@/lib/trpc/client";
import { Sparkles, Briefcase, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { data: pingData, isLoading: isPingLoading } = trpc.ping.useQuery();

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Title */}
        <div className="border-b-4 border-ink pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight text-ink uppercase">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-ink/80 font-medium">
              Real-time job intelligence, pipeline tracking & match analytics.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-paper border-2 border-ink shadow-neo-sm text-xs font-mono">
            <span className="w-2.5 h-2.5 bg-mint border border-ink rounded-full animate-pulse" />
            <span>
              tRPC: {isPingLoading ? "connecting..." : pingData ? `online (${pingData.message})` : "offline"}
            </span>
          </div>
        </div>

        {/* Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="neo-card p-6 bg-paper">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
                Jobs Found Today
              </span>
              <span className="p-2 bg-sky border-2 border-ink shadow-neo-sm">
                <Briefcase className="w-4 h-4 text-ink" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-3xl text-ink">0</span>
              <span className="text-xs font-mono text-ink/60">positions</span>
            </div>
          </div>

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
              <span className="font-display text-3xl text-ink">0</span>
              <span className="text-xs font-mono text-ink/60">in progress</span>
            </div>
          </div>

          <div className="neo-card p-6 bg-paper">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
                Interviews
              </span>
              <span className="p-2 bg-sky border-2 border-ink shadow-neo-sm">
                <CheckCircle2 className="w-4 h-4 text-ink" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-3xl text-ink">0</span>
              <span className="text-xs font-mono text-ink/60">scheduled</span>
            </div>
          </div>

          <div className="neo-card p-6 bg-paper">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
                Avg Match Score
              </span>
              <span className="p-2 bg-mint border-2 border-ink shadow-neo-sm">
                <Sparkles className="w-4 h-4 text-ink" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-3xl text-ink">--</span>
              <span className="text-xs font-mono text-ink/60">grounded fit</span>
            </div>
          </div>
        </div>

        {/* Content Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 neo-card p-6 bg-paper space-y-4">
            <h2 className="font-display text-lg uppercase text-ink">
              Recent Activity Feed
            </h2>
            <div className="border-2 border-dashed border-ink/40 p-8 text-center text-sm text-ink/70 font-mono">
              No recent activity recorded yet. Upload your resume in the Profile tab to begin discovery.
            </div>
          </div>

          <div className="neo-card p-6 bg-paper space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-ink" />
              <h2 className="font-display text-lg uppercase text-ink">
                Skill Gap Radar
              </h2>
            </div>
            <div className="border-2 border-dashed border-ink/40 p-8 text-center text-sm text-ink/70 font-mono">
              Skill gaps will appear once matched jobs are discovered.
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
