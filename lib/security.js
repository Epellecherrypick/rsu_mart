import { getDatabase } from "./mongodb";
import { isDevelopmentAuthEnabled } from "./dev-auth";
import { checkRateLimit, rateLimitedResponse } from "./rate-limit";

const CRAWLER_PATTERNS = [
  /katana/i,
  /sqlmap/i,
  /nikto/i,
  /nuclei/i,
  /masscan/i,
  /python-requests/i,
  /scrapy/i,
  /crawler/i,
  /spider/i,
];

export function isSuspiciousRequest(request) {
  const userAgent = request.headers.get("user-agent") || "";
  return CRAWLER_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export async function inspectRequest(request, scope, identifier, limit, windowMs) {
  if (isSuspiciousRequest(request)) {
    await logSecurityEvent({
      type: "crawler_blocked",
      scope,
      identifier,
      userAgent: request.headers.get("user-agent") || "",
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    });
    return Response.json(
      { error: "Automated traffic is not allowed." },
      { status: 403 },
    );
  }
  if (!(await checkRateLimit(scope, identifier, limit, windowMs))) {
    await logSecurityEvent({ type: "rate_limit", scope, identifier });
    return rateLimitedResponse(Math.ceil(windowMs / 1000));
  }
  return null;
}

export async function logSecurityEvent(event) {
  const record = { ...event, createdAt: new Date() };
  try {
    if (isDevelopmentAuthEnabled()) {
      const stateKey = "__rsuMartDevelopmentAuth";
      globalThis[stateKey]?.securityEvents.push(record);
    } else {
      const database = await getDatabase();
      await database.collection("security_events").insertOne(record);
    }
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}
