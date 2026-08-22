import { EventEmitter } from "events";

// Shared, module-level singleton used to decouple notification creation (in the
// social module) from real-time delivery (in the chat gateway) without creating
// a circular dependency between the two modules.
export const notificationEvents = new EventEmitter();

export type NotificationCreatedEvent = {
  userId: string;
  actorId: string;
  kind: string;
  entityId: string | null;
  message: string | null;
  readAt: string | null;
  createdAt: string | Date;
  actor: { id: string; name: string | null; username: string | null; image: string | null };
};

export const NOTIFICATION_CREATED = "created";
