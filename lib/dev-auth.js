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
      shopsBySellerId: new Map(),
      paymentsByReference: new Map(),
      productsById: new Map(),
    };
  }

  return globalThis[STATE_KEY];
}

export function findDevelopmentUserByEmail(email) {
  return getState().usersByEmail.get(email) || null;
}

export function getDevelopmentUserById(userId) {
  return getState().usersById.get(userId) || null;
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

export function getDevelopmentShopForSeller(sellerId) {
  return getState().shopsBySellerId.get(sellerId) || null;
}

export function listDevelopmentShops() {
  return [...getState().shopsBySellerId.values()];
}

export function createDevelopmentShopForSeller(sellerId, shop) {
  const state = getState();
  if (state.shopsBySellerId.has(sellerId)) return null;

  const createdShop = { ...shop, _id: randomUUID(), ownerId: sellerId };
  state.shopsBySellerId.set(sellerId, createdShop);
  return createdShop;
}

export function updateDevelopmentShopForSeller(sellerId, updates) {
  const shop = getDevelopmentShopForSeller(sellerId);
  if (!shop) return null;
  Object.assign(shop, updates);
  return shop;
}

export function createDevelopmentPayment(payment) {
  const state = getState();
  if (state.paymentsByReference.has(payment.reference)) return null;
  state.paymentsByReference.set(payment.reference, payment);
  return payment;
}

export function getDevelopmentPayment(reference, userId) {
  const payment = getState().paymentsByReference.get(reference) || null;
  return payment && (!userId || payment.userId === userId) ? payment : null;
}

export function listDevelopmentPayments(statuses) {
  return [...getState().paymentsByReference.values()]
    .filter((payment) => statuses.includes(payment.status))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function updateDevelopmentPayment(reference, expectedStatus, updates) {
  const payment = getDevelopmentPayment(reference);
  if (!payment || payment.status !== expectedStatus) return null;
  Object.assign(payment, updates);
  return payment;
}

export function listDevelopmentProductsForShop(shopId) {
  return [...getState().productsById.values()].filter(
    (product) => product.shopId === shopId && product.isActive,
  );
}

export function createDevelopmentProduct(product) {
  const state = getState();
  const createdProduct = { ...product, _id: randomUUID() };
  state.productsById.set(createdProduct._id, createdProduct);
  return createdProduct;
}

export function getDevelopmentProductForSeller(productId, sellerId) {
  const product = getState().productsById.get(productId);
  return product?.ownerId === sellerId ? product : null;
}

export function updateDevelopmentProduct(productId, sellerId, updates) {
  const product = getDevelopmentProductForSeller(productId, sellerId);
  if (!product) return null;
  Object.assign(product, updates);
  return product;
}

export function deleteDevelopmentProduct(productId, sellerId) {
  const product = getDevelopmentProductForSeller(productId, sellerId);
  if (!product) return false;
  return getState().productsById.delete(productId);
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
