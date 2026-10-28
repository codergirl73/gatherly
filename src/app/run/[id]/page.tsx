import type { Metadata } from "next";
import { RunClient } from "@/components/RunClient";

export const metadata: Metadata = { title: "Your event plan" };

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RunClient id={id} />;
}
