"use client";

import { AppShell } from "@/components/layout/AppShell";
import { UserCircle, UploadCloud, Plus } from "lucide-react";

export default function ProfilePage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div className="border-b-4 border-ink pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight text-ink uppercase">
              Candidate Profile
            </h1>
            <p className="mt-2 text-sm text-ink/80 font-medium">
              Your parsed resume, verified skills, and search preferences.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-ink text-paper border-2 border-ink shadow-neo-sm font-bold text-sm neo-shadow-press">
            <Plus className="w-4 h-4" />
            <span>Add Manual Skill</span>
          </button>
        </div>

        {/* Resume upload area */}
        <div className="neo-card p-8 bg-paper border-dashed border-2 border-ink text-center space-y-4">
          <div className="inline-block p-4 bg-mint border-2 border-ink shadow-neo">
            <UploadCloud className="w-8 h-8 text-ink" />
          </div>
          <h2 className="font-display text-xl text-ink uppercase">
            Upload Your Resume
          </h2>
          <p className="text-sm text-ink/70 max-w-md mx-auto">
            Drag and drop your PDF/DOCX resume here. The system extracts your skills and experience into a structured profile, and the original file is permanently deleted.
          </p>
          <div className="pt-2">
            <button className="px-6 py-2.5 bg-ink text-paper border-2 border-ink shadow-neo font-bold text-sm neo-shadow-press">
              Select Resume File
            </button>
          </div>
        </div>

        {/* Profile Details Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="neo-card p-6 bg-paper space-y-4">
            <div className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-ink" />
              <h2 className="font-display text-lg uppercase text-ink">
                Preferences
              </h2>
            </div>
            <div className="text-sm text-ink/70 font-mono space-y-2">
              <p>Target Roles: Not set</p>
              <p>Preferred Locations: Not set</p>
              <p>Salary Range: Not set</p>
              <p>Remote Preference: No preference</p>
            </div>
          </div>

          <div className="neo-card p-6 bg-paper space-y-4">
            <h2 className="font-display text-lg uppercase text-ink">
              Verified Skills
            </h2>
            <div className="text-sm text-ink/70 font-mono">
              No skills added yet. Upload a resume or add skills manually.
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
