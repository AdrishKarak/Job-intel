"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Briefcase, Filter, Search } from "lucide-react";

export default function JobsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div className="border-b-4 border-ink pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight text-ink uppercase">
              Jobs CRM
            </h1>
            <p className="mt-2 text-sm text-ink/80 font-medium">
              Manage discovered opportunities and track application stages.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-ink text-paper border-2 border-ink shadow-neo-sm font-bold text-sm neo-shadow-press">
              Export Excel
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="neo-card p-4 flex flex-wrap items-center gap-4 bg-paper">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-ink/60" />
            <input
              type="text"
              placeholder="Search by role, company, or skill..."
              className="w-full pl-9 pr-4 py-2 border-2 border-ink bg-paper text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border-2 border-ink bg-paper text-sm font-bold shadow-neo-sm neo-shadow-press">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Table placeholder */}
        <div className="neo-card p-12 text-center space-y-3 bg-paper">
          <div className="inline-block p-4 bg-paper border-2 border-ink shadow-neo">
            <Briefcase className="w-8 h-8 text-ink" />
          </div>
          <h2 className="font-display text-xl text-ink uppercase">
            No Jobs Discovered Yet
          </h2>
          <p className="text-sm text-ink/70 max-w-md mx-auto">
            Once your candidate profile is created, the system will continuously poll company ATS boards and surface matching opportunities here.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
