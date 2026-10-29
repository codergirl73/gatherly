"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./Avatar";
import { signOut, useUser } from "@/lib/client/auth";

export function Navbar() {
  const { user, ready } = useUser();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const links = [
    { href: "/plan", label: "Plan an event" },
    { href: "/events", label: "My events" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Gatherly home"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {ready && user ? (
            <div className="relative hidden md:block">
              <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}
                className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 transition hover:bg-surface-2">
                <Avatar name={user.name} size={28} />
                <span className="max-w-28 truncate text-sm font-medium">{user.name}</span>
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-60 rounded-2xl border border-border bg-surface p-2 shadow-xl" onMouseLeave={() => setMenu(false)}>
                  <div className="px-3 py-2"><div className="truncate text-sm font-semibold">{user.name}</div><div className="truncate text-xs text-muted">{user.email}</div></div>
                  <Link role="menuitem" href="/events" onClick={() => setMenu(false)} className="block rounded-xl px-3 py-2 text-sm hover:bg-surface-2">My events</Link>
                  <button role="menuitem" onClick={() => { setMenu(false); void signOut(); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-2">Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-medium hover:bg-surface-2 md:inline-block">Sign in</Link>
          )}
          <Link href="/plan" className="hidden rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-sm transition hover:opacity-90 sm:inline-block">
            Start planning
          </Link>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full border border-border bg-surface md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-bg px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-surface-2">{l.label}</Link>
            ))}
            {ready && user ? (
              <button onClick={() => { void signOut(); setOpen(false); }} className="rounded-xl px-3 py-3 text-left text-base font-medium hover:bg-surface-2">Sign out ({user.name})</button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-surface-2">Sign in</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
