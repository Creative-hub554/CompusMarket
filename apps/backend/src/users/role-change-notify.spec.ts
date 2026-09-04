import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyRoleChange, renderNotice, type RoleChangeNotice } from "./role-change-notify";

const NOTICE: RoleChangeNotice = {
  actorId: "admin-1",
  actorEmail: "kim@x.io",
  targetName: "Sok",
  targetEmail: "sok@x.io",
  fromRole: "CUSTOMER",
  toRole: "BANNED",
  reason: "Fraudulent listings",
};

const fetchMock = vi.fn();

describe("role-change-notify", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("renders a readable message with target, roles, and reason", () => {
    expect(renderNotice(NOTICE)).toBe(
      "Role change: kim@x.io changed Sok (sok@x.io)\nCUSTOMER → BANNED\nReason: Fraudulent listings",
    );
  });

  it("omits the reason and target name when absent", () => {
    expect(renderNotice({ ...NOTICE, reason: null, targetName: undefined })).toBe(
      "Role change: kim@x.io changed sok@x.io\nCUSTOMER → BANNED",
    );
  });

  it("falls back to the actor id when the email is missing", () => {
    expect(renderNotice({ ...NOTICE, actorEmail: undefined })).toContain("user admin-1");
  });

  it("does nothing when no webhook is configured", async () => {
    await notifyRoleChange(NOTICE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts a Slack-style payload when SLACK_WEBHOOK_URL is set", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/x");

    await notifyRoleChange(NOTICE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/services/x");
    const body = JSON.parse(init.body as string);
    expect(body.text).toContain("CUSTOMER → BANNED");
    expect(body.text).toContain("kim@x.io changed Sok (sok@x.io)");
    expect(body.text).toContain("Reason: Fraudulent listings");
  });

  it("posts to the Telegram bot API when token and chat id are set", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:abc");
    vi.stubEnv("TELEGRAM_CHAT_ID", "-100999");

    await notifyRoleChange(NOTICE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    const body = JSON.parse(init.body as string);
    expect(body.chat_id).toBe("-100999");
    expect(body.text).toContain("Sok (sok@x.io)");
    expect(body.disable_web_page_preview).toBe(true);
  });

  it("posts to both channels when both are configured", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/x");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:abc");
    vi.stubEnv("TELEGRAM_CHAT_ID", "-100999");

    await notifyRoleChange(NOTICE);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never rejects when the webhook returns an error status", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/x");
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));

    await expect(notifyRoleChange(NOTICE)).resolves.toBeUndefined();
  });

  it("never rejects when the request itself fails", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/x");
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(notifyRoleChange(NOTICE)).resolves.toBeUndefined();
  });
});
