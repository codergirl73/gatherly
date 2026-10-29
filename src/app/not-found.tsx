import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="text-6xl" aria-hidden>🧭</div>
      <h1 className="mt-4 font-display text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">That page doesn&apos;t exist, or it moved.</p>
      <div className="mt-6 flex gap-3"><LinkButton href="/">Go home</LinkButton><LinkButton href="/plan" variant="secondary">Plan an event</LinkButton></div>
    </div>
  );
}
