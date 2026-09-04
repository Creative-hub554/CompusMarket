import { Logger } from "@nestjs/common";

/**
 * Best-effort push of admin role changes to an ops channel (Slack incoming
 * webhook and/or a Telegram bot). Like the Clerk mirror, this must never fail
 * or delay the role change itself: senders swallow their own errors, log a
 * warning, and everything is awaited with a hard timeout.
 *
 * Configure via env:
 *   - SLACK_WEBHOOK_URL        → Slack incoming-webhook URL
 *   - TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID → Telegram bot chat
 * With neither set, notifyRoleChange is a no-op.
 */

export interface RoleChangeNotice {
  actorId: string;
  actorEmail?: string;
  targetName?: string;
  targetEmail: string;
  fromRole: string;
  toRole: string;
  reason?: string | null;
}

const MAX_TEXT = 4000;
const TIMEOUT_MS = 5000;

interface WebhookTarget {
  kind: "slack" | "telegram";
  url: string;
  chatId?: string;
}

function buildTargets(): WebhookTarget[] {
  const targets: WebhookTarget[] = [];

  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackUrl) targets.push({ kind: "slack", url: slackUrl });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) {
    targets.push({
      kind: "telegram",
      url: `https://api.telegram.org/bot${token}/sendMessage`,
      chatId,
    });
  }

  return targets;
}

export function renderNotice(n: RoleChangeNotice): string {
  const who = n.actorEmail ? n.actorEmail : `user ${n.actorId}`;
  const target = n.targetName ? `${n.targetName} (${n.targetEmail})` : n.targetEmail;
  const lines = [`Role change: ${who} changed ${target}`, `${n.fromRole} → ${n.toRole}`];
  if (n.reason) lines.push(`Reason: ${n.reason}`);
  return lines.join("\n").slice(0, MAX_TEXT);
}

async function postJson(target: WebhookTarget, text: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body =
      target.kind === "slack"
        ? JSON.stringify({ text })
        : JSON.stringify({ chat_id: target.chatId, text, disable_web_page_preview: true });
    const res = await fetch(target.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    await res.text(); // drain the response so the connection can be reused
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    Logger.warn(
      `Role-change webhook (${target.kind}) failed: ${(err as Error).message}`,
      "RoleChangeNotify",
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function notifyRoleChange(n: RoleChangeNotice): Promise<void> {
  const targets = buildTargets();
  if (targets.length === 0) return;
  const text = renderNotice(n);
  await Promise.all(targets.map((t) => postJson(t, text)));
}
