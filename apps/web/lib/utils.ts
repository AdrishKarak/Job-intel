import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ApplicationStatus } from "@repo/shared-types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const statusColorMap: Record<
  ApplicationStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  DISCOVERED: {
    bg: "bg-paper",
    text: "text-ink",
    border: "border-ink",
    label: "Discovered",
  },
  SAVED: {
    bg: "bg-paper",
    text: "text-ink",
    border: "border-ink",
    label: "Saved",
  },
  APPLIED: {
    bg: "bg-pink",
    text: "text-ink",
    border: "border-ink",
    label: "Applied",
  },
  OA_RECEIVED: {
    bg: "bg-pink",
    text: "text-ink",
    border: "border-ink",
    label: "OA Received",
  },
  OA_CLEARED: {
    bg: "bg-pink",
    text: "text-ink",
    border: "border-ink",
    label: "OA Cleared",
  },
  INTERVIEW_SCHEDULED: {
    bg: "bg-sky",
    text: "text-ink",
    border: "border-ink",
    label: "Interview Scheduled",
  },
  INTERVIEW_CLEARED: {
    bg: "bg-sky",
    text: "text-ink",
    border: "border-ink",
    label: "Interview Cleared",
  },
  OFFER: {
    bg: "bg-mint",
    text: "text-ink",
    border: "border-ink",
    label: "Offer",
  },
  REJECTED: {
    bg: "bg-blush",
    text: "text-ink",
    border: "border-ink",
    label: "Rejected",
  },
  GHOSTED: {
    bg: "bg-blush",
    text: "text-ink",
    border: "border-ink",
    label: "Ghosted",
  },
};

/**
 * Formats a salary amount in Indian Rupees (₹ / Rs / LPA).
 * - >= 1,00,00,000 (1 Crore): e.g. "₹1.2 Cr"
 * - >= 1,00,000 (1 Lakh): e.g. "₹12 LPA" or "₹12.5 LPA"
 * - < 1,00,000: e.g. "₹85,000"
 */
export function formatSalaryInr(amount: number): string {
  if (amount >= 10_000_000) {
    const cr = amount / 10_000_000;
    return `₹${Number(cr.toFixed(2))} Cr`;
  }
  if (amount >= 100_000) {
    const lpa = amount / 100_000;
    return `₹${Number(lpa.toFixed(2))} LPA`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Formats a salary range in Indian Rupees (₹).
 * Examples:
 * - 1200000, 1800000 -> "₹12 - ₹18 LPA"
 * - 600000, null -> "From ₹6 LPA"
 * - null, 1500000 -> "Up to ₹15 LPA"
 * - 50000, 80000 -> "₹50,000 - ₹80,000"
 */
export function formatSalaryRangeInr(min?: number | null, max?: number | null): string {
  if (!min && !max) return "--";

  if (min && max) {
    if (min >= 10_000_000 && max >= 10_000_000) {
      return `₹${Number((min / 10_000_000).toFixed(2))} - ₹${Number((max / 10_000_000).toFixed(2))} Cr`;
    }
    if (min >= 100_000 || max >= 100_000) {
      const minStr = min ? `${Number((min / 100_000).toFixed(1))}` : "0";
      const maxStr = max ? `${Number((max / 100_000).toFixed(1))}` : "DOE";
      return `₹${minStr} - ₹${maxStr} LPA`;
    }
    return `₹${min.toLocaleString("en-IN")} - ₹${max.toLocaleString("en-IN")}`;
  }

  if (min) {
    if (min >= 10_000_000) return `From ₹${Number((min / 10_000_000).toFixed(2))} Cr`;
    if (min >= 100_000) return `From ₹${Number((min / 100_000).toFixed(1))} LPA`;
    return `From ₹${min.toLocaleString("en-IN")}`;
  }

  if (max) {
    if (max >= 10_000_000) return `Up to ₹${Number((max / 10_000_000).toFixed(2))} Cr`;
    if (max >= 100_000) return `Up to ₹${Number((max / 100_000).toFixed(1))} LPA`;
    return `Up to ₹${max.toLocaleString("en-IN")}`;
  }

  return "--";
}
