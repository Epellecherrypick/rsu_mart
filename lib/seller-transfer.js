import { randomBytes } from "node:crypto";

export const SELLER_FEE_KOBO = 500_000;
export const SELLER_TRANSFER_EXPIRY_MS = 2 * 60 * 60 * 1000;

export function getSellerTransferAccount() {
  const bankName = process.env.SELLER_TRANSFER_BANK_NAME?.trim();
  const accountName = process.env.SELLER_TRANSFER_ACCOUNT_NAME?.trim();
  const accountNumber = process.env.SELLER_TRANSFER_ACCOUNT_NUMBER?.trim();
  if (!bankName || !accountName || !/^\d{10}$/.test(accountNumber || "")) return null;
  return { bankName, accountName, accountNumber };
}

export function createSellerTransferReference() {
  return `RSU-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function publicSellerPayment(payment) {
  if (!payment) return null;
  return {
    reference: payment.reference,
    purpose: payment.purpose,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    createdAt: payment.createdAt,
    expiresAt: payment.expiresAt,
    transferDetails: payment.transferDetails,
  };
}
