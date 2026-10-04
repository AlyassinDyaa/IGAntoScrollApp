import type { Metadata } from "next";
import { ThreadScreen } from "./ThreadScreen";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ThreadScreen conversationId={id} />;
}
