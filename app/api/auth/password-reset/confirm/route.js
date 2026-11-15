import bcrypt from "bcryptjs";
import { z } from "zod";
import { hashPassword, isSameOrigin } from "../../../../../lib/auth";
import {
  consumeDevelopmentPasswordReset,
  deleteDevelopmentSessionsForUser,
  findDevelopmentUserByEmail,
  incrementDevelopmentPasswordResetAttempts,
  isDevelopmentAuthEnabled,
  updateDevelopmentUser,
} from "../../../../../lib/dev-auth";
import { getDatabase } from "../../../../../lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "../../../../../lib/rate-limit";

const MAX_ATTEMPTS = 5;
const confirmationSchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(10).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must be 72 bytes or fewer.",
  ),
});

const invalidCodeResponse = () =>
  Response.json({ error: "That code is invalid or expired. Request a new code and try again." }, { status: 400 });

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

  const parsed = confirmationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Check your details." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  if (!(await checkRateLimit("password-reset-confirm", email, 10, 15 * 60 * 1000))) {
    return rateLimitedResponse();
  }

  let reset;
  let database;
  if (isDevelopmentAuthEnabled()) {
    reset = incrementDevelopmentPasswordResetAttempts(email, MAX_ATTEMPTS);
  } else {
    database = await getDatabase();
    reset = await database.collection("password_reset_codes").findOneAndUpdate(
      { email, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    );
  }

  if (!reset || !(await bcrypt.compare(parsed.data.code, reset.codeHash))) {
    return invalidCodeResponse();
  }

  if (isDevelopmentAuthEnabled()) {
    reset = consumeDevelopmentPasswordReset(email, reset.codeHash);
    if (!reset) return invalidCodeResponse();
  } else {
    const consumed = await database.collection("password_reset_codes").deleteOne({
      _id: reset._id,
      codeHash: reset.codeHash,
    });
    if (consumed.deletedCount !== 1) return invalidCodeResponse();
  }

  const passwordHash = await hashPassword(parsed.data.password);
  if (isDevelopmentAuthEnabled()) {
    const user = findDevelopmentUserByEmail(email);
    if (!user || user._id !== reset.userId) return invalidCodeResponse();
    updateDevelopmentUser(user._id, { passwordHash, passwordChangedAt: new Date() });
    deleteDevelopmentSessionsForUser(user._id);
  } else {
    const updated = await database.collection("users").updateOne(
      { _id: reset.userId, email },
      { $set: { passwordHash, passwordChangedAt: new Date() } },
    );
    if (updated.matchedCount !== 1) return invalidCodeResponse();
    await database.collection("sessions").deleteMany({ userId: reset.userId });
  }

  return Response.json({ success: true });
}
