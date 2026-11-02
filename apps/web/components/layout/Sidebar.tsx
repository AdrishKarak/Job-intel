"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  JobIntelLogo,
  CustomDashboardIcon,
  CustomJobsIcon,
  CustomProfileIcon,
  CustomMenuToggle,
} from "@/components/icons/CustomIcons";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/",
    icon: CustomDashboardIcon,
    badge: "LIVE",
  },
  {
    name: "Jobs CRM",
    href: "/jobs",
    icon: CustomJobsIcon,
    badge: "SYNCED",
  },
  {
    name: "Profile",
    href: "/profile",
    icon: CustomProfileIcon,
    badge: "AI MATCH",
  },
];

interface SidebarProps {
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export function Sidebar({ onClose, isMobileDrawer = false }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const handleLinkClick = () => {
    if (isMobileDrawer && onClose) {
      onClose();
    }
  };

  return (
    <div className="h-full flex flex-col justify-between p-5 md:p-6 select-none bg-paper">
      <div className="space-y-6 md:space-y-8">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            onClick={handleLinkClick}
            className="flex items-center gap-3 group"
          >
            <JobIntelLogo
              size={38}
              className="group-hover:scale-105 transition-transform duration-200"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xl md:text-2xl tracking-tight text-ink uppercase leading-none">
                  JobIntel
                </span>
                <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 bg-mint border border-ink shadow-neo-sm">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] font-mono font-medium text-ink/70 mt-1">
                AI Job Intelligence Platform
              </p>
            </div>
          </Link>

          {/* Close button for mobile drawer */}
          {isMobileDrawer && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 bg-paper border-2 border-ink shadow-neo-sm neo-shadow-press text-ink hover:bg-neutral-100"
              aria-label="Close navigation"
            >
              <CustomMenuToggle isOpen={true} size={18} />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="space-y-2.5">
          <div className="px-1 text-[10px] font-mono uppercase font-bold text-ink/60 tracking-wider">
            Navigation Menu
          </div>
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
                onClick={handleLinkClick}
                className={cn(
                  "group flex items-center justify-between px-3.5 py-3 border-2 border-ink text-xs md:text-sm font-bold tracking-wide transition-all",
                  isActive
                    ? "bg-ink text-paper shadow-neo translate-x-1"
                    : "bg-paper text-ink hover:bg-neutral-100 shadow-neo-sm neo-shadow-press"
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "p-1.5 border border-ink transition-colors",
                      isActive
                        ? "bg-mint text-ink"
                        : "bg-neutral-100 text-ink group-hover:bg-mint/40"
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 border border-ink font-black tracking-wider uppercase",
                      isActive
                        ? "bg-paper text-ink"
                        : "bg-neutral-100 text-ink/80"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Section & Session Card */}
      <div className="pt-5 border-t-2 border-ink space-y-3">
        <div className="p-3 bg-paper border-2 border-ink shadow-neo-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  userButtonAvatarBox:
                    "w-8 h-8 rounded-none border-2 border-ink shadow-neo-sm",
                  userButtonPopoverCard:
                    "border-2 border-ink shadow-neo rounded-none bg-paper",
                  userButtonPopoverActionButton:
                    "hover:bg-neutral-100 rounded-none font-bold text-xs text-ink",
                  userButtonPopoverActionButtonText: "text-ink font-bold",
                  userButtonPopoverFooter: "border-t-2 border-ink",
                },
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink truncate">
                {user?.fullName ||
                  user?.primaryEmailAddress?.emailAddress ||
                  "Candidate"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-mint border border-ink animate-pulse" />
                <p className="text-[10px] font-mono font-medium text-ink/70 truncate">
                  Autonomous Agent Active
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System Telemetry Badge */}
        <div className="p-2.5 bg-neutral-100 border border-ink/40 text-[10px] font-mono text-ink/80 flex items-center justify-between">
          <span>PIPELINE ENGINE</span>
          <span className="font-bold text-ink flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-mint border border-ink rounded-full" />
            OPERATIONAL
          </span>
        </div>
      </div>
    </div>
  );
}
