export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mm-logo-a" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BFE2D4" />
          <stop offset="0.55" stopColor="#7EBAA3" />
          <stop offset="1" stopColor="#8AA2B8" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="17" stroke="url(#mm-logo-a)" strokeOpacity="0.3" />
      <path
        d="M11 27.5 20 8l9 19.5M14.5 23h11M20 8v19.5"
        stroke="url(#mm-logo-a)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="8" r="2.4" fill="#9CCFB9" />
      <circle cx="11" cy="27.5" r="2.4" fill="#8AA2B8" />
      <circle cx="29" cy="27.5" r="2.4" fill="#7EBAA3" />
      <circle cx="20" cy="20" r="1.6" fill="#F1F2EF" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <span className="block font-display text-[18px] font-semibold tracking-[-0.015em] text-bright">
          MindMesh
        </span>
        <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
          Knowledge universe
        </span>
      </div>
    </div>
  );
}
