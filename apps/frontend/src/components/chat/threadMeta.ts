export type ChatPerson = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

export type ThreadSummary = {
  id: string;
  /** DM = 1:1, GROUP_CHAT = personal conversation (3+ people), GROUP = community group. */
  kind: "DM" | "GROUP_CHAT" | "GROUP";
  product: { id: string; name: string; price: unknown; images: unknown } | null;
  group: { id: string; name: string } | null;
  /** Everyone except the viewer. */
  participants: ChatPerson[];
  participantCount?: number;
  lastMessage: { id: string; content: string; senderId: string; createdAt: string } | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export function chatPersonName(p: ChatPerson | null | undefined): string {
  return p?.name || p?.username || "Unknown";
}

export function isGroupish(kind: string | undefined): boolean {
  return kind === "GROUP_CHAT" || kind === "GROUP";
}

/** People in this thread besides the viewer. */
export function memberCount(thread: Pick<ThreadSummary, "participantCount" | "participants">): number {
  return thread.participantCount ?? thread.participants.length + 1;
}

/** Display title: group name, or up to two other names + " +N more". */
export function conversationTitle(thread: {
  group: { id: string; name: string } | null;
  participants: ChatPerson[];
}): string {
  if (thread.group) return thread.group.name;
  const names = thread.participants.map(chatPersonName);
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}
