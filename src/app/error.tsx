"use client";
import { ErrorState } from "@/components/ErrorState";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-4 py-20">
      <ErrorState kind="unknown" message="That page hit a snag. Please try again." onRetry={reset} />
    </div>
  );
}
