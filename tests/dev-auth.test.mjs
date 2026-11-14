import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  checkDevelopmentRateLimit,
  createDevelopmentSession,
  createDevelopmentUser,
  deleteDevelopmentSession,
  findDevelopmentUserByEmail,
  getDevelopmentUserForSession,
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
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
