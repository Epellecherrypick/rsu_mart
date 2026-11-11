import { getUserFromRequest } from "../../../../lib/auth";
import { confirmSellerPayment } from "../../../../lib/paystack";
import { checkRateLimit, rateLimitedResponse } from "../../../../lib/rate-limit";

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Sign in to verify your payment." }, { status: 401 });
  }

  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference || reference.length > 100) {
    return Response.json({ error: "Missing or invalid payment reference." }, { status: 400 });
  }
  if (!(await checkRateLimit("payment-verify", user._id.toString(), 30, 15 * 60 * 1000))) {
    return rateLimitedResponse();
  }

  try {
    const result = await confirmSellerPayment(reference, user._id);
    if (result.state === "paid") {
      return Response.json({ status: "paid" });
    }
    if (result.state === "not_found") {
      return Response.json({ error: "This payment does not belong to your account." }, { status: 404 });
    }
    if (result.state === "expired") {
      return Response.json(
        { error: "This payment link has expired. Start a new payment from your seller page." },
        { status: 410 },
      );
    }

    return Response.json(
      { error: "Payment is not confirmed yet. If you were charged, wait a moment and try again." },
      { status: 409 },
    );
  } catch (error) {
    console.error("Seller payment verification failed:", error);
    return Response.json(
      { error: "We couldn’t verify the payment right now. Please try again shortly." },
      { status: 503 },
    );
  }
}
