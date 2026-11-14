import { randomUUID } from "node:crypto";

const STATE_KEY = "__rsuMartDevelopmentAuth";

export function isDevelopmentAuthEnabled() {
  return process.env.NODE_ENV === "development";
}

function getState() {
  if (!isDevelopmentAuthEnabled()) {
    throw new Error("Temporary accounts are only available in development.");
  }

  if (!globalThis[STATE_KEY]) {
    globalThis[STATE_KEY] = {
      usersByEmail: new Map(),
      usersById: new Map(),
      sessions: new Map(),
      rateLimits: new Map(),
    };
  }

  return globalThis[STATE_KEY];
}

export function findDevelopmentUserByEmail(email) {
  return getState().usersByEmail.get(email) || null;
}

export function updateDevelopmentUser(userId, updates) {
  const state = getState();
  const user = state.usersById.get(userId);
  if (!user) return null;
  Object.assign(user, updates);
  return user;
}

export function activateDevelopmentSeller(userId) {
  return updateDevelopmentUser(userId, {
    sellerStatus: "paid",
    sellerTestMode: true,
    sellerPaidAt: new Date(),
  });
}

export function createDevelopmentUser(user) {
  const state = getState();
  if (state.usersByEmail.has(user.email)) return null;

  const createdUser = { ...user, _id: randomUUID() };
  state.usersByEmail.set(createdUser.email, createdUser);
  state.usersById.set(createdUser._id, createdUser);
  return createdUser;
}

export function createDevelopmentSession(tokenHash, userId, expiresAt) {
  getState().sessions.set(tokenHash, { userId, expiresAt });
}

export function deleteDevelopmentSession(tokenHash) {
  getState().sessions.delete(tokenHash);
}

export function getDevelopmentUserForSession(tokenHash, now = new Date()) {
  const state = getState();
  const session = state.sessions.get(tokenHash);
  if (!session) return null;
  if (session.expiresAt <= now) {
    state.sessions.delete(tokenHash);
    return null;
  }

  return state.usersById.get(session.userId) || null;
}

export function checkDevelopmentRateLimit(scope, identifier, limit, windowMs) {
  const state = getState();
  const key = `${scope}:${identifier}`;
  const now = Date.now();
  let record = state.rateLimits.get(key);

  if (!record || record.resetAt <= now) {
    record = { count: 0, resetAt: now + windowMs };
  }
  record.count += 1;
  state.rateLimits.set(key, record);
  return record.count <= limit;
}
