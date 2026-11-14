import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  createOpayCashierPayment,
  hasValidOpayCallbackSignature,
  isExpectedOpayTransaction,
  SELLER_FEE_KOBO,
} from "../lib/opay.js";

const callbackPayload = {
  amount: "500000",
  currency: "NGN",
  reference: "rsu_example",
  refunded: false,
  status: "SUCCESS",
  timestamp: "2026-11-14T07:00:00Z",
  token: "opay-token",
  transactionId: "opay-transaction",
};

function callbackSignature(payload, secret) {
  const canonical = `{Amount:"${payload.amount}",Currency:"${payload.currency}",Reference:"${payload.reference}",Refunded:${payload.refunded ? "t" : "f"},Status:"${payload.status}",Timestamp:"${payload.timestamp}",Token:"${payload.token || ""}",TransactionID:"${payload.transactionId}"}`;
  return createHmac("sha3-512", secret).update(canonical).digest("hex");
}

test("validates OPay callback signatures and rejects altered payloads", () => {
  const secret = "test-opay-secret";
  const signature = callbackSignature(callbackPayload, secret);

  assert.equal(hasValidOpayCallbackSignature(callbackPayload, signature, secret), true);
  assert.equal(
    hasValidOpayCallbackSignature(
      { ...callbackPayload, amount: "50000" },
      signature,
      secret,
    ),
    false,
  );
  assert.equal(hasValidOpayCallbackSignature(callbackPayload, "bad", secret), false);
  assert.equal(hasValidOpayCallbackSignature(callbackPayload, signature, ""), false);
});

test("accepts only the exact successful seller-onboarding transaction", () => {
  const transaction = {
    amount: { total: SELLER_FEE_KOBO, currency: "NGN" },
    reference: "rsu_example",
    status: "SUCCESS",
  };

  assert.equal(isExpectedOpayTransaction(transaction, "rsu_example"), true);
  assert.equal(
    isExpectedOpayTransaction(
      { ...transaction, amount: { total: 50_000, currency: "NGN" } },
      "rsu_example",
    ),
    false,
  );
  assert.equal(isExpectedOpayTransaction(transaction, "another_reference"), false);
  assert.equal(
    isExpectedOpayTransaction({ ...transaction, status: "PENDING" }, "rsu_example"),
    false,
  );
});

test("creates a sandbox cashier payment using the public key and validates its URL", async () => {
  const previous = {
    mode: process.env.OPAY_MODE,
    merchantId: process.env.OPAY_MERCHANT_ID,
    publicKey: process.env.OPAY_PUBLIC_KEY,
    secretKey: process.env.OPAY_SECRET_KEY,
    fetch: globalThis.fetch,
  };
  process.env.OPAY_MODE = "sandbox";
  process.env.OPAY_MERCHANT_ID = "merchant-id";
  process.env.OPAY_PUBLIC_KEY = "public-key";
  process.env.OPAY_SECRET_KEY = "secret-key";

  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestOptions = { url, ...options };
    return Response.json({
      code: "00000",
      data: { cashierUrl: "https://sandboxcashier.opaycheckout.com/checkout?id=test" },
    });
  };

  try {
    const cashierUrl = await createOpayCashierPayment({
      reference: "rsu_example",
      returnUrl: "https://shop.example.com/seller/payment/verify?reference=rsu_example",
      callbackUrl: "https://shop.example.com/api/webhooks/opay",
      user: { _id: "user-id", email: "seller@example.com", name: "Seller" },
    });

    assert.equal(cashierUrl, "https://sandboxcashier.opaycheckout.com/checkout?id=test");
    assert.equal(requestOptions.url, "https://testapi.opaycheckout.com/api/v1/international/cashier/create");
    assert.equal(requestOptions.headers.Authorization, "Bearer public-key");
    assert.equal(requestOptions.headers.MerchantId, "merchant-id");
    const body = JSON.parse(requestOptions.body);
    assert.deepEqual(body.amount, { total: SELLER_FEE_KOBO, currency: "NGN" });
    assert.equal(body.reference, "rsu_example");
    assert.equal(body.product.name, "Seller onboarding");
  } finally {
    if (previous.mode === undefined) delete process.env.OPAY_MODE;
    else process.env.OPAY_MODE = previous.mode;
    if (previous.merchantId === undefined) delete process.env.OPAY_MERCHANT_ID;
    else process.env.OPAY_MERCHANT_ID = previous.merchantId;
    if (previous.publicKey === undefined) delete process.env.OPAY_PUBLIC_KEY;
    else process.env.OPAY_PUBLIC_KEY = previous.publicKey;
    if (previous.secretKey === undefined) delete process.env.OPAY_SECRET_KEY;
    else process.env.OPAY_SECRET_KEY = previous.secretKey;
    globalThis.fetch = previous.fetch;
  }
});

test("rejects cashier URLs outside OPay HTTPS domains", async () => {
  const previous = {
    mode: process.env.OPAY_MODE,
    merchantId: process.env.OPAY_MERCHANT_ID,
    publicKey: process.env.OPAY_PUBLIC_KEY,
    secretKey: process.env.OPAY_SECRET_KEY,
    fetch: globalThis.fetch,
  };
  process.env.OPAY_MODE = "sandbox";
  process.env.OPAY_MERCHANT_ID = "merchant-id";
  process.env.OPAY_PUBLIC_KEY = "public-key";
  process.env.OPAY_SECRET_KEY = "secret-key";
  globalThis.fetch = async () =>
    Response.json({ code: "00000", data: { cashierUrl: "https://opaycheckout.com.evil.example/pay" } });

  try {
    await assert.rejects(
      createOpayCashierPayment({
        reference: "rsu_example",
        returnUrl: "https://shop.example.com/seller/payment/verify?reference=rsu_example",
        callbackUrl: "https://shop.example.com/api/webhooks/opay",
        user: { _id: "user-id", email: "seller@example.com", name: "Seller" },
      }),
      /untrusted cashier URL/,
    );
  } finally {
    if (previous.mode === undefined) delete process.env.OPAY_MODE;
    else process.env.OPAY_MODE = previous.mode;
    if (previous.merchantId === undefined) delete process.env.OPAY_MERCHANT_ID;
    else process.env.OPAY_MERCHANT_ID = previous.merchantId;
    if (previous.publicKey === undefined) delete process.env.OPAY_PUBLIC_KEY;
    else process.env.OPAY_PUBLIC_KEY = previous.publicKey;
    if (previous.secretKey === undefined) delete process.env.OPAY_SECRET_KEY;
    else process.env.OPAY_SECRET_KEY = previous.secretKey;
    globalThis.fetch = previous.fetch;
  }
});
