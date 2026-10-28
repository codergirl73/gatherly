import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const base = "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50";
const variants = {
  primary: "bg-brand text-brand-fg shadow-sm hover:opacity-90",
  secondary: "border border-border bg-surface text-fg hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
};
const sizes = { md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base" };

type Opts = { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string };

export function Button({ variant = "primary", size = "md", className = "", ...p }: Opts & ComponentProps<"button">) {
  return <button {...p} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} />;
}
export function LinkButton({ variant = "primary", size = "md", className = "", ...p }: Opts & ComponentProps<typeof Link>) {
  return <Link {...p} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} />;
}

export function Card({ className = "", ...p }: ComponentProps<"div">) {
  return <div {...p} className={`rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6 ${className}`} />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "warn" | "good" }) {
  const t = {
    neutral: "bg-surface-2 text-muted",
    brand: "bg-brand-soft text-brand",
    warn: "bg-warn/15 text-warn",
    good: "bg-good/15 text-good",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${t}`}>{children}</span>;
}

export const inputCls =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-fg placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-4 focus:ring-[var(--ring)]";

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
