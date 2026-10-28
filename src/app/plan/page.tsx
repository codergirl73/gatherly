import type { Metadata } from "next";
import { GroupBuilder } from "@/components/GroupBuilder";

export const metadata: Metadata = { title: "Plan an event" };

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Plan an event</h1>
      <p className="mt-2 mb-8 text-muted">Tell us about the group. Qloo does the matching.</p>
      <GroupBuilder />
    </div>
  );
}
