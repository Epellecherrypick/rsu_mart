import { createHmac, timingSafeEqual } from "node:crypto";
import { getDatabase } from "./mongodb.js";

export const SELLER_FEE_KOBO = 500_000;

export function hasValidPaystackSignature(body, signature, secret) {
  if (!signature || !secret) return false;

  const expected = createHmac("sha512", secret).update(body).digest();
  let received;
  try {
    received = Buffer.from(signature, "hex");
  } catch {
    return false;
  }

  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function isExpectedSellerTransaction(transaction, reference) {
  return (
    transaction?.status === "success" &&
    transaction.amount === SELLER_FEE_KOBO &&
    transaction.currency === "NGN" &&
    transaction.reference === reference
  );
}

async function verifyTransaction(reference) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack is not configured.");

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  const result = await response.json();

  if (!response.ok || result.status !== true || !result.data) {
    throw new Error("Paystack could not verify the transaction.");
  }

  return result.data;
}

export async function confirmSellerPayment(reference, userId) {
  const database = await getDatabase();
  const query = { reference };
  if (userId) query.userId = userId;

  const payment = await database.collection("payments").findOne(query);
  if (!payment) return { state: "not_found" };
  if (payment.status === "paid") {
    await database.collection("users").updateOne(
      { _id: payment.userId },
      {
        $set: {
          sellerStatus: "paid",
          sellerPaidAt: payment.paidAt || new Date(),
        },
      },
    );
    return { state: "paid" };
  }
  if (
    payment.purpose !== "seller_onboarding" ||
    payment.amount !== SELLER_FEE_KOBO ||
    payment.currency !== "NGN" ||
    !["pending", "expired"].includes(payment.status)
  ) {
    return { state: "unconfirmed" };
  }

  const transaction = await verifyTransaction(reference);
  if (!isExpectedSellerTransaction(transaction, reference)) {
    return { state: "unconfirmed" };
  }

  const paidAt = new Date();
  const update = await database.collection("payments").updateOne(
    { _id: payment._id, status: { $in: ["pending", "expired"] } },
    {
      $set: {
        status: "paid",
        paidAt,
        paystackTransactionId: String(transaction.id),
        channel: transaction.channel || null,
      },
    },
  );
  const currentPayment =
    update.modifiedCount === 1
      ? null
      : await database.collection("payments").findOne({ _id: payment._id });

  if (update.modifiedCount === 1 || currentPayment?.status === "paid") {
    await database.collection("users").updateOne(
      { _id: payment.userId },
      { $set: { sellerStatus: "paid", sellerPaidAt: paidAt } },
    );
    return { state: "paid" };
  }

  return { state: "unconfirmed" };
}
