import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-2/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm text-muted">
            Group events planned around what everyone actually likes. Powered by Qloo&apos;s Taste AI and Gemini.
          </p>
        </div>
        <div className="flex gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Product</span>
            <Link href="/plan" className="text-muted hover:text-fg">Plan an event</Link>
            <Link href="/events" className="text-muted hover:text-fg">My events</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Good to know</span>
            <span className="max-w-52 text-muted">
              Example profiles are made up. Gatherly never books or pays for anything. Check hours and prices before you book.
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">© 2026 Gatherly · Taste data by Qloo</div>
    </footer>
  );
}
