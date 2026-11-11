import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  hasValidPaystackSignature,
  isExpectedSellerTransaction,
  SELLER_FEE_KOBO,
} from "../lib/paystack.js";

test("accepts a valid Paystack webhook signature", () => {
  const body = '{"event":"charge.success","data":{"reference":"rsu_example"}}';
  const secret = "test-secret";
  const signature = createHmac("sha512", secret).update(body).digest("hex");

  assert.equal(hasValidPaystackSignature(body, signature, secret), true);
});

test("rejects altered, missing, or malformed webhook signatures", () => {
  const body = '{"event":"charge.success"}';
  const secret = "test-secret";
  const signature = createHmac("sha512", secret).update(body).digest("hex");

  assert.equal(hasValidPaystackSignature(`${body} `, signature, secret), false);
  assert.equal(hasValidPaystackSignature(body, "", secret), false);
  assert.equal(hasValidPaystackSignature(body, "not-a-signature", secret), false);
  assert.equal(hasValidPaystackSignature(body, signature, "wrong-secret"), false);
});

test("only accepts the exact seller fee, NGN currency, success status, and reference", () => {
  const transaction = {
    amount: SELLER_FEE_KOBO,
    currency: "NGN",
    reference: "rsu_example",
    status: "success",
  };

  assert.equal(isExpectedSellerTransaction(transaction, "rsu_example"), true);
  assert.equal(
    isExpectedSellerTransaction({ ...transaction, amount: 5_000 }, "rsu_example"),
    false,
  );
  assert.equal(
    isExpectedSellerTransaction({ ...transaction, currency: "USD" }, "rsu_example"),
    false,
  );
  assert.equal(
    isExpectedSellerTransaction({ ...transaction, status: "pending" }, "rsu_example"),
    false,
  );
  assert.equal(isExpectedSellerTransaction(transaction, "another_reference"), false);
});
