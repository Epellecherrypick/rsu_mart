import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSession,
  hashPassword,
  isSameOrigin,
  publicUser,
  SESSION_COOKIE,
  SESSION_DURATION_MS,
} from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "../../../../lib/rate-limit";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must be 72 bytes or fewer.",
  ),
});

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

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Check your details." },
      { status: 400 },
    );
  }

  const name = parsed.data.name;
  const email = parsed.data.email.toLowerCase();
  if (!(await checkRateLimit("register", email, 5, 24 * 60 * 60 * 1000))) {
    return rateLimitedResponse(24 * 60 * 60);
  }

  const database = await getDatabase();
  const passwordHash = await hashPassword(parsed.data.password);
  let user;

  try {
    const result = await database.collection("users").insertOne({
      name,
      email,
      passwordHash,
      sellerStatus: "none",
      createdAt: new Date(),
    });
    user = { _id: result.insertedId, name, email, sellerStatus: "none" };
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        { error: "An account with this email already exists. Sign in instead." },
        { status: 409 },
      );
    }
    throw error;
  }

  const session = await createSession(user._id);
  const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
  return response;
}
