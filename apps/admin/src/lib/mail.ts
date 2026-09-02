import nodemailer from "nodemailer";

export type MailResult =
  | { delivered: true }
  | { delivered: false; reason: "no-config" | "error" };

export function isMailConfigured(): boolean {
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_FROM);
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<MailResult> {
  if (!isMailConfigured()) return { delivered: false, reason: "no-config" };

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: process.env.MAIL_SECURE === "true",
      auth:
        process.env.MAIL_USER && process.env.MAIL_PASS
          ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
          : undefined,
    });
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { delivered: true };
  } catch (e) {
    console.error("Email send failed", e);
    return { delivered: false, reason: "error" };
  }
}