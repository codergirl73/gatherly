export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6d4aff" />
            <stop offset="1" stopColor="#ff6b4a" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#lg)" />
        <circle cx="12" cy="16" r="6" fill="none" stroke="#fff" strokeWidth="2.4" opacity=".95" />
        <circle cx="20" cy="16" r="6" fill="none" stroke="#fff" strokeWidth="2.4" opacity=".95" />
      </svg>
      Gatherly
    </span>
  );
}
