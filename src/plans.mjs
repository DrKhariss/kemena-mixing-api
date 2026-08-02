export const PLANS = {
  platinum: {
    id: "platinum",
    name: "Platinum",
    priceNgn: 2_000_000,
    tracks: "Unlimited",
    tracksAllowed: null,
    durationMonths: 4,
    duration: "4 months",
    features: ["Dolby Atmos included"],
  },
  gold: {
    id: "gold",
    name: "Gold",
    priceNgn: 500_000,
    tracks: 8,
    tracksAllowed: 8,
    durationMonths: 6,
    duration: "6 months",
    features: ["Stereo mixing & mastering"],
  },
  silver: {
    id: "silver",
    name: "Silver",
    priceNgn: 300_000,
    tracks: 6,
    tracksAllowed: 6,
    durationMonths: 3,
    duration: "3 months",
    features: ["Stereo mixing & mastering"],
  },
  monthly: {
    id: "monthly",
    name: "Monthly",
    priceNgn: 100_000,
    tracks: "3 per month",
    tracksAllowed: 3,
    durationMonths: 1,
    duration: "1 month",
    features: ["Most commonly used"],
  },
};

export function addMonths(isoDate, months) {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

export function makeReceiptCode(reference) {
  return `MS-${reference.replace(/^ms-/, "").slice(0, 8).toUpperCase()}`;
}

/**
 * Demo mode runs the whole subscription flow without charging anyone, so the
 * site is testable before real Paystack keys exist.
 */
export function isPaystackConfigured() {
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY;
  const secret = process.env.PAYSTACK_SECRET_KEY;
  return Boolean(
    publicKey &&
      secret &&
      !publicKey.includes("REPLACE_WITH") &&
      !secret.includes("REPLACE_WITH"),
  );
}

export async function verifyPaystack(reference) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || secret.includes("REPLACE_WITH")) {
    throw new Error("Paystack is not configured. Add PAYSTACK_SECRET_KEY to .env");
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const payload = await response.json();
  if (!payload.status) {
    throw new Error(payload.message || "Paystack verification failed");
  }

  return payload.data;
}

export function inferPlanId(amountNgn) {
  return Object.values(PLANS).find((plan) => plan.priceNgn === amountNgn)?.id;
}
