import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Sparkles, Zap, ArrowRight, ShieldCheck, Target, Layers } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col lg:flex-row">
      {/* Left Column: Platform Showcase & Value Proposition */}
      <div className="lg:w-7/12 border-b-4 lg:border-b-0 lg:border-r-4 border-ink p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-paper">
        <div className="space-y-10 max-w-2xl">
          {/* Brand header */}
          <div className="flex items-center gap-3">
            <span className="p-2 bg-mint border-2 border-ink shadow-neo-sm font-black">
              <Sparkles className="w-6 h-6 text-ink" />
            </span>
            <div>
              <span className="font-display text-2xl tracking-tight text-ink uppercase block leading-none">
                JobIntel
              </span>
              <span className="text-xs font-mono font-medium text-ink/70">
                AI Autonomous Job Intelligence Platform
              </span>
            </div>
          </div>

          {/* Hero text */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky border-2 border-ink shadow-neo-sm text-xs font-mono font-bold uppercase text-ink">
              <Zap className="w-3.5 h-3.5 text-ink" />
              Continuous Intelligence Engine
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-ink uppercase leading-none">
              Autonomous job hunting on autopilot.
            </h1>
            <p className="text-base text-ink/80 font-medium leading-relaxed">
              Upload your resume once. Our autonomous background engine continuously discovers, scores, and tracks live engineering roles across 100+ verified employer ATS boards with 0 demographic bias.
            </p>
          </div>

          {/* Bento Value Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-paper border-2 border-ink shadow-neo-sm">
              <div className="w-8 h-8 rounded-none bg-sky border-2 border-ink flex items-center justify-center font-bold text-xs mb-3 shadow-neo-sm">
                01
              </div>
              <h3 className="font-bold text-sm text-ink mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Live Discovery
              </h3>
              <p className="text-xs text-ink/70 font-mono">
                Periodic sync across 102 verified Greenhouse, Lever, Ashby, and Workday boards.
              </p>
            </div>

            <div className="p-4 bg-paper border-2 border-ink shadow-neo-sm">
              <div className="w-8 h-8 rounded-none bg-mint border-2 border-ink flex items-center justify-center font-bold text-xs mb-3 shadow-neo-sm">
                02
              </div>
              <h3 className="font-bold text-sm text-ink mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Grounded Fit
              </h3>
              <p className="text-xs text-ink/70 font-mono">
                5-factor weighted scoring engine with exact matched & missing skill transparency.
              </p>
            </div>

            <div className="p-4 bg-paper border-2 border-ink shadow-neo-sm">
              <div className="w-8 h-8 rounded-none bg-pink border-2 border-ink flex items-center justify-center font-bold text-xs mb-3 shadow-neo-sm">
                03
              </div>
              <h3 className="font-bold text-sm text-ink mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                No Auto-Apply
              </h3>
              <p className="text-xs text-ink/70 font-mono">
                Transient resumes permanently deleted after parsing. Strict human-in-the-loop control.
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline Preview Ticker */}
        <div className="mt-12 pt-8 border-t-2 border-ink flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink uppercase">Pipeline States:</span>
            <span className="px-2 py-0.5 border border-ink bg-paper font-bold">SAVED</span>
            <span className="px-2 py-0.5 border border-ink bg-pink font-bold">APPLIED</span>
            <span className="px-2 py-0.5 border border-ink bg-sky font-bold">INTERVIEW</span>
            <span className="px-2 py-0.5 border border-ink bg-mint font-bold">OFFER</span>
          </div>
          <span className="text-ink/60 font-medium">Strict Per-User Partitioning</span>
        </div>
      </div>

      {/* Right Column: Framed Authentication Portal */}
      <div className="lg:w-5/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-center items-center bg-paper">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 bg-mint border-2 border-ink shadow-neo-sm text-[10px] font-mono font-bold uppercase text-ink">
              Candidate Access
            </span>
            <Link
              href="/sign-up"
              className="text-xs font-mono font-bold text-ink underline hover:text-neutral-700 flex items-center gap-1 neo-shadow-press"
            >
              <span>Need an account? Sign up</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="border-4 border-ink shadow-neo-lg bg-paper p-6 sm:p-8">
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none border-none",
                  card: "w-full shadow-none border-none p-0 bg-transparent",
                  headerTitle: "font-display text-2xl uppercase tracking-tight text-ink",
                  headerSubtitle: "text-xs font-mono text-ink/70 mt-1",
                },
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-ink/60">
            <ShieldCheck className="w-3.5 h-3.5 text-ink/80" />
            <span>End-to-end user isolation & transient resume privacy.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
