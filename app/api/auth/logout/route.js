import { NextResponse } from "next/server";
import {
  deleteSession,
  isSameOrigin,
  SESSION_COOKIE,
} from "../../../../lib/auth";

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  await deleteSession(token);

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
