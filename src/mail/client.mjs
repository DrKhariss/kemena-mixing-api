import { Resend } from "resend";

let resendClient = null;

function isMailConfigured() {
  const key = process.env.RESEND_API_KEY || "";
  return Boolean(key && !key.includes("REPLACE"));
}

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function mailFrom() {
  return process.env.MAIL_FROM || "Mid-Side Audio <onboarding@resend.dev>";
}

/**
 * Send HTML email. Never throws to callers — logs and returns { ok, demo?, error? }.
 * Demo mode (no RESEND_API_KEY): logs subject + to and returns ok.
 */
export async function sendMail({ to, subject, html }) {
  if (!to) {
    console.warn("[mail] skip: missing recipient", subject);
    return { ok: false, error: "missing_recipient" };
  }

  if (!isMailConfigured()) {
    console.info("[mail:demo]", { to, subject, from: mailFrom() });
    return { ok: true, demo: true };
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: mailFrom(),
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("[mail] Resend error:", error);
      return { ok: false, error };
    }

    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[mail] send failed:", err.message || err);
    return { ok: false, error: err.message || String(err) };
  }
}

/** Fire-and-forget wrapper so HTTP handlers never wait on / fail from mail. */
export function queueMail(sendPromiseFactory) {
  Promise.resolve()
    .then(() => sendPromiseFactory())
    .catch((err) => {
      console.error("[mail] queue error:", err.message || err);
    });
}

export { isMailConfigured, mailFrom };
