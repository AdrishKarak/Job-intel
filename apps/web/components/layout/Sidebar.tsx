"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { LayoutDashboard, Briefcase, UserCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Jobs CRM",
    href: "/jobs",
    icon: Briefcase,
  },
  {
    name: "Profile",
    href: "/profile",
    icon: UserCircle,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="w-64 min-h-screen bg-paper border-r-4 border-ink flex flex-col justify-between p-6 select-none">
      <div className="space-y-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-mint border-2 border-ink shadow-neo-sm font-black">
              <Sparkles className="w-4 h-4 text-ink" />
            </span>
            <span className="font-display text-xl tracking-tight text-ink uppercase">
              JobIntel
            </span>
          </div>
          <p className="text-xs font-mono font-medium text-ink/70">
            AI Job Search Assistant
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-2 border-ink text-sm font-bold tracking-wide transition-none",
                  isActive
                    ? "bg-ink text-paper shadow-neo"
                    : "bg-paper text-ink hover:bg-neutral-100 shadow-neo-sm neo-shadow-press"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-paper" : "text-ink")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Section */}
      <div className="pt-6 border-t-2 border-ink">
        <div className="flex items-center justify-between p-3 bg-paper border-2 border-ink shadow-neo-sm">
          <div className="flex items-center gap-3 min-w-0">
            <UserButton afterSignOutUrl="/sign-in" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress || "Candidate"}
              </p>
              <p className="text-[10px] font-mono text-ink/60 truncate">Active Plan</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
