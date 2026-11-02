"use client";

import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Custom Animated Website Brand Logo for JobIntel
 * Features an industrial neobrutalist radar reticle, sweeping telemetry beam,
 * and pulsating core signal node.
 */
export function JobIntelLogo({
  size = 32,
  className = "",
  animated = true,
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Neo-brutalist hard shadow */}
      <rect x="5" y="5" width="40" height="40" fill="#141414" rx="2" />
      {/* Main badge frame */}
      <rect
        x="3"
        y="3"
        width="40"
        height="40"
        fill="#B6F2C4"
        stroke="#141414"
        strokeWidth="2.5"
        rx="2"
      />

      {/* Crosshair grid lines */}
      <line x1="23" y1="7" x2="23" y2="39" stroke="#141414" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
      <line x1="7" y1="23" x2="39" y2="23" stroke="#141414" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />

      {/* Radar concentric rings */}
      <circle cx="23" cy="23" r="14" stroke="#141414" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
      <circle cx="23" cy="23" r="8" stroke="#141414" strokeWidth="1.5" />

      {/* Sweeping radar beam with animation */}
      <g className={animated ? "origin-[23px_23px] animate-[spin_4s_linear_infinite]" : ""}>
        <path
          d="M23 23 L37 23 A14 14 0 0 0 32.9 13.1 Z"
          fill="#141414"
          fillOpacity="0.25"
        />
        <line x1="23" y1="23" x2="37" y2="23" stroke="#141414" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Corner bracket accents (Neobrutalist Target HUD) */}
      <path d="M7 11 V7 H11" stroke="#141414" strokeWidth="2.5" strokeLinecap="square" />
      <path d="M39 11 V7 H35" stroke="#141414" strokeWidth="2.5" strokeLinecap="square" />
      <path d="M7 35 V39 H11" stroke="#141414" strokeWidth="2.5" strokeLinecap="square" />
      <path d="M39 35 V39 H35" stroke="#141414" strokeWidth="2.5" strokeLinecap="square" />

      {/* Central pulsating core diamond */}
      <rect
        x="20"
        y="20"
        width="6"
        height="6"
        transform="rotate(45 23 23)"
        fill="#141414"
        stroke="#B6F2C4"
        strokeWidth="1.5"
        className={animated ? "animate-pulse" : ""}
      />

      {/* Active telemetry signal beacon */}
      <circle cx="33" cy="13" r="2.5" fill="#FFB4D8" stroke="#141414" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Custom Hand-crafted Dashboard Icon
 * Architectural bento metrics grid with live telemetry node
 */
export function CustomDashboardIcon({
  size = 20,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Top Left Major Block */}
      <rect x="2.5" y="2.5" width="8" height="10" rx="1" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
      <line x1="5" y1="5.5" x2="8.5" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="8.5" x2="7" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

      {/* Top Right Analytics Block */}
      <rect x="13.5" y="2.5" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="5.5" r="1.5" fill="currentColor" />

      {/* Bottom Left Status Block */}
      <rect x="2.5" y="15.5" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />

      {/* Bottom Right Pipeline Block with Active Pulse */}
      <rect x="13.5" y="11.5" width="8" height="10" rx="1" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 17.5 L17.5 15.5 L19.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Custom Hand-crafted Jobs CRM Icon
 * Industrial mechanical dossier / dispatch briefcase with tracking badge
 */
export function CustomJobsIcon({
  size = 20,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Handle */}
      <path d="M8 6 V4 A1 1 0 0 1 9 3 H15 A1 1 0 0 1 16 4 V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      
      {/* Main briefcase body */}
      <rect x="2.5" y="6" width="19" height="15" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
      
      {/* Heavy industrial cross seam */}
      <line x1="2.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.75" />
      
      {/* Center lock latch with badge */}
      <rect x="10" y="10.5" width="4" height="3" rx="0.5" fill="currentColor" />
      
      {/* Side reinforcement rivets */}
      <circle cx="5.5" cy="9" r="0.75" fill="currentColor" />
      <circle cx="18.5" cy="9" r="0.75" fill="currentColor" />
      <circle cx="5.5" cy="18" r="0.75" fill="currentColor" />
      <circle cx="18.5" cy="18" r="0.75" fill="currentColor" />
    </svg>
  );
}

/**
 * Custom Hand-crafted Profile Icon
 * Biometric security passport ID with reticle and fingerprint lines
 */
export function CustomProfileIcon({
  size = 20,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Outer ID Badge Card */}
      <rect x="3" y="2.5" width="18" height="19" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
      
      {/* Lanyard Clip Slot */}
      <rect x="9.5" y="4" width="5" height="1.5" rx="0.5" fill="currentColor" />

      {/* Avatar Silhouette */}
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
      <path d="M6.5 18 C6.5 15.5 8.9 14 12 14 C15.1 14 17.5 15.5 17.5 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* Corner verified tick */}
      <circle cx="17.5" cy="7.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Custom Radar Sweep Polling Icon
 * Used for "Sync Discovery" with rotating scan sweep
 */
export function CustomRadarIcon({
  size = 18,
  className = "",
  animated = false,
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Concentric Signal Rings */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.3" strokeDasharray="3 2" />
      <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.75" opacity="0.6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />

      {/* Sweep hand */}
      <g className={animated ? "origin-[12px_12px] animate-spin" : ""}>
        <line x1="12" y1="12" x2="20" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="8" r="1.5" fill="currentColor" />
      </g>
    </svg>
  );
}

/**
 * Custom India Tech Hubs Badge Icon
 * Neobrutalist Indian Flag with geometric Ashoka Chakra spokes
 */
export function CustomIndiaIcon({
  size = 18,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Rounded flag shield */}
      <rect x="2" y="3.5" width="20" height="17" rx="2" fill="#FFFFFF" stroke="#141414" strokeWidth="2" />
      
      {/* Saffron Top Stripe */}
      <path d="M2 5.5 C2 4.4 2.9 3.5 4 3.5 H20 C21.1 3.5 22 4.4 22 5.5 V9 H2 Z" fill="#FF9933" />
      
      {/* Green Bottom Stripe */}
      <path d="M2 15 H22 V18.5 C22 19.6 21.1 20.5 20 20.5 H4 C2.9 20.5 2 19.6 2 18.5 Z" fill="#138808" />

      {/* Ashoka Chakra */}
      <circle cx="12" cy="12" r="2.5" stroke="#000080" strokeWidth="1.2" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="0.75" fill="#000080" />
      {/* Spokes */}
      <line x1="12" y1="9.75" x2="12" y2="14.25" stroke="#000080" strokeWidth="0.8" />
      <line x1="9.75" y1="12" x2="14.25" y2="12" stroke="#000080" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Custom Remote Coordinate Globe Icon
 * Geometric latitude / longitude globe with orbital node
 */
export function CustomGlobeIcon({
  size = 18,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Outer globe ring */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.08" />
      
      {/* Equator & Meridian */}
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.75" />
      <ellipse cx="12" cy="12" rx="4.5" ry="9" stroke="currentColor" strokeWidth="1.5" />

      {/* Orbital Satellite Node */}
      <circle cx="18" cy="6" r="2" fill="#9ED8FF" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Custom AI Sparkle / Intelligence Star Icon
 * 8-point geometric faceted star with high-impact neobrutalist stroke
 */
export function CustomSparkleIcon({
  size = 18,
  className = "",
  animated = false,
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animated ? "animate-[pulse_2s_ease-in-out_infinite]" : ""} ${className}`}
      {...props}
    >
      <path
        d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="19" cy="5" r="1.25" fill="currentColor" />
      <circle cx="5" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Custom Excel Sheet Export Icon
 * Neobrutalist spreadsheet with download arrow
 */
export function CustomExcelIcon({
  size = 18,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Sheet Frame */}
      <rect x="3.5" y="2.5" width="17" height="19" rx="1.5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2" />
      {/* Header Accent Bar */}
      <path d="M3.5 4 C3.5 3.2 4.2 2.5 5 2.5 H19 C19.8 2.5 20.5 3.2 20.5 4 V7.5 H3.5 Z" fill="#B6F2C4" stroke="currentColor" strokeWidth="1.5" />
      {/* Grid cells */}
      <line x1="3.5" y1="12" x2="20.5" y2="12" stroke="currentColor" strokeWidth="1.2" />
      <line x1="3.5" y1="16.5" x2="20.5" y2="16.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="12" y1="7.5" x2="12" y2="21.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * Custom Neobrutalist Hamburger & Close Toggle
 * Fluidly morphs between three industrial bars and a sharp X
 */
export function CustomMenuToggle({
  isOpen,
  size = 24,
  className = "",
  ...props
}: {
  isOpen: boolean;
  size?: number;
  className?: string;
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform duration-200 ${className}`}
      {...props}
    >
      {isOpen ? (
        <>
          <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="19.5" y1="4.5" x2="4.5" y2="19.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
        </>
      ) : (
        <>
          <line x1="3" y1="5.5" x2="21" y2="5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="3" y1="18.5" x2="15" y2="18.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
        </>
      )}
    </svg>
  );
}
