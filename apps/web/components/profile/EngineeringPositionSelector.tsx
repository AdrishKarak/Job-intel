"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  X,
  Check,
  Briefcase,
  ChevronDown,
  Sparkles,
  Plus,
  Filter,
} from "lucide-react";
import {
  ENGINEERING_POSITIONS,
  ENGINEERING_CATEGORIES,
} from "@/lib/constants/engineeringPositions";

interface EngineeringPositionSelectorProps {
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
}

export function EngineeringPositionSelector({
  selectedRoles,
  onChange,
}: EngineeringPositionSelectorProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter positions by query and category
  const filteredPositions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ENGINEERING_POSITIONS.filter((pos) => {
      const matchesCategory =
        selectedCategory === "All Categories" || pos.category === selectedCategory;
      const matchesQuery = !q || pos.title.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);

  const isRoleSelected = (title: string) => {
    return selectedRoles.some(
      (r) => r.trim().toLowerCase() === title.trim().toLowerCase()
    );
  };

  const toggleRole = (title: string) => {
    const trimmed = title.trim();
    if (isRoleSelected(trimmed)) {
      onChange(
        selectedRoles.filter(
          (r) => r.trim().toLowerCase() !== trimmed.toLowerCase()
        )
      );
    } else {
      onChange([...selectedRoles, trimmed]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!isRoleSelected(trimmed)) {
      onChange([...selectedRoles, trimmed]);
    }
    setQuery("");
  };

  const handleRemoveRole = (roleToRemove: string) => {
    onChange(
      selectedRoles.filter(
        (r) => r.trim().toLowerCase() !== roleToRemove.trim().toLowerCase()
      )
    );
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleAddPresetGroup = (categoryName: string) => {
    const rolesToAdd = ENGINEERING_POSITIONS.filter(
      (p) => p.category === categoryName
    ).map((p) => p.title);

    const merged = Array.from(
      new Set([
        ...selectedRoles,
        ...rolesToAdd,
      ])
    );
    onChange(merged);
  };

  return (
    <div className="space-y-3 font-sans" ref={containerRef}>
      {/* Top Header with Quick Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="block font-bold text-xs uppercase text-ink tracking-wide">
          Target Engineering Positions for AI Search Agent ({selectedRoles.length} selected)
        </label>
        {selectedRoles.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-mono font-bold text-ink/60 hover:text-red-600 underline self-start sm:self-auto"
          >
            Clear All Selected
          </button>
        )}
      </div>

      {/* Selected Roles Chips Area */}
      {selectedRoles.length > 0 ? (
        <div className="p-3 bg-neutral-50 border-2 border-ink shadow-neo-xs flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {selectedRoles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-mint border border-ink text-xs font-mono font-bold text-ink shadow-neo-xs animate-in fade-in"
            >
              <Briefcase className="w-3 h-3 text-ink/70" />
              <span>{role}</span>
              <button
                type="button"
                onClick={() => handleRemoveRole(role)}
                className="hover:bg-ink hover:text-paper rounded-xs p-0.5 transition-colors"
                title={`Remove ${role}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="p-3 bg-neutral-50/60 border-2 border-dashed border-ink/30 text-xs font-mono text-ink/60">
          No positions selected yet. Search and select from 140+ engineering positions below to tell the AI Agent what roles to hunt for.
        </div>
      )}

      {/* Quick Category Presets */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
        <span className="text-[11px] font-bold text-ink/60 uppercase mr-1">
          Quick Add:
        </span>
        <button
          type="button"
          onClick={() => handleAddPresetGroup("Graduate & Entry-Level")}
          className="px-2 py-0.5 bg-paper hover:bg-mint border border-ink font-bold text-[11px] shadow-neo-xs transition-colors"
        >
          + Graduate & Entry (GET/Associate)
        </button>
        <button
          type="button"
          onClick={() => handleAddPresetGroup("Software & Full Stack")}
          className="px-2 py-0.5 bg-paper hover:bg-sky border border-ink font-bold text-[11px] shadow-neo-xs transition-colors"
        >
          + Software & Full Stack
        </button>
        <button
          type="button"
          onClick={() => handleAddPresetGroup("Cloud & DevOps")}
          className="px-2 py-0.5 bg-paper hover:bg-amber-100 border border-ink font-bold text-[11px] shadow-neo-xs transition-colors"
        >
          + Cloud & DevOps
        </button>
        <button
          type="button"
          onClick={() => handleAddPresetGroup("Data & AI / ML")}
          className="px-2 py-0.5 bg-paper hover:bg-violet-100 border border-ink font-bold text-[11px] shadow-neo-xs transition-colors"
        >
          + Data & AI / ML
        </button>
      </div>

      {/* Search Input & Category Filter Container */}
      <div className="relative">
        <div className="flex items-stretch border-2 border-ink shadow-neo-xs bg-paper">
          {/* Category Filter Select */}
          <div className="relative border-r-2 border-ink bg-neutral-100 hidden sm:flex items-center">
            <Filter className="w-3.5 h-3.5 text-ink/60 absolute left-2.5 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-8 pr-6 py-2.5 bg-transparent text-xs font-mono font-bold text-ink focus:outline-none cursor-pointer appearance-none"
            >
              {ENGINEERING_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-ink/60 absolute right-2 pointer-events-none" />
          </div>

          {/* Search Input Box */}
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-ink/50 absolute left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filteredPositions.length > 0) {
                    toggleRole(filteredPositions[0].title);
                  } else if (query.trim()) {
                    handleAddCustom();
                  }
                }
              }}
              placeholder="Search 140+ engineering roles (e.g. Graduate Engineer, Associate, Software Engineer, DevOps)..."
              className="w-full pl-9 pr-8 py-2.5 text-xs font-mono bg-paper focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 p-1 text-ink/40 hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Toggle Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 bg-neutral-100 border-l-2 border-ink hover:bg-neutral-200 transition-colors flex items-center gap-1 text-xs font-mono font-bold"
          >
            <span>{isOpen ? "Close" : "Browse"}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Dropdown Menu (Floating with High z-index) */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-paper border-2 border-ink shadow-neo z-50 max-h-80 overflow-y-auto animate-in fade-in">
            {/* Mobile Category Selector */}
            <div className="p-2 bg-neutral-100 border-b border-ink/20 sm:hidden">
              <label className="block text-[10px] font-mono font-bold uppercase text-ink/60 mb-1">
                Filter Category:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2 py-1 bg-paper border border-ink text-xs font-mono"
              >
                {ENGINEERING_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Input Prompt if query exists and doesn't exactly match */}
            {query.trim() && (
              <div
                onClick={handleAddCustom}
                className="p-2.5 border-b-2 border-ink bg-mint/30 hover:bg-mint cursor-pointer flex items-center justify-between text-xs font-mono font-bold text-ink"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-ink" />
                  <span>
                    Add custom position: <strong className="underline">"{query.trim()}"</strong>
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-paper border border-ink shadow-neo-xs">
                  Press Enter
                </span>
              </div>
            )}

            {/* Results Header / Stats */}
            <div className="px-3 py-1.5 bg-neutral-50 border-b border-ink/15 text-[11px] font-mono text-ink/70 flex items-center justify-between">
              <span>
                {filteredPositions.length} position{filteredPositions.length === 1 ? "" : "s"} found
                {selectedCategory !== "All Categories" ? ` in ${selectedCategory}` : ""}
              </span>
              <span className="text-[10px] text-ink/50">
                Click role to select/unselect
              </span>
            </div>

            {/* Position List */}
            {filteredPositions.length > 0 ? (
              <div className="divide-y divide-ink/10">
                {filteredPositions.map((pos) => {
                  const selected = isRoleSelected(pos.title);
                  return (
                    <div
                      key={pos.title}
                      onClick={() => toggleRole(pos.title)}
                      className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs font-mono ${
                        selected
                          ? "bg-mint/40 hover:bg-mint/60 font-bold"
                          : "hover:bg-neutral-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 border border-ink flex items-center justify-center ${
                            selected ? "bg-ink text-paper" : "bg-paper"
                          }`}
                        >
                          {selected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="truncate text-ink">{pos.title}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-neutral-100 border border-ink/30 text-ink/70 shrink-0 font-medium ml-2">
                        {pos.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs font-mono text-ink/70">
                  No predefined engineering positions match "{query}".
                </p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper border-2 border-ink text-xs font-bold shadow-neo-xs neo-shadow-press"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add "{query.trim()}" as Custom Target Role</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] font-mono text-ink/60">
        💡 <strong>Agent Tip:</strong> Select multiple titles (e.g. Graduate Engineer Trainee, Associate Engineer, Software Engineer) to broaden the autonomous hunt across high-intent listings.
      </p>
    </div>
  );
}
