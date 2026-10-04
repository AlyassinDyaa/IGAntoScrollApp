import type { MetaClient, Paged } from "./client";

/**
 * Instagram Messaging via the Page-scoped conversations edge.
 * Group threads and arbitrary new conversations are intentionally not exposed;
 * the UI shows them as unsupported rather than pretending.
 */

export interface GraphConversation {
  id: string;
  updated_time: string;
  participants: { data: { id: string; username?: string; name?: string }[] };
  messages?: { data: { id: string; created_time: string; from: { id: string }; message?: string }[] };
}

export interface GraphMessage {
  id: string;
  created_time: string;
  from: { id: string; username?: string };
  to: { data: { id: string; username?: string }[] };
  message?: string;
  attachments?: { data: GraphAttachment[] };
  reactions?: { data: { reaction: string; users: { data: { id: string }[] } }[] };
  shares?: { data: { link?: string; name?: string }[] };
}

export interface GraphAttachment {
  id?: string;
  mime_type?: string;
  name?: string;
  image_data?: { url: string; preview_url?: string };
  video_data?: { url: string; preview_url?: string };
  file_url?: string;
}

export async function listConversations(
  client: MetaClient,
  pageId: string,
  pageToken: string,
  after?: string,
): Promise<Paged<GraphConversation>> {
  return client.get<Paged<GraphConversation>>(
    `${pageId}/conversations`,
    {
      platform: "instagram",
      fields: "id,updated_time,participants,messages.limit(1){id,created_time,from,message}",
      limit: 25,
      after,
    },
    pageToken,
  );
}

export async function listMessages(
  client: MetaClient,
  conversationId: string,
  pageToken: string,
  after?: string,
): Promise<Paged<GraphMessage>> {
  return client.get<Paged<GraphMessage>>(
    `${conversationId}/messages`,
    {
      fields: "id,created_time,from,to,message,attachments,shares,reactions",
      limit: 30,
      after,
    },
    pageToken,
  );
}

export async function sendTextMessage(
  client: MetaClient,
  igUserId: string,
  pageToken: string,
  recipientIgsid: string,
  text: string,
): Promise<{ recipient_id: string; message_id: string }> {
  return client.post(
    `${igUserId}/messages`,
    {
      recipient: JSON.stringify({ id: recipientIgsid }),
      message: JSON.stringify({ text }),
    },
    pageToken,
  );
}

export async function reactToMessage(
  client: MetaClient,
  igUserId: string,
  pageToken: string,
  recipientIgsid: string,
  messageId: string,
  emoji: string,
  action: "react" | "unreact",
): Promise<unknown> {
  return client.post(
    `${igUserId}/messages`,
    {
      recipient: JSON.stringify({ id: recipientIgsid }),
      sender_action: action,
      payload: JSON.stringify({ message_id: messageId, reaction: action === "react" ? emoji : undefined }),
    },
    pageToken,
  );
}

export async function sendImageMessage(
  client: MetaClient,
  igUserId: string,
  pageToken: string,
  recipientIgsid: string,
  imageUrl: string,
): Promise<{ recipient_id: string; message_id: string }> {
  return client.post(
    `${igUserId}/messages`,
    {
      recipient: JSON.stringify({ id: recipientIgsid }),
      message: JSON.stringify({ attachment: { type: "image", payload: { url: imageUrl } } }),
    },
    pageToken,
  );
}
