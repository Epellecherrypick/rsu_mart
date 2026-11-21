import { z } from "zod";
import { getUserFromRequest, isSameOrigin } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { inspectRequest, logSecurityEvent } from "../../../../lib/security";
import { clientIp, tokenReference } from "../../../../lib/tokens";
import { isDevelopmentAuthEnabled } from "../../../../lib/dev-auth";

const schema = z.object({
  tokens: z.number().int().min(100).max(1_000_000),
  paymentReference: z.string().trim().min(3).max(150),
});

export async function POST(request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const blocked = await inspectRequest(request, "token-request", `${clientIp(request)}:${user._id}`, 5, 15 * 60 * 1000);
  if (blocked) return blocked;
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Enter a valid token amount and payment reference." }, { status: 400 });

  const record = {
    reference: tokenReference("TOK"),
    userId: user._id,
    tokens: parsed.data.tokens,
    paymentReference: parsed.data.paymentReference,
    status: "pending",
    createdAt: new Date(),
  };
  if (isDevelopmentAuthEnabled()) {
    globalThis.__rsuMartDevelopmentAuth.tokenRequestsByReference.set(record.reference, record);
  } else {
    const database = await getDatabase();
    await database.collection("token_requests").insertOne(record);
  }
  await logSecurityEvent({ type: "token_request", userId: user._id.toString(), reference: record.reference, tokens: record.tokens });
  return Response.json({ request: { reference: record.reference, tokens: record.tokens, status: "pending", createdAt: record.createdAt } }, { status: 201 });
}
