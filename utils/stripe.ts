import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY!,
    yearly: process.env.STRIPE_PRO_YEARLY!,
  },
  business: {
    monthly: process.env.STRIPE_BIZ_MONTHLY!,
    yearly: process.env.STRIPE_BIZ_YEARLY!,
  },
} as const;

// Storage quotas in bytes
export const STORAGE_QUOTAS = {
  free: 524_288_000,          // 500 MB
  pro: 10_737_418_240,        // 10 GB
  business_per_seat: 53_687_091_200, // 50 GB per seat
} as const;

export function priceIdToTier(priceId: string): "pro" | "business" | null {
  if (priceId === PRICE_IDS.pro.monthly || priceId === PRICE_IDS.pro.yearly) return "pro";
  if (priceId === PRICE_IDS.business.monthly || priceId === PRICE_IDS.business.yearly) return "business";
  return null;
}
