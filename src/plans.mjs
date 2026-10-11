export const PLANS = {
  platinum: {
    id: "platinum",
    name: "Platinum",
    priceNgn: 2_000_000,
    tracks: "Unlimited",
    stereoTracks: null,
    atmosTracks: null,
    tracksAllowed: null,
    durationMonths: 3,
    duration: "3 months",
    features: ["Unlimited stereo mixes", "Dolby Atmos included", "Best for labels with multiple artistes"],
  },
  gold: {
    id: "gold",
    name: "Gold",
    priceNgn: 500_000,
    tracks: "8 stereo · 3 Atmos",
    stereoTracks: 8,
    atmosTracks: 3,
    tracksAllowed: 11,
    durationMonths: 6,
    duration: "6 months",
    features: ["8 stereo tracks", "3 Dolby Atmos tracks"],
  },
  silver: {
    id: "silver",
    name: "Silver",
    priceNgn: 300_000,
    tracks: "6 stereo",
    stereoTracks: 6,
    atmosTracks: 0,
    tracksAllowed: 6,
    durationMonths: 3,
    duration: "3 months",
    features: ["6 stereo tracks", "No Dolby Atmos on this plan"],
  },
  basic: {
    id: "basic",
    name: "Basic",
    priceNgn: 100_000,
    tracks: "3 stereo / month",
    stereoTracks: 3,
    atmosTracks: 0,
    tracksAllowed: 3,
    durationMonths: 1,
    duration: "1 month",
    features: ["Three stereo mixes per month", "Flexible entry point"],
  },
};

/** Resolve plan; maps legacy `monthly` id → Basic. */
export function getPlan(planId) {
  if (!planId) return null;
  if (planId === "monthly") return PLANS.basic;
  return PLANS[planId] || null;
}

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
