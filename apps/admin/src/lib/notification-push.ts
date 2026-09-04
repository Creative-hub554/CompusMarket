import { getApiBase } from "./backend";

export type NotificationPush = {
  userId: string;
  actorId: string;
  kind: string;
  message: string;
};

/**
 * Relays notification rows the admin app already inserted into the shared DB
 * to the backend, which resolves the actor and pushes the row to the
 * recipient's live sockets. Best-effort with a short timeout — when the token
 * or backend is unreachable the row still stands and the notification bell
 * picks it up on its next poll, exactly like the role-change alerts.
 */
export async function pushNotificationDeliveries(items: NotificationPush[]): Promise<void> {
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  if (!token || items.length === 0) return;

  const url = `${getApiBase()}/internal/notifications/deliver`;
  await Promise.allSettled(
    items.map(async (item) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      timer.unref?.();
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-token": token,
          },
          body: JSON.stringify(item),
          signal: controller.signal,
        });
        if (!res.ok) {
          console.error("notification relay failed", res.status);
        }
      } catch (err) {
        console.error("notification relay error", (err as Error).message);
      } finally {
        clearTimeout(timer);
      }
    }),
  );
}
