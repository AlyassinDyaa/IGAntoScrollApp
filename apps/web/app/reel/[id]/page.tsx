import type { Metadata } from "next";
import { ReelViewer } from "./ReelViewer";

export const metadata: Metadata = { title: "Sent Reel" };

export default async function ReelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string }> }) {
  const { id } = await params;
  const { c } = await searchParams;
  return <ReelViewer messageId={id} conversationId={c ?? null} />;
}
