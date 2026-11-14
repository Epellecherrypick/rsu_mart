import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import {
  createDevelopmentSession,
  deleteDevelopmentSession,
  getDevelopmentUserForSession,
  isDevelopmentAuthEnabled,
} from "./dev-auth.js";
import { getDatabase } from "./mongodb.js";

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-rsu_session" : "rsu_session";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

const DUMMY_PASSWORD_HASH =
  "$2b$12$gVqnbJ6.pydE/MQHfrEQ/uHpVxi4Jr1f0cIpePL4O5oloO1BjRfg2";

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL) {
    return false;
  }

  try {
    const requestOrigin = new URL(request.url).origin;
    const allowedOrigins = [requestOrigin];
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      allowedOrigins.push(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    }

    return allowedOrigins.includes(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function publicUser(user) {
  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    sellerStatus: user.sellerStatus || "none",
    sellerTestMode: user.sellerTestMode === true,
    preferences: {
      categories: Array.isArray(user.preferences?.categories)
        ? user.preferences.categories
        : [],
      campusLocation: user.preferences?.campusLocation || "RSU campus",
    },
  };
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  if (isDevelopmentAuthEnabled()) {
    createDevelopmentSession(hashToken(token), userId.toString(), expiresAt);
    return { token, expiresAt };
  }

  const database = await getDatabase();

  await database.collection("sessions").insertOne({
    tokenHash: hashToken(token),
    userId,
    createdAt: new Date(),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function deleteSession(token) {
  if (!token) return;
  if (isDevelopmentAuthEnabled()) {
    deleteDevelopmentSession(hashToken(token));
    return;
  }

  const database = await getDatabase();
  await database.collection("sessions").deleteOne({ tokenHash: hashToken(token) });
}

export async function getUserForSession(token) {
  if (!token) return null;
  if (isDevelopmentAuthEnabled()) {
    return getDevelopmentUserForSession(hashToken(token));
  }

  const database = await getDatabase();
  const session = await database.collection("sessions").findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });

  if (!session || !(session.userId instanceof ObjectId)) return null;
  return database.collection("users").findOne({ _id: session.userId });
}

export async function getUserFromRequest(request) {
  return getUserForSession(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash || DUMMY_PASSWORD_HASH);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
