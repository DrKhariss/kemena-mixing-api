import { getPlan } from "../plans.mjs";
import { queueMail, sendMail } from "./client.mjs";
import {
  adminNewMixEmail,
  adminPaymentEmail,
  mixDeliveredEmail,
  mixInProgressEmail,
  mixRevisionEmail,
  mixSubmittedArtistEmail,
  passwordResetEmail,
  paymentReceiptEmail,
  subscriptionStatusEmail,
  welcomeEmail,
} from "./templates.mjs";
import { adminEmail, mixingPath } from "./urls.mjs";

async function deliver(to, template) {
  return sendMail({ to, ...template });
}

/** E1 */
export function notifyWelcome(user) {
  queueMail(() => deliver(user.email, welcomeEmail({ fullName: user.full_name })));
}

/** E2 + E8 — only when subscription newly activates */
export function notifyPaymentActivated({ user, sub, newlyActivated }) {
  if (!newlyActivated) return;

  const plan = getPlan(sub.plan_id);
  queueMail(async () => {
    await deliver(
      user.email,
      paymentReceiptEmail({
        fullName: user.full_name,
        planName: plan?.name || sub.plan_id,
        amountNgn: sub.amount_ngn,
        receiptCode: sub.receipt_code,
        reference: sub.paystack_reference,
        tracks: plan?.tracks,
        expiresAt: sub.expires_at,
        email: user.email,
        hasPassword: Boolean(user.password_hash),
      }),
    );
    await deliver(
      adminEmail(),
      adminPaymentEmail({
        fullName: user.full_name,
        email: user.email,
        planName: plan?.name || sub.plan_id,
        amountNgn: sub.amount_ngn,
        receiptCode: sub.receipt_code,
        reference: sub.paystack_reference,
      }),
    );
  });
}

/** E3 */
export function notifyPasswordReset(user, token) {
  const resetUrl = mixingPath(`/mixing/reset-password?token=${encodeURIComponent(token)}`);
  queueMail(() =>
    deliver(
      user.email,
      passwordResetEmail({
        fullName: user.full_name,
        resetUrl,
      }),
    ),
  );
}

/** E4 + E9 */
export function notifyMixSubmitted({ user, mix, sub }) {
  queueMail(async () => {
    await deliver(
      user.email,
      mixSubmittedArtistEmail({
        fullName: user.full_name,
        trackTitle: mix.title,
        genre: mix.genre,
        bpm: mix.bpm,
        musicalKey: mix.musical_key,
        stemLink: mix.stem_link,
      }),
    );
    await deliver(
      adminEmail(),
      adminNewMixEmail({
        fullName: user.full_name,
        email: user.email,
        trackTitle: mix.title,
        stemLink: mix.stem_link,
        planId: sub?.plan_id,
        tracksUsed: sub?.tracks_used,
        tracksAllowed: sub?.tracks_allowed,
      }),
    );
  });
}

/** E5 / E6 / E7 */
export function notifyMixStatusChange({ user, mix, status }) {
  queueMail(async () => {
    if (status === "in_progress") {
      await deliver(
        user.email,
        mixInProgressEmail({
          fullName: user.full_name,
          trackTitle: mix.title,
          genre: mix.genre,
          bpm: mix.bpm,
          musicalKey: mix.musical_key,
        }),
      );
      return;
    }
    if (status === "revision") {
      await deliver(
        user.email,
        mixRevisionEmail({
          fullName: user.full_name,
          trackTitle: mix.title,
          adminNotes: mix.admin_notes,
        }),
      );
      return;
    }
    if (status === "delivered") {
      await deliver(
        user.email,
        mixDeliveredEmail({
          fullName: user.full_name,
          trackTitle: mix.title,
          adminNotes: mix.admin_notes,
          deliveryLink: mix.delivery_link,
        }),
      );
    }
  });
}

/** E10 */
export function notifySubscriptionStatusChange({ user, planName, status }) {
  queueMail(() =>
    deliver(
      user.email,
      subscriptionStatusEmail({
        fullName: user.full_name,
        planName,
        status,
      }),
    ),
  );
}
