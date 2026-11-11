import { randomUUID } from "node:crypto";
import { isSameOrigin, getUserFromRequest } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { SELLER_FEE_KOBO } from "../../../../lib/paystack";
import { checkRateLimit, rateLimitedResponse } from "../../../../lib/rate-limit";

const PAYMENT_EXPIRY_MS = 30 * 60 * 1000;

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (user.sellerStatus === "paid") {
    return Response.json({ error: "Seller onboarding is already paid." }, { status: 409 });
  }
  if (!(await checkRateLimit("seller-payment", user._id.toString(), 5, 15 * 60 * 1000))) {
    return rateLimitedResponse();
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return Response.json(
      { error: "Seller payments are not configured yet. Please try again later." },
      { status: 503 },
    );
  }

  let callbackUrl;
  try {
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL) {
      throw new Error("Production site URL must be configured.");
    }
    const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url);
    if (process.env.NODE_ENV === "production" && siteUrl.protocol !== "https:") {
      throw new Error("Production site URL must use HTTPS.");
    }
    callbackUrl = new URL("/seller/payment/verify", siteUrl).toString();
  } catch (error) {
    console.error("Invalid site URL for Paystack callback:", error);
    return Response.json(
      { error: "Seller payments are not configured correctly. Please contact support." },
      { status: 503 },
    );
  }

  const database = await getDatabase();
  await database.collection("payments").updateMany(
    { userId: user._id, status: "pending", expiresAt: { $lte: new Date() } },
    { $set: { status: "expired" } },
  );
  const existing = await database.collection("payments").findOne({
    userId: user._id,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
  if (existing) {
    return Response.json(
      { error: "You already have a payment in progress. Complete it or try again later." },
      { status: 409 },
    );
  }

  const reference = `rsu_${randomUUID().replaceAll("-", "")}`;
  const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MS);
  try {
    await database.collection("payments").insertOne({
      reference,
      userId: user._id,
      purpose: "seller_onboarding",
      amount: SELLER_FEE_KOBO,
      currency: "NGN",
      status: "pending",
      createdAt: new Date(),
      expiresAt,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        { error: "You already have a payment in progress. Complete it or try again later." },
        { status: 409 },
      );
    }
    throw error;
  }

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: SELLER_FEE_KOBO,
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: {
          purpose: "seller_onboarding",
          userId: user._id.toString(),
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json();

    if (
      !response.ok ||
      result.status !== true ||
      typeof result.data?.authorization_url !== "string" ||
      new URL(result.data.authorization_url).origin !== "https://checkout.paystack.com"
    ) {
      await database
        .collection("payments")
        .updateOne({ reference, status: "pending" }, { $set: { status: "failed" } });
      console.error("Paystack initialization was rejected:", result.message || response.status);
      return Response.json(
        { error: "We couldn’t start the payment. Please try again." },
        { status: 502 },
      );
    }

    return Response.json({ authorizationUrl: result.data.authorization_url });
  } catch (error) {
    await database
      .collection("payments")
      .updateOne({ reference, status: "pending" }, { $set: { status: "failed" } });
    console.error("Paystack initialization failed:", error);
    return Response.json(
      { error: "We couldn’t reach the payment provider. Please try again." },
      { status: 502 },
    );
  }
}
