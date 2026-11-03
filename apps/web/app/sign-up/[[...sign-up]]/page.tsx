import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Zap, ArrowRight, ShieldCheck, Target, Layers } from "lucide-react";
import { JobIntelLogo } from "@/components/icons/CustomIcons";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col lg:flex-row">
      {/* Left Column: Platform Showcase & Value Proposition */}
      <div className="lg:w-7/12 border-b-4 lg:border-b-0 lg:border-r-4 border-ink p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-paper">
        <div className="space-y-10 max-w-2xl">
          {/* Brand header */}
          <Link href="/" className="inline-flex items-center gap-3.5 group">
            <JobIntelLogo size={46} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl sm:text-3xl tracking-tight text-ink uppercase leading-none">
                  JobIntel
                </span>
                <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 bg-mint border border-ink shadow-neo-xs">
                  AI
                </span>
              </div>
              <span className="text-xs font-mono font-medium text-ink/70 block mt-1">
                Autonomous Job Intelligence Platform
              </span>
            </div>
          </Link>

          {/* Hero text */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky border-2 border-ink shadow-neo-sm text-xs font-mono font-bold uppercase text-ink">
              <Zap className="w-3.5 h-3.5 text-ink" />
              Candidate Onboarding
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-ink uppercase leading-none">
              Start your automated job search.
            </h1>
            <p className="text-base text-ink/80 font-medium leading-relaxed">
              Create your account to unlock continuous ATS discovery, multi-factor fit scoring, personalized skill gap recommendations, and daily intelligence reports.
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
                Single Resume Upload
              </h3>
              <p className="text-xs text-ink/70 font-mono">
                AI extracts structured skills and experience with full diff control.
              </p>
            </div>

            <div className="p-4 bg-paper border-2 border-ink shadow-neo-sm">
              <div className="w-8 h-8 rounded-none bg-mint border-2 border-ink flex items-center justify-center font-bold text-xs mb-3 shadow-neo-sm">
                02
              </div>
              <h3 className="font-bold text-sm text-ink mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Live Job Scoring
              </h3>
              <p className="text-xs text-ink/70 font-mono">
                Real-time 0–100 match ratings with transparent explanation breakdowns.
              </p>
            </div>

            <div className="p-4 bg-paper border-2 border-ink shadow-neo-sm">
              <div className="w-8 h-8 rounded-none bg-pink border-2 border-ink flex items-center justify-center font-bold text-xs mb-3 shadow-neo-sm">
                03
              </div>
              <h3 className="font-bold text-sm text-ink mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Guaranteed Privacy
              </h3>
              <p className="text-xs text-ink/70 font-mono">
                Resume files deleted immediately upon confirmation. Strict data isolation.
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
          <span className="text-ink/60 font-medium">No Auto-Apply Guarantee</span>
        </div>
      </div>

      {/* Right Column: Framed Authentication Portal */}
      <div className="lg:w-5/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-center items-center bg-paper">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only brand identifier above auth card */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 pb-1">
            <JobIntelLogo size={34} />
            <span className="font-display text-xl uppercase tracking-tight text-ink">JobIntel</span>
            <span className="text-[9px] font-mono font-black uppercase px-1 bg-mint border border-ink">AI</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 bg-sky border-2 border-ink shadow-neo-sm text-[10px] font-mono font-bold uppercase text-ink">
              New Account
            </span>
            <Link
              href="/sign-in"
              className="text-xs font-mono font-bold text-ink underline hover:text-neutral-700 flex items-center gap-1 neo-shadow-press"
            >
              <span>Already registered? Sign in</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="border-4 border-ink shadow-neo-lg bg-paper p-6 sm:p-8">
            <SignUp
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
