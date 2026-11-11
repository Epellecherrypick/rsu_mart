import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSession,
  isSameOrigin,
  publicUser,
  SESSION_COOKIE,
  SESSION_DURATION_MS,
  verifyPassword,
} from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "../../../../lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Invalid email or password.",
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  if (!(await checkRateLimit("login", email, 10, 15 * 60 * 1000))) {
    return rateLimitedResponse();
  }

  const database = await getDatabase();
  const user = await database.collection("users").findOne({ email });
  const passwordMatches = await verifyPassword(
    parsed.data.password,
    user?.passwordHash,
  );

  if (!user || !passwordMatches) {
    return Response.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const session = await createSession(user._id);
  const response = NextResponse.json({ user: publicUser(user) });
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
