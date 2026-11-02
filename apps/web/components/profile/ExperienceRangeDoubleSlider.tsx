"use client";

import React from "react";
import { Sliders, Sparkles, Check, Loader2, Info, ArrowRight } from "lucide-react";

interface ExperienceRangeDoubleSliderProps {
  minYears: number;
  maxYears: number;
  onChange: (min: number, max: number) => void;
  onSave?: (min: number, max: number) => void;
  isSaving?: boolean;
  saveStatus?: "idle" | "saving" | "saved";
}

const MAX_SLIDER_LIMIT = 30;

export function ExperienceRangeDoubleSlider({
  minYears,
  maxYears,
  onChange,
  onSave,
  isSaving = false,
  saveStatus = "idle",
}: ExperienceRangeDoubleSliderProps) {
  // Ensure valid bounds
  const clampedMin = Math.max(0, Math.min(MAX_SLIDER_LIMIT, Math.round(minYears)));
  const clampedMax = Math.max(clampedMin, Math.min(MAX_SLIDER_LIMIT, Math.round(maxYears)));

  const handleMinChange = (newMin: number) => {
    const val = Math.max(0, Math.min(MAX_SLIDER_LIMIT, newMin));
    if (val > clampedMax) {
      onChange(clampedMax, clampedMax);
    } else {
      onChange(val, clampedMax);
    }
  };

  const handleMaxChange = (newMax: number) => {
    const val = Math.max(0, Math.min(MAX_SLIDER_LIMIT, newMax));
    if (val < clampedMin) {
      onChange(clampedMin, clampedMin);
    } else {
      onChange(clampedMin, val);
    }
  };

  // Determine dynamic tier based on selected range
  const getRangeDescription = (min: number, max: number) => {
    if (min === 0 && max <= 1) {
      return {
        badge: "Fresher & Trainee Focus",
        badgeBg: "bg-mint text-ink",
        title: "0 – 1 Years (Graduate & Trainee)",
        desc: "Agent hunts for Graduate Engineer Trainee (GET), Apprentice, and Entry-Level openings that require zero prior industry tenure.",
      };
    } else if (max <= 3) {
      return {
        badge: "Associate & Junior Track",
        badgeBg: "bg-sky text-ink",
        title: `${min} – ${max} Years (Early Career / Associate)`,
        desc: "Agent prioritizes Associate Engineer, Junior Developer, and 1-3 YoE listings, blocking senior/staff requirements.",
      };
    } else if (min >= 2 && max <= 6) {
      return {
        badge: "Core Mid-Level Engineer",
        badgeBg: "bg-amber-200 text-ink",
        title: `${min} – ${max} Years (Mid-Level IC)`,
        desc: "Agent focuses on Software Engineer II and core contributor roles while filtering out internships and student programs.",
      };
    } else if (min >= 4 && max <= 10) {
      return {
        badge: "Senior Professional Track",
        badgeBg: "bg-violet-200 text-ink",
        title: `${min} – ${max} Years (Senior / Tech Lead)`,
        desc: "Agent targets Senior Software Engineer and Tech Lead positions, eliminating junior or entry-level roles.",
      };
    } else if (min >= 8 && max <= 16) {
      return {
        badge: "Staff & Principal Specialist",
        badgeBg: "bg-rose-200 text-ink",
        title: `${min} – ${max} Years (Staff / Principal)`,
        desc: "Agent hunts for Staff Engineer, Principal Systems Architect, and Staff IC postings requiring deep domain leadership.",
      };
    } else if (min >= 12) {
      return {
        badge: "Executive & Director Level",
        badgeBg: "bg-emerald-200 text-ink",
        title: `${min} – ${max >= MAX_SLIDER_LIMIT ? "30+" : max} Years (Leadership)`,
        desc: "Agent hunts for Engineering Manager, Director of Engineering, VP, and CTO executive leadership opportunities.",
      };
    } else {
      return {
        badge: "Broad Search Range",
        badgeBg: "bg-paper text-ink",
        title: `${min} – ${max >= MAX_SLIDER_LIMIT ? "30+" : max} Years`,
        desc: `Agent will accept jobs anywhere within the ${min} to ${max >= MAX_SLIDER_LIMIT ? "30+" : max} years experience bracket.`,
      };
    }
  };

  const tier = getRangeDescription(clampedMin, clampedMax);

  // Compute percentage positions for the slider track
  const minPercent = (clampedMin / MAX_SLIDER_LIMIT) * 100;
  const maxPercent = (clampedMax / MAX_SLIDER_LIMIT) * 100;
  const rangeWidth = maxPercent - minPercent;

  return (
    <div className="neo-card p-6 md:p-8 bg-paper border-2 border-ink space-y-6">
      {/* Header and Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-ink" />
            <h2 className="font-display text-xl uppercase text-ink">
              Preferred Experience Range for Job Search
            </h2>
          </div>
          <p className="text-xs font-mono text-ink/70 mt-1">
            Double slider telling your AI Agent the exact minimum and maximum experience to target. (Not a static work history).
          </p>
        </div>

        {onSave && (
          <button
            type="button"
            onClick={() => onSave(clampedMin, clampedMax)}
            disabled={isSaving || saveStatus === "saving"}
            className="flex items-center gap-2 px-5 py-2.5 bg-ink text-paper border-2 border-ink shadow-neo font-bold text-xs uppercase neo-shadow-press self-start sm:self-auto shrink-0"
          >
            {saveStatus === "saving" ? (
              <Loader2 className="w-4 h-4 animate-spin text-mint" />
            ) : saveStatus === "saved" ? (
              <Check className="w-4 h-4 text-mint" />
            ) : (
              <Sparkles className="w-4 h-4 text-mint" />
            )}
            <span>
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                ? "Saved to Agent!"
                : `Save Range [${clampedMin} – ${clampedMax >= MAX_SLIDER_LIMIT ? "30+" : clampedMax} Yrs]`}
            </span>
          </button>
        )}
      </div>

      {/* Target Experience Range Display Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-5 bg-neutral-50/80 border-2 border-ink shadow-neo-sm">
        {/* Big Range Values */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase text-ink/60">
            Selected Experience Window
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl md:text-5xl font-black text-ink tracking-tight">
              {clampedMin} – {clampedMax >= MAX_SLIDER_LIMIT ? "30+" : clampedMax}
            </span>
            <span className="font-display text-lg md:text-xl font-bold text-ink/70">
              YEARS
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-ink/70">
            <span>Min: <strong>{clampedMin} Yrs</strong></span>
            <span>•</span>
            <span>Max: <strong>{clampedMax >= MAX_SLIDER_LIMIT ? "30+ Yrs" : `${clampedMax} Yrs`}</strong></span>
          </div>
        </div>

        {/* Dynamic Tier & Agent Strategy */}
        <div className="md:col-span-2 space-y-2 border-t md:border-t-0 md:border-l border-ink/20 pt-3 md:pt-0 md:pl-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-3 py-0.5 border-2 border-ink font-mono font-bold text-xs uppercase shadow-neo-xs ${tier.badgeBg}`}
            >
              {tier.badge}
            </span>
            <span className="text-xs font-mono font-bold text-ink/80">
              {tier.title}
            </span>
          </div>
          <p className="text-xs font-sans text-ink/80 leading-relaxed">
            {tier.desc}
          </p>
        </div>
      </div>

      {/* Interactive Dual Slider Track */}
      <div className="space-y-4 pt-2">
        {/* Range Labels */}
        <div className="flex items-center justify-between text-xs font-mono font-bold text-ink/70">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-mint border border-ink inline-block" />
            0 Yrs (Fresher / GET)
          </span>
          <span>5 Yrs</span>
          <span>10 Yrs (Lead)</span>
          <span>20 Yrs</span>
          <span className="flex items-center gap-1">
            30+ Yrs (Leadership)
            <span className="w-2.5 h-2.5 bg-ink inline-block" />
          </span>
        </div>

        {/* Double Slider Container */}
        <div className="relative w-full h-8 flex items-center">
          {/* Base Gray Track */}
          <div className="absolute left-0 right-0 h-3.5 bg-neutral-200 border-2 border-ink shadow-neo-xs" />

          {/* Active Highlighted Range Bar */}
          <div
            className="absolute h-3.5 bg-mint border-y-2 border-ink transition-all"
            style={{
              left: `${minPercent}%`,
              width: `${rangeWidth}%`,
            }}
          />

          {/* Dual Range HTML Inputs */}
          <input
            type="range"
            min={0}
            max={MAX_SLIDER_LIMIT}
            step={1}
            value={clampedMin}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            className="neo-double-slider-input"
            style={{ zIndex: clampedMin > MAX_SLIDER_LIMIT - 5 ? 35 : 25 }}
            aria-label="Minimum Experience (Years)"
          />

          <input
            type="range"
            min={0}
            max={MAX_SLIDER_LIMIT}
            step={1}
            value={clampedMax}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            className="neo-double-slider-input"
            style={{ zIndex: 30 }}
            aria-label="Maximum Experience (Years)"
          />
        </div>

        {/* Stepper Fine-Tune Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Min Stepper */}
          <div className="p-3 bg-neutral-50 border-2 border-ink shadow-neo-xs flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-mono font-bold uppercase text-ink/60">
                Minimum Experience
              </span>
              <span className="text-sm font-mono font-bold text-ink">
                {clampedMin} {clampedMin === 1 ? "Year" : "Years"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleMinChange(clampedMin - 1)}
                disabled={clampedMin <= 0}
                className="w-7 h-7 bg-paper border border-ink font-mono font-bold text-sm flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleMinChange(clampedMin + 1)}
                disabled={clampedMin >= clampedMax}
                className="w-7 h-7 bg-paper border border-ink font-mono font-bold text-sm flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {/* Max Stepper */}
          <div className="p-3 bg-neutral-50 border-2 border-ink shadow-neo-xs flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-mono font-bold uppercase text-ink/60">
                Maximum Experience
              </span>
              <span className="text-sm font-mono font-bold text-ink">
                {clampedMax >= MAX_SLIDER_LIMIT ? "30+ Years (No Cap)" : `${clampedMax} Years`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleMaxChange(clampedMax - 1)}
                disabled={clampedMax <= clampedMin}
                className="w-7 h-7 bg-paper border border-ink font-mono font-bold text-sm flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleMaxChange(clampedMax + 1)}
                disabled={clampedMax >= MAX_SLIDER_LIMIT}
                className="w-7 h-7 bg-paper border border-ink font-mono font-bold text-sm flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Quick Presets for Job Search */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-mono font-bold uppercase text-ink/60">
            Quick Career Presets:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: "Fresher / GET (0–1y)", min: 0, max: 1 },
              { label: "Associate / Early (0–3y)", min: 0, max: 3 },
              { label: "Junior to Mid (1–4y)", min: 1, max: 4 },
              { label: "Mid-Level (2–5y)", min: 2, max: 5 },
              { label: "Mid-Senior (3–7y)", min: 3, max: 7 },
              { label: "Senior Engineer (5–9y)", min: 5, max: 9 },
              { label: "Lead / Staff (8–14y)", min: 8, max: 14 },
              { label: "Principal / Exec (12–30y)", min: 12, max: 30 },
              { label: "All Levels (0–30y)", min: 0, max: 30 },
            ].map((preset) => {
              const isActive =
                clampedMin === preset.min && clampedMax === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange(preset.min, preset.max)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold border-2 border-ink neo-shadow-press transition-colors ${
                    isActive
                      ? "bg-ink text-paper shadow-none"
                      : "bg-paper text-ink shadow-neo-xs hover:bg-neutral-100"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agent Search Optimization Notice */}
        <div className="p-4 bg-sky/20 border-2 border-ink shadow-neo-xs flex items-start gap-3 mt-3">
          <Info className="w-5 h-5 text-ink shrink-0 mt-0.5" />
          <div className="text-xs font-mono space-y-1 text-ink">
            <p className="font-bold">
              AI Job Agent Filtering Policy:
            </p>
            <p className="text-ink/80 leading-relaxed font-sans">
              • <strong>Stage 1 Filtering:</strong> The agent automatically filters out any position requiring over <strong>{clampedMax >= MAX_SLIDER_LIMIT ? "30+" : clampedMax} years</strong> of experience.
              {clampedMin >= 2 && (
                <> Furthermore, internship and entry-level positions are filtered out because your minimum is set to <strong>{clampedMin} years</strong>.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
