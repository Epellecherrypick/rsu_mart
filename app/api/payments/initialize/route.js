import { isSameOrigin, getUserFromRequest } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import {
  createDevelopmentPayment,
  listDevelopmentPayments,
  isDevelopmentAuthEnabled,
  updateDevelopmentPayment,
} from "../../../../lib/dev-auth";
import { checkRateLimit, rateLimitedResponse } from "../../../../lib/rate-limit";
import {
  createSellerTransferReference,
  getSellerTransferAccount,
  publicSellerPayment,
  SELLER_FEE_KOBO,
  SELLER_TRANSFER_EXPIRY_MS,
} from "../../../../lib/seller-transfer";

async function findOpenPayment(userId) {
  if (isDevelopmentAuthEnabled()) {
    const payment = listDevelopmentPayments(["pending"])
      .find((item) => item.userId === userId) || null;
    if (payment && (!payment.transferDetails || payment.expiresAt <= new Date())) {
      updateDevelopmentPayment(payment.reference, "pending", { status: "expired" });
      return null;
    }
    return payment && payment.status === "pending" && payment.expiresAt > new Date()
      ? payment
      : null;
  }
  const database = await getDatabase();
  const now = new Date();
  await database.collection("payments").updateMany(
    {
      userId,
      purpose: "seller_onboarding",
      status: "pending",
      $or: [{ expiresAt: { $lte: now } }, { transferDetails: { $exists: false } }],
    },
    { $set: { status: "expired" } },
  );
  return database.collection("payments").findOne({
    userId,
    purpose: "seller_onboarding",
    status: "pending",
    expiresAt: { $gt: now },
  });
}

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (user.sellerStatus === "paid") {
    return Response.json({ error: "Seller onboarding is already approved." }, { status: 409 });
  }
  if (!(await checkRateLimit("seller-payment", user._id.toString(), 5, 15 * 60 * 1000))) {
    return rateLimitedResponse();
  }

  const account = getSellerTransferAccount();
  if (!account) {
    return Response.json(
      { error: "Seller bank-transfer details are not configured yet. Please contact support." },
      { status: 503 },
    );
  }

  try {
    const existing = await findOpenPayment(user._id);
    if (existing) {
      return Response.json({ payment: publicSellerPayment(existing) });
    }

    const now = new Date();
    const payment = {
      reference: createSellerTransferReference(),
      userId: user._id,
      purpose: "seller_onboarding",
      amount: SELLER_FEE_KOBO,
      currency: "NGN",
      status: "pending",
      transferDetails: account,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SELLER_TRANSFER_EXPIRY_MS),
    };

    let created;
    if (isDevelopmentAuthEnabled()) {
      created = createDevelopmentPayment(payment);
    } else {
      const database = await getDatabase();
      await database.collection("payments").updateMany(
        {
          userId: user._id,
          purpose: "seller_onboarding",
          status: "pending",
          $or: [{ expiresAt: { $lte: now } }, { transferDetails: { $exists: false } }],
        },
        { $set: { status: "expired" } },
      );
      await database.collection("payments").insertOne(payment);
      created = payment;
    }
    if (!created) {
      const current = await findOpenPayment(user._id);
      if (current) return Response.json({ payment: publicSellerPayment(current) });
      throw new Error("Could not create transfer request.");
    }
    return Response.json({ payment: publicSellerPayment(created) }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      const current = await findOpenPayment(user._id);
      if (current) return Response.json({ payment: publicSellerPayment(current) });
      return Response.json({ error: "A transfer request is already being prepared. Try again shortly." }, { status: 409 });
    }
    console.error("Seller transfer request failed:", error);
    return Response.json({ error: "We couldn’t prepare your transfer details. Please try again." }, { status: 503 });
  }
}
