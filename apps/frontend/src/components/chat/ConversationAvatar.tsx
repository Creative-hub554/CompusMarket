"use client";

import { Avatar } from "@/components/social/Avatar";
import { Users } from "lucide-react";
import { ChatPerson } from "./threadMeta";

/**
 * Conversation mark for group chats: up to two real member faces stacked at
 * opposite corners inside a surface-colored ring, so a group reads as people
 * rather than an icon. Falls back to the gold mark when there are no faces.
 */
export function ConversationAvatar({
  members,
  size = 48,
}: {
  members: ChatPerson[];
  size?: number;
}) {
  if (members.length === 0) {
    return (
      <span
        className="inline-block shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-gold-600"
        style={{ width: size, height: size, display: "inline-flex" }}
      >
        <Users size={Math.round(size * 0.45)} className="text-white" />
      </span>
    );
  }

  const pad = Math.max(2, Math.round(size * 0.07));
  const inner = Math.round(size * 0.58);
  const two = members.slice(0, 2);

  return (
    <span
      className="relative inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        padding: pad,
        background: "var(--surface)",
        boxShadow: "inset 0 0 0 1px var(--border-gold)",
      }}
    >
      {two.length === 1 ? (
        <span className="absolute" style={{ left: pad, top: pad }}>
          <Avatar user={two[0]} size={inner} />
        </span>
      ) : (
        <>
          <span className="absolute" style={{ left: pad, top: pad }}>
            <Avatar user={two[0]} size={inner} />
          </span>
          <span className="absolute" style={{ right: pad, bottom: pad }}>
            <Avatar user={two[1]} size={inner} />
          </span>
        </>
      )}
    </span>
  );
}
