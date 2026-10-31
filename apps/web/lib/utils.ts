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
