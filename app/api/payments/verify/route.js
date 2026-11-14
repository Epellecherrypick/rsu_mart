import { getUserFromRequest } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { getDevelopmentPayment, isDevelopmentAuthEnabled, updateDevelopmentPayment } from "../../../../lib/dev-auth";
import { publicSellerPayment } from "../../../../lib/seller-transfer";

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to check your transfer." }, { status: 401 });

  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference || !/^RSU-[A-F\d]{16}$/.test(reference)) {
    return Response.json({ error: "Missing or invalid transfer code." }, { status: 400 });
  }

  try {
    let payment;
    if (isDevelopmentAuthEnabled()) {
      payment = getDevelopmentPayment(reference, user._id);
      if (payment?.status === "pending" && payment.expiresAt <= new Date()) {
        payment = updateDevelopmentPayment(reference, "pending", { status: "expired" });
      }
    } else {
      const database = await getDatabase();
      payment = await database.collection("payments").findOne({
        reference,
        userId: user._id,
        purpose: "seller_onboarding",
      });
      if (payment?.status === "pending" && payment.expiresAt <= new Date()) {
        await database.collection("payments").updateOne(
          { _id: payment._id, status: "pending" },
          { $set: { status: "expired" } },
        );
        payment.status = "expired";
      }
    }
    if (!payment) return Response.json({ error: "This transfer code does not belong to your account." }, { status: 404 });
    return Response.json({ payment: publicSellerPayment(payment) });
  } catch (error) {
    console.error("Could not load seller transfer status:", error);
    return Response.json({ error: "We couldn’t check the transfer right now." }, { status: 503 });
  }
}
