import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDatabase } from "./mongodb";
import { isDevelopmentAuthEnabled } from "./dev-auth";

export const SELLER_FEE_PERCENT = 5;
export const RECONCILIATION_DELAY_MS = 30 * 60 * 1000;

export function tokenReference(prefix) {
  return `${prefix}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function sellerAmountForPrice(priceTokens) {
  return Math.floor(priceTokens * (100 - SELLER_FEE_PERCENT) / 100);
}

export function discountedPriceTokens(product, buyerId) {
  const base = Number(product.priceKobo || 0) / 100;
  if (!Number.isFinite(base) || base <= 0) return 0;
  const discount = Number(product.discountPercent || 0);
  if (!discount) return Math.round(base);
  const isIndividual = product.discountType === "individual";
  if (isIndividual && String(product.discountUserId || "") !== String(buyerId || "")) return Math.round(base);
  if (product.discountEndsAt && new Date(product.discountEndsAt).getTime() <= Date.now()) return Math.round(base);
  return Math.max(1, Math.round(base * (100 - discount) / 100));
}

export function clientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}
