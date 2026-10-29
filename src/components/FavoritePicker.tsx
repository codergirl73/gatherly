"use client";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, type Category, type GroupInput } from "@/lib/schemas";
import type { Suggestion } from "@/lib/suggest";

export type Favorite = GroupInput["people"][number]["favorites"][number];

export const CATEGORY_EMOJI: Record<Category, string> = { film: "🎬", tv: "📺", music: "🎵", food: "🍽️", place: "📍", brand: "🏷️", book: "📖" };

/** Debounced Qloo typeahead. */
function useSuggestions(query: string) {
  const [state, setState] = useState<{ q: string; results: Suggestion[]; failed: boolean }>({ q: "", results: [], failed: false });
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const j = (await res.json()) as { results: Suggestion[] };
        setState({ q, results: j.results ?? [], failed: !res.ok });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState({ q, results: [], failed: true });
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);
  const q = query.trim();
  const settled = state.q === q;
  return { results: q.length >= 2 && settled ? state.results : [], loading: q.length >= 2 && !settled, failed: settled && state.failed };
}

export function FavoritePicker({ onPick, taken, disabled, placeholder }: { onPick: (f: Favorite) => void; taken: Set<string>; disabled?: boolean; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { results, loading, failed } = useSuggestions(q);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (s: Suggestion) => {
    onPick({ name: s.name, category: s.category, entityId: s.id, image: s.image, tags: s.tags });
    setQ("");
    setActive(0);
  };
  const addTyped = (category: Category) => {
    const name = q.trim();
    if (name) onPick({ name, category });
    setQ("");
  };
  const list = results.filter((r) => !taken.has(r.id));

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden>🔎</span>
        <input
          value={q}
          disabled={disabled}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); if (list[active]) pick(list[active]); }
            else if (e.key === "Escape") setOpen(false);
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls="fav-results"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder ?? "Search a film, artist, show, restaurant…"}
          className="w-full rounded-2xl border border-border bg-surface py-3.5 pl-11 pr-4 text-base outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-[var(--ring)] disabled:opacity-50"
        />
        {loading && <span className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />}
      </div>

      {open && q.trim().length >= 2 && (
        <div id="fav-results" role="listbox" className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          {list.map((s, i) => (
            <button key={s.id} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => pick(s)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${i === active ? "bg-brand-soft" : ""}`}>
              {s.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote Qloo thumbnails, hosts vary
                <img src={s.image} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg bg-surface-2 object-cover" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-2 text-xl">{CATEGORY_EMOJI[s.category]}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.name}</span>
                <span className="block truncate text-xs text-muted">{s.subtitle}</span>
              </span>
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">{CATEGORY_EMOJI[s.category]} {CATEGORY_LABELS[s.category]}</span>
            </button>
          ))}
          {!loading && list.length === 0 && <p className="px-4 py-3 text-sm text-muted">{failed ? "Search is unavailable right now. You can still add it as typed below." : `No matches for “${q.trim()}”.`}</p>}
          <div className="border-t border-border bg-surface-2/60 px-3 py-2.5">
            <p className="mb-1.5 text-xs text-muted">Not what you meant? Add “{q.trim()}” as typed:</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => addTyped(c)} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium transition hover:border-brand hover:text-brand">
                  {CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
