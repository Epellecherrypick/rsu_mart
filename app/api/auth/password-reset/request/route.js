import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isSameOrigin } from "../../../../../lib/auth";
import {
  deleteDevelopmentPasswordReset,
  findDevelopmentUserByEmail,
  isDevelopmentAuthEnabled,
  setDevelopmentPasswordReset,
} from "../../../../../lib/dev-auth";
import { getDatabase } from "../../../../../lib/mongodb";
import { sendPasswordResetEmail } from "../../../../../lib/password-reset-email";
import { checkRateLimit, rateLimitedResponse } from "../../../../../lib/rate-limit";

const requestSchema = z.object({
  email: z.string().trim().email().max(254),
});

const responseMessage = "If an account exists for that email, we’ll send a reset code shortly.";
const codeDurationMs = 10 * 60 * 1000;

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  if (!(await checkRateLimit("password-reset-request", email, 3, 15 * 60 * 1000))) {
    return rateLimitedResponse();
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  let user;
  let database;
  if (isDevelopmentAuthEnabled()) {
    user = findDevelopmentUserByEmail(email);
  } else {
    database = await getDatabase();
    user = await database.collection("users").findOne({ email });
  }

  if (!user) return Response.json({ message: responseMessage });

  const reset = {
    email,
    userId: user._id,
    codeHash,
    attempts: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + codeDurationMs),
  };

  if (isDevelopmentAuthEnabled()) {
    setDevelopmentPasswordReset(email, reset);
  } else {
    const resetCodes = database.collection("password_reset_codes");
    try {
      await resetCodes.updateOne({ email }, { $set: reset }, { upsert: true });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      await resetCodes.updateOne({ email }, { $set: reset });
    }
  }

  try {
    await sendPasswordResetEmail(email, code);
  } catch (error) {
    console.error("Password reset email delivery failed:", error?.message || error);
    if (isDevelopmentAuthEnabled()) {
      deleteDevelopmentPasswordReset(email, codeHash);
    } else {
      await database.collection("password_reset_codes").deleteOne({ email, codeHash });
    }
  }

  return Response.json({ message: responseMessage });
}
