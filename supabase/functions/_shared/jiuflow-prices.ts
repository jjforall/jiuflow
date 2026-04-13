/**
 * Centralized Jiuflow Price ID configuration.
 * All subscription-related Edge Functions MUST import from here
 * instead of maintaining their own hardcoded lists.
 *
 * When adding a new plan, update ONLY this file.
 */

// ── Individual Price Constants ──────────────────────────────────
export const FOUNDER_PRICE_ID = "price_1SR3ZmDqLakc8NxkNdqL5BtO"; // ¥980/month (founder)
export const MONTHLY_PRICE_ID = "price_1SNQoeDqLakc8NxkEUVTTs3k"; // ¥2,900/month
export const ANNUAL_PRICE_ID = "price_1SNQoqDqLakc8NxkOaQIL8wX";  // ¥29,000/year
export const MURATABROS_PRICE_ID = "price_1SY2D0DqLakc8NxkMKonyIi8"; // ¥50,000 one-time
export const REFERRAL_PRICE_ID = "price_1SYK2lDqLakc8Nxkp6TBKYhT"; // Referral Plan
export const CAMPAIGN_PRICE_ID = "price_1SZ5O2DqLakc8Nxk0e6QYg6D"; // ¥1,900/month (campaign)
export const CAMPAIGN_ANNUAL_PRICE_ID = "price_1SZ5QxDqLakc8NxkAA1RTL3c"; // ¥19,000/year (campaign)
export const MURATABJJ_PRICE_ID = "price_1Sdu0rDqLakc8NxkBt73C3DL"; // ¥1,480/month (MURATABJJ)
export const MURATABJJ_REFERRAL_PRICE_ID = "price_1TE4ndDqLakc8NxkACHiR69G"; // ¥1,480/month (MURATABJJ/OVERLIMITSP referral)

// ── Master list used by check-subscription & list-subscriptions ─
export const JIUFLOW_PRICE_IDS: string[] = [
  FOUNDER_PRICE_ID,
  MONTHLY_PRICE_ID,
  ANNUAL_PRICE_ID,
  MURATABROS_PRICE_ID,
  REFERRAL_PRICE_ID,
  CAMPAIGN_PRICE_ID,
  CAMPAIGN_ANNUAL_PRICE_ID,
  MURATABJJ_PRICE_ID,
  MURATABJJ_REFERRAL_PRICE_ID,
];

// ── Display / plan metadata ──────────────────────────────────────
export const PRICE_DISPLAY_NAMES: Record<string, string> = {
  [FOUNDER_PRICE_ID]: "Founder Access (Legacy)",
  [MONTHLY_PRICE_ID]: "Monthly Plan",
  [ANNUAL_PRICE_ID]: "Annual Plan",
  [MURATABROS_PRICE_ID]: "Murata Bros Special Access",
  [REFERRAL_PRICE_ID]: "Referral Plan",
  [CAMPAIGN_PRICE_ID]: "Campaign Plan",
  [CAMPAIGN_ANNUAL_PRICE_ID]: "Campaign Annual Plan",
  [MURATABJJ_PRICE_ID]: "Founder Access 2026",
  [MURATABJJ_REFERRAL_PRICE_ID]: "Founder Access 2026",
};

export const PRICE_PLAN_TYPES: Record<string, string> = {
  [FOUNDER_PRICE_ID]: "founder_legacy",
  [MONTHLY_PRICE_ID]: "monthly",
  [ANNUAL_PRICE_ID]: "annual",
  [MURATABROS_PRICE_ID]: "muratabros",
  [REFERRAL_PRICE_ID]: "referral",
  [CAMPAIGN_PRICE_ID]: "campaign_monthly",
  [CAMPAIGN_ANNUAL_PRICE_ID]: "campaign_annual",
  [MURATABJJ_PRICE_ID]: "founder_2026",
  [MURATABJJ_REFERRAL_PRICE_ID]: "founder_2026",
};

// ── Checkout configuration ──────────────────────────────────────
export const ALLOWED_PRICES: Record<string, { trialDays: number; mode: string }> = {
  [FOUNDER_PRICE_ID]: { trialDays: 90, mode: "subscription" },  // Founder Access (Legacy) ¥980/month
  [CAMPAIGN_PRICE_ID]: { trialDays: 30, mode: "subscription" },
  [MONTHLY_PRICE_ID]: { trialDays: 30, mode: "subscription" },
  [ANNUAL_PRICE_ID]: { trialDays: 30, mode: "subscription" },
  [MURATABROS_PRICE_ID]: { trialDays: 0, mode: "payment" },
  [MURATABJJ_PRICE_ID]: { trialDays: 30, mode: "subscription" },
  [MURATABJJ_REFERRAL_PRICE_ID]: { trialDays: 30, mode: "subscription" },
};

// ── Referrer code overrides ─────────────────────────────────────
export const REFERRER_CODE_MAP: Record<string, { priceId: string; trialDays: number }> = {
  "MURATABJJ": { priceId: MURATABJJ_PRICE_ID, trialDays: 30 },
  "OVERLIMITSP": { priceId: MURATABJJ_PRICE_ID, trialDays: 30 },
  "YUKIBJJ": { priceId: FOUNDER_PRICE_ID, trialDays: 90 },
};
