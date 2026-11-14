import { randomUUID } from "node:crypto";
import { isSameOrigin, getUserFromRequest } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import {
  createOpayCashierPayment,
  getOpayConfig,
  SELLER_FEE_KOBO,
} from "../../../../lib/opay";
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
  if (!getOpayConfig()) {
    return Response.json(
      { error: "OPay seller payments are not configured yet. Please try again later." },
      { status: 503 },
    );
  }

  let siteUrl;
  try {
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL) {
      throw new Error("Production site URL must be configured.");
    }
    siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url);
    if (process.env.NODE_ENV === "production" && siteUrl.protocol !== "https:") {
      throw new Error("Production site URL must use HTTPS.");
    }
  } catch (error) {
    console.error("Invalid site URL for OPay callback:", error);
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
    const cashierUrl = await createOpayCashierPayment({
      reference,
      returnUrl: new URL(
        `/seller/payment/verify?reference=${encodeURIComponent(reference)}`,
        siteUrl,
      ).toString(),
      callbackUrl: new URL("/api/webhooks/opay", siteUrl).toString(),
      user,
    });
    return Response.json({ authorizationUrl: cashierUrl });
  } catch (error) {
    await database
      .collection("payments")
      .updateOne({ reference, status: "pending" }, { $set: { status: "failed" } });
    console.error("OPay initialization failed:", error);
    return Response.json(
      { error: "We couldn’t start the payment. Please try again." },
      { status: 502 },
    );
  }
}
