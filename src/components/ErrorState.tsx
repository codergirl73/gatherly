import { Button, LinkButton } from "./ui";

const COPY: Record<string, { icon: string; title: string }> = {
  rate_limited: { icon: "⏳", title: "We're a little busy" },
  unavailable: { icon: "🔌", title: "Can't reach the taste engine" },
  no_matches: { icon: "🔍", title: "We couldn't match your favorites" },
  config: { icon: "🛠️", title: "Gatherly isn't fully set up" },
  unknown: { icon: "😵", title: "Something went wrong" },
};

export function ErrorState({ kind, message, onRetry }: { kind: string; message: string; onRetry?: () => void }) {
  const c = COPY[kind] ?? COPY.unknown;
  return (
    <div role="alert" className="mx-auto max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
      <div className="text-5xl" aria-hidden>{c.icon}</div>
      <h2 className="mt-4 font-display text-2xl font-semibold">{c.title}</h2>
      <p className="mt-2 text-muted">{message}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        <LinkButton href="/plan" variant="secondary">Edit the group</LinkButton>
      </div>
    </div>
  );
}
