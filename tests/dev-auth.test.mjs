import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  activateDevelopmentSeller,
  checkDevelopmentRateLimit,
  createDevelopmentShopForSeller,
  createDevelopmentProduct,
  createDevelopmentSession,
  createDevelopmentUser,
  consumeDevelopmentPasswordReset,
  deleteDevelopmentProduct,
  deleteDevelopmentSession,
  deleteDevelopmentSessionsForUser,
  findDevelopmentUserByEmail,
  getDevelopmentPasswordReset,
  getDevelopmentProductForSeller,
  getDevelopmentUserForSession,
  getDevelopmentShopForSeller,
  incrementDevelopmentPasswordResetAttempts,
  listDevelopmentProductsForShop,
  listDevelopmentShops,
  setDevelopmentPasswordReset,
  updateDevelopmentProduct,
  updateDevelopmentShopForSeller,
} from "../lib/dev-auth.js";

test("temporary accounts and sessions work only in development", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const email = `${randomUUID()}@example.com`;
  const sessionHash = randomUUID();

  try {
    process.env.NODE_ENV = "development";

    const user = createDevelopmentUser({
      name: "Local Tester",
      email,
      passwordHash: "hashed-password",
      sellerStatus: "none",
    });

    assert.ok(user._id);
    assert.equal(findDevelopmentUserByEmail(email), user);
    assert.equal(createDevelopmentUser({ email }), null);
    assert.equal(activateDevelopmentSeller(user._id), user);
    assert.equal(user.sellerStatus, "paid");
    assert.ok(user.sellerPaidAt instanceof Date);

    const shop = createDevelopmentShopForSeller(user._id, { name: "Test Shop" });
    assert.equal(getDevelopmentShopForSeller(user._id), shop);
    assert.ok(listDevelopmentShops().includes(shop));
    assert.equal(createDevelopmentShopForSeller(user._id, { name: "Second Shop" }), null);
    assert.equal(
      updateDevelopmentShopForSeller(user._id, { name: "Updated Shop" }).name,
      "Updated Shop",
    );
    const product = createDevelopmentProduct({
      shopId: shop._id,
      ownerId: user._id,
      name: "Test product",
      isActive: true,
    });
    assert.equal(listDevelopmentProductsForShop(shop._id).length, 1);
    assert.equal(getDevelopmentProductForSeller(product._id, user._id), product);
    assert.equal(updateDevelopmentProduct(product._id, user._id, { name: "Updated product" }).name, "Updated product");
    assert.equal(deleteDevelopmentProduct(product._id, user._id), true);
    assert.equal(getDevelopmentProductForSeller(product._id, user._id), null);

    const expiresAt = new Date(Date.now() + 60_000);
    createDevelopmentSession(sessionHash, user._id, expiresAt);
    assert.equal(getDevelopmentUserForSession(sessionHash), user);
    assert.equal(
      getDevelopmentUserForSession(sessionHash, new Date(expiresAt.getTime() + 1)),
      null,
    );

    deleteDevelopmentSession(sessionHash);
    assert.equal(getDevelopmentUserForSession(sessionHash), null);
    assert.equal(checkDevelopmentRateLimit("test", email, 1, 60_000), true);
    assert.equal(checkDevelopmentRateLimit("test", email, 1, 60_000), false);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("temporary account storage refuses non-development environments", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    assert.throws(
      () => findDevelopmentUserByEmail("unused@example.com"),
      /only available in development/,
    );
    assert.throws(
      () => activateDevelopmentSeller("unused"),
      /only available in development/,
    );
    assert.throws(
      () => getDevelopmentShopForSeller("unused"),
      /only available in development/,
    );
    assert.throws(
      () => listDevelopmentShops(),
      /only available in development/,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("development password-reset codes expire, limit attempts, and are one-time", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const email = `${randomUUID()}@example.com`;
  const otherEmail = `${randomUUID()}@example.com`;
  const sessionHash = randomUUID();
  const otherSessionHash = randomUUID();

  try {
    process.env.NODE_ENV = "development";
    const user = createDevelopmentUser({ email, passwordHash: "old-hash" });
    const otherUser = createDevelopmentUser({ email: otherEmail, passwordHash: "other-hash" });
    const expiresAt = new Date(Date.now() + 60_000);
    const reset = { userId: user._id, codeHash: "hashed-code", attempts: 0, expiresAt };

    createDevelopmentSession(sessionHash, user._id, expiresAt);
    createDevelopmentSession(otherSessionHash, otherUser._id, expiresAt);
    setDevelopmentPasswordReset(email, reset);
    assert.equal(getDevelopmentPasswordReset(email), reset);
    assert.equal(incrementDevelopmentPasswordResetAttempts(email, 2).attempts, 1);
    assert.equal(incrementDevelopmentPasswordResetAttempts(email, 2).attempts, 2);
    assert.equal(incrementDevelopmentPasswordResetAttempts(email, 2), null);
    assert.equal(consumeDevelopmentPasswordReset(email, "wrong-hash"), null);
    assert.equal(consumeDevelopmentPasswordReset(email, "hashed-code"), reset);
    assert.equal(consumeDevelopmentPasswordReset(email, "hashed-code"), null);

    setDevelopmentPasswordReset(email, {
      ...reset,
      expiresAt: new Date(Date.now() - 1),
    });
    assert.equal(getDevelopmentPasswordReset(email), null);

    deleteDevelopmentSessionsForUser(user._id);
    assert.equal(getDevelopmentUserForSession(sessionHash), null);
    assert.equal(getDevelopmentUserForSession(otherSessionHash), otherUser);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
