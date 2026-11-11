import { createHash } from "node:crypto";
import { getDatabase } from "./mongodb";

export async function checkRateLimit(scope, identifier, limit, windowMs) {
  const key = createHash("sha256")
    .update(`${scope}:${identifier}`)
    .digest("hex");
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const database = await getDatabase();
  const record = await database.collection("rate_limits").findOneAndUpdate(
    { _id: key },
    [
      {
        $set: {
          count: {
            $cond: [
              { $gt: ["$resetAt", now] },
              { $add: [{ $ifNull: ["$count", 0] }, 1] },
              1,
            ],
          },
          resetAt: {
            $cond: [{ $gt: ["$resetAt", now] }, "$resetAt", resetAt],
          },
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  );

  return record.count <= limit;
}

export function rateLimitedResponse(retryAfterSeconds = 900) {
  return Response.json(
    { error: "Too many attempts. Please wait a while and try again." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
