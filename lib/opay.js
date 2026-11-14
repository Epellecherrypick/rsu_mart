import { createHmac, timingSafeEqual } from "node:crypto";
import { getDatabase } from "./mongodb.js";

export const SELLER_FEE_KOBO = 500_000;

const OPAY_ENDPOINTS = {
  sandbox: "https://testapi.opaycheckout.com",
  live: "https://liveapi.opaycheckout.com",
};

export function getOpayConfig() {
  const mode = process.env.OPAY_MODE || "sandbox";
  const merchantId = process.env.OPAY_MERCHANT_ID;
  const publicKey = process.env.OPAY_PUBLIC_KEY;
  const secretKey = process.env.OPAY_SECRET_KEY;
  const endpoint = Object.hasOwn(OPAY_ENDPOINTS, mode) ? OPAY_ENDPOINTS[mode] : null;

  if (!endpoint || !merchantId || !publicKey || !secretKey) return null;
  return { endpoint, merchantId, publicKey, secretKey };
}

function hmac(algorithm, value, secret) {
  return createHmac(algorithm, secret).update(value).digest();
}

function hasValidHexSignature(value, signature, algorithm, secret) {
  if (typeof signature !== "string" || !/^[a-f\d]{128}$/i.test(signature)) {
    return false;
  }

  const expected = hmac(algorithm, value, secret);
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function hasValidOpayCallbackSignature(payload, signature, secret) {
  if (!payload || !secret) return false;
  const required = [
    payload.amount,
    payload.currency,
    payload.reference,
    payload.status,
    payload.timestamp,
    payload.transactionId,
  ];
  if (
    required.some((value) => typeof value !== "string" && typeof value !== "number") ||
    typeof payload.refunded !== "boolean"
  ) {
    return false;
  }

  const canonical = `{Amount:"${payload.amount}",Currency:"${payload.currency}",Reference:"${payload.reference}",Refunded:${payload.refunded ? "t" : "f"},Status:"${payload.status}",Timestamp:"${payload.timestamp}",Token:"${payload.token || ""}",TransactionID:"${payload.transactionId}"}`;
  return hasValidHexSignature(canonical, signature, "sha3-512", secret);
}

export function isExpectedOpayTransaction(transaction, reference) {
  return (
    transaction?.status === "SUCCESS" &&
    String(transaction.reference || "") === reference &&
    Number(transaction.amount?.total) === SELLER_FEE_KOBO &&
    transaction.amount?.currency === "NGN"
  );
}

async function requestOpay(path, body, config, authorization) {
  const response = await fetch(`${config.endpoint}${path}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      MerchantId: config.merchantId,
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("OPay returned an invalid response.");
  }

  if (!response.ok || result.code !== "00000" || !result.data) {
    throw new Error("OPay could not verify the transaction.");
  }
  return result.data;
}

export async function createOpayCashierPayment({ reference, returnUrl, callbackUrl, user }) {
  const config = getOpayConfig();
  if (!config) throw new Error("OPay is not configured.");

  const body = JSON.stringify({
    country: "NG",
    reference,
    amount: { total: SELLER_FEE_KOBO, currency: "NGN" },
    returnUrl,
    callbackUrl,
    cancelUrl: new URL("/seller?payment=cancelled", returnUrl).toString(),
    expireAt: 30,
    product: {
      name: "Seller onboarding",
      description: "One-time RSU Mart seller onboarding fee",
    },
    userInfo: {
      userEmail: user.email,
      userId: user._id.toString(),
      userName: user.name,
    },
  });

  const data = await requestOpay(
    "/api/v1/international/cashier/create",
    body,
    config,
    `Bearer ${config.publicKey}`,
  );
  let cashierUrl;
  try {
    cashierUrl = new URL(data.cashierUrl);
  } catch {
    throw new Error("OPay returned an invalid cashier URL.");
  }
  if (
    cashierUrl.protocol !== "https:" ||
    !cashierUrl.hostname.endsWith(".opaycheckout.com")
  ) {
    throw new Error("OPay returned an untrusted cashier URL.");
  }

  return cashierUrl.toString();
}

async function verifyTransaction(reference, config) {
  const body = JSON.stringify({ country: "NG", reference });
  const signature = hmac("sha512", body, config.secretKey).toString("hex");
  return requestOpay(
    "/api/v1/international/cashier/status",
    body,
    config,
    `Bearer ${signature}`,
  );
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

  const config = getOpayConfig();
  if (!config) throw new Error("OPay is not configured.");
  const transaction = await verifyTransaction(reference, config);
  if (!isExpectedOpayTransaction(transaction, reference)) {
    return { state: "unconfirmed" };
  }

  const paidAt = new Date();
  const update = await database.collection("payments").updateOne(
    { _id: payment._id, status: { $in: ["pending", "expired"] } },
    {
      $set: {
        status: "paid",
        paidAt,
        opayTransactionId: String(transaction.orderNo || ""),
        channel: transaction.channel || transaction.instrumentType || null,
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
