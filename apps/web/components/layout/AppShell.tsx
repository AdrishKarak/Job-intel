"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Sidebar } from "./Sidebar";
import {
  JobIntelLogo,
  CustomMenuToggle,
} from "@/components/icons/CustomIcons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-paper flex flex-col antialiased">
      {/* ── Fixed Desktop Sidebar (stays pinned when lists scroll) ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 xl:w-72 h-screen z-30 flex-col bg-paper border-r-4 border-ink overflow-y-auto">
        <Sidebar />
      </aside>

      {/* ── Sticky Mobile/Tablet Header Bar (< 1024px) ── */}
      <header className="lg:hidden sticky top-0 z-40 bg-paper border-b-4 border-ink px-4 py-3 flex items-center justify-between shadow-neo-sm select-none">
        <Link href="/" className="flex items-center gap-2.5">
          <JobIntelLogo size={32} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg tracking-tight text-ink uppercase leading-none">
                JobIntel
              </span>
              <span className="text-[8px] font-mono font-black uppercase px-1 bg-mint border border-ink">
                AI
              </span>
            </div>
            <p className="text-[9px] font-mono text-ink/70 leading-none mt-0.5">
              Autonomous Search
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                userButtonAvatarBox:
                  "w-7 h-7 rounded-none border-2 border-ink shadow-neo-sm",
              },
            }}
          />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-paper border-2 border-ink shadow-neo-sm neo-shadow-press text-ink hover:bg-neutral-100 focus:outline-none"
            aria-label="Toggle Navigation Drawer"
            aria-expanded={mobileMenuOpen}
          >
            <CustomMenuToggle isOpen={mobileMenuOpen} size={20} />
          </button>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer & Backdrop (< 1024px) ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-ink/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer sheet */}
          <div className="relative w-72 sm:w-80 max-w-[85vw] h-full bg-paper border-r-4 border-ink shadow-neo-lg flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <Sidebar
              onClose={() => setMobileMenuOpen(false)}
              isMobileDrawer={true}
            />
          </div>
        </div>
      )}

      {/* ── Main Content Area (Offset by fixed sidebar on desktop) ── */}
      <div className="lg:pl-64 xl:pl-72 flex-1 flex flex-col min-w-0 w-full min-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10 w-full min-w-0 overflow-x-hidden">
          <div className="max-w-6xl mx-auto w-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
