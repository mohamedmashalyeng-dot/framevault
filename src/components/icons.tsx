import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export const ArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const ArrowUpRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 17L17 7M8 7h9v9" />
  </svg>
);
export const Search = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4-4" />
  </svg>
);
export const Lock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 018 0v3" />
  </svg>
);
export const Check = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const Copy = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5" />
  </svg>
);
export const Download = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
  </svg>
);
export const Heart = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20s-7.5-4.4-7.5-10A4.5 4.5 0 0112 7a4.5 4.5 0 017.5 3c0 5.6-7.5 10-7.5 10z" />
  </svg>
);
export const Monitor = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
    <path d="M9 20h6M12 16.5V20" />
  </svg>
);
export const Tablet = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M11 18h2" />
  </svg>
);
export const Phone = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="7" y="3" width="10" height="18" rx="2" />
    <path d="M11 18h2" />
  </svg>
);
export const Play = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 5.5v13l10-6.5-10-6.5z" />
  </svg>
);
export const Close = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Menu = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const Spinner = (p: IconProps) => (
  <svg {...base(p)} className={`animate-spin ${p.className ?? ""}`}>
    <path d="M12 3a9 9 0 109 9" />
  </svg>
);
export const FileCode = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 3.5H7A1.5 1.5 0 005.5 5v14A1.5 1.5 0 007 20.5h10a1.5 1.5 0 001.5-1.5V8L14 3.5z" />
    <path d="M14 3.5V8h4.5M10 12l-2 2 2 2M14 12l2 2-2 2" />
  </svg>
);
export const Sparkle = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5zM18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
  </svg>
);
export const Eye = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);
