import { renderEmailLayout, escapeHtml } from "./layout.mjs";
import { mixingPath } from "./urls.mjs";

function formatNgn(amount) {
  if (amount == null) return "—";
  return `₦${Number(amount).toLocaleString("en-NG")}`;
}

function truncate(value, max = 64) {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/** E1 — Welcome */
export function welcomeEmail({ fullName }) {
  return {
    subject: "Welcome to Mid-Side Audio",
    html: renderEmailLayout({
      preheader: "Next: terms, plan, payment",
      headline: "Welcome to Mid-Side Audio",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(fullName)} — your account is started.</p>
        <p style="margin:0;">Agree to terms, pick a plan, and pay securely with Paystack.</p>`,
      ctaLabel: "Continue signup",
      ctaUrl: mixingPath("/mixing/terms"),
    }),
  };
}

/** E2 — Payment receipt + create password */
export function paymentReceiptEmail({
  fullName,
  planName,
  amountNgn,
  receiptCode,
  reference,
  tracks,
  expiresAt,
  email,
  hasPassword,
}) {
  const setupUrl = mixingPath(
    `/mixing/setup-password?email=${encodeURIComponent(email)}&reference=${encodeURIComponent(reference)}`,
  );
  const accountUrl = mixingPath("/mixing/account");

  return {
    subject: `Payment confirmed — ${planName} · ${receiptCode}`,
    html: renderEmailLayout({
      preheader: `Receipt ${receiptCode}`,
      headline: "Payment confirmed",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(fullName)} — your <strong style="color:#fff;">${escapeHtml(planName)}</strong> plan is active (${escapeHtml(formatNgn(amountNgn))}).</p>
        <p style="margin:0;">${
          hasPassword
            ? "Open your account to submit mixes."
            : "Create a password to submit mixes in your account."
        }</p>`,
      metaRows: [
        { label: "Plan", value: planName },
        { label: "Amount", value: formatNgn(amountNgn) },
        { label: "Receipt", value: receiptCode },
        { label: "Reference", value: reference },
        { label: "Tracks", value: String(tracks ?? "—") },
        { label: "Expires", value: expiresAt ? new Date(expiresAt).toUTCString() : "—" },
      ],
      ctaLabel: hasPassword ? "Open account" : "Create your password",
      ctaUrl: hasPassword ? accountUrl : setupUrl,
    }),
  };
}

/** E3 — Password reset */
export function passwordResetEmail({ fullName, resetUrl }) {
  return {
    subject: "Reset your Mid-Side password",
    html: renderEmailLayout({
      preheader: "Link expires in 60 minutes",
      headline: "Reset your password",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(fullName || "there")} — use the button below to choose a new password.</p>
        <p style="margin:0;">This link expires in 60 minutes. If you didn’t ask for a reset, you can ignore this email.</p>`,
      ctaLabel: "Reset password",
      ctaUrl: resetUrl,
      footerNote: "Security notice — do not forward this email.",
    }),
  };
}

/** E4 — Mix submitted (artist) */
export function mixSubmittedArtistEmail({ fullName, trackTitle, genre, bpm, musicalKey, stemLink }) {
  return {
    subject: `We got your mix — ${trackTitle}`,
    html: renderEmailLayout({
      preheader: "Logged as submitted",
      headline: "We got your mix",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(fullName)} — <strong style="color:#fff;">${escapeHtml(trackTitle)}</strong> is logged as submitted.</p>
        <p style="margin:0;">We’ll email you when the desk starts work.</p>`,
      metaRows: [
        { label: "Title", value: trackTitle },
        { label: "Genre", value: genre || "—" },
        { label: "BPM", value: bpm || "—" },
        { label: "Key", value: musicalKey || "—" },
        { label: "Stems", value: truncate(stemLink, 72) },
      ],
      ctaLabel: "Open account",
      ctaUrl: mixingPath("/mixing/account"),
    }),
  };
}

/** E5 — In progress */
export function mixInProgressEmail({ fullName, trackTitle, genre, bpm, musicalKey }) {
  return {
    subject: `Mixing started — ${trackTitle}`,
    html: renderEmailLayout({
      preheader: "Your session is in progress",
      headline: "Mixing started",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(fullName)} — we started mixing <strong style="color:#fff;">${escapeHtml(trackTitle)}</strong>.</p>
        <p style="margin:0;">Your session is in progress.</p>`,
      metaRows: [
        { label: "Title", value: trackTitle },
        { label: "Status", value: "submitted → in progress" },
        { label: "Genre", value: genre || "—" },
        { label: "BPM", value: bpm || "—" },
        { label: "Key", value: musicalKey || "—" },
      ],
      ctaLabel: "Open account",
      ctaUrl: mixingPath("/mixing/account"),
    }),
  };
}

/** E6 — Revision requested */
export function mixRevisionEmail({ fullName, trackTitle, adminNotes }) {
  return {
    subject: `Revision needed — ${trackTitle}`,
    html: renderEmailLayout({
      preheader: "Studio notes waiting in your account",
      headline: "Revision needed",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(fullName)} — revision requested on <strong style="color:#fff;">${escapeHtml(trackTitle)}</strong>.</p>
        <p style="margin:0 0 12px;">Studio notes: ${escapeHtml(adminNotes || "See your account for details.")}</p>
        <p style="margin:0;">Edit the request while status is revision (max 2 revisions per terms).</p>`,
      ctaLabel: "Update mix",
      ctaUrl: mixingPath("/mixing/account"),
    }),
  };
}

/** E7 — Delivered */
export function mixDeliveredEmail({ fullName, trackTitle, adminNotes, deliveryLink }) {
  const ctaUrl = deliveryLink || mixingPath("/mixing/account");
  const ctaLabel = deliveryLink ? "Open delivery" : "View in account";
  return {
    subject: `Your mix is ready — ${trackTitle}`,
    html: renderEmailLayout({
      preheader: "Status: delivered",
      headline: "Your mix is ready",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(fullName)} — <strong style="color:#fff;">${escapeHtml(trackTitle)}</strong> has been delivered.</p>
        <p style="margin:0;">${adminNotes ? `Notes: ${escapeHtml(adminNotes)}` : "Open your account for delivery details."}</p>`,
      metaRows: [
        { label: "Status", value: "delivered" },
        ...(deliveryLink ? [{ label: "Delivery", value: truncate(deliveryLink, 72) }] : []),
      ],
      ctaLabel,
      ctaUrl,
      footerNote: "Up to 2 revisions per mix · Mid-Side Audio",
    }),
  };
}

/** E8 — Admin: payment */
export function adminPaymentEmail({ fullName, email, planName, amountNgn, receiptCode, reference }) {
  return {
    subject: `[Desk] New subscription — ${fullName} · ${planName}`,
    html: renderEmailLayout({
      preheader: "New paid subscription",
      headline: "New subscription",
      bodyHtml: `<p style="margin:0;">A subscription just activated.</p>`,
      metaRows: [
        { label: "Artist", value: fullName },
        { label: "Email", value: email },
        { label: "Plan", value: planName },
        { label: "Amount", value: formatNgn(amountNgn) },
        { label: "Receipt", value: receiptCode },
        { label: "Reference", value: reference },
      ],
      ctaLabel: "Open admin",
      ctaUrl: mixingPath("/mixing/admin"),
      footerNote: "Internal alert — do not forward to clients.",
    }),
  };
}

/** E9 — Admin: new mix */
export function adminNewMixEmail({
  fullName,
  email,
  trackTitle,
  stemLink,
  planId,
  tracksUsed,
  tracksAllowed,
}) {
  const tracksLabel =
    tracksAllowed == null ? `${tracksUsed} / Unlimited` : `${tracksUsed} / ${tracksAllowed}`;

  return {
    subject: `[Desk] New mix — ${trackTitle} · ${fullName}`,
    html: renderEmailLayout({
      preheader: "New mix submitted",
      headline: "New mix submitted",
      bodyHtml: `<p style="margin:0;">A subscriber submitted a new mix request.</p>`,
      metaRows: [
        { label: "Artist", value: fullName },
        { label: "Email", value: email },
        { label: "Title", value: trackTitle },
        { label: "Stem link", value: truncate(stemLink, 80) },
        { label: "Plan", value: planId || "—" },
        { label: "Tracks used", value: tracksLabel },
      ],
      ctaLabel: "Open admin desk",
      ctaUrl: mixingPath("/mixing/admin"),
      footerNote: "Internal alert — do not forward to clients.",
    }),
  };
}

/** E10 — Access / subscription notice */
export function subscriptionStatusEmail({ fullName, planName, status }) {
  return {
    subject: "Subscription update — Mid-Side Audio",
    html: renderEmailLayout({
      preheader: `Plan is now ${status}`,
      headline: "Subscription update",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(fullName)} — your ${escapeHtml(planName || "plan")} is now <strong style="color:#fff;">${escapeHtml(status)}</strong>.</p>
        <p style="margin:0;">Contact the studio if this looks unexpected.</p>`,
      ctaLabel: "Open account",
      ctaUrl: mixingPath("/mixing/account"),
    }),
  };
}
