import { z } from "zod";
import { getUserFromRequest, isAdminUser, isSameOrigin } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import {
  getDevelopmentPayment,
  getDevelopmentUserById,
  isDevelopmentAuthEnabled,
  listDevelopmentPayments,
  updateDevelopmentPayment,
  updateDevelopmentUser,
} from "../../../../lib/dev-auth";
import { SELLER_FEE_KOBO } from "../../../../lib/seller-transfer";

const actionSchema = z.object({
  reference: z.string().regex(/^RSU-[A-F\d]{16}$/),
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(300).optional(),
});

async function requireAdmin(request) {
  const user = await getUserFromRequest(request);
  if (!user) return { response: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (!isAdminUser(user)) return { response: Response.json({ error: "Admin access is required." }, { status: 403 }) };
  return { user };
}

function serializeAdminPayment(payment, customer) {
  return {
    reference: payment.reference,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    transferDetails: payment.transferDetails,
    createdAt: payment.createdAt,
    expiresAt: payment.expiresAt,
    approvedAt: payment.approvedAt || null,
    approvedByEmail: payment.approvedByEmail || null,
    customer: customer ? { name: customer.name, email: customer.email } : null,
  };
}

export async function GET(request) {
  const { response } = await requireAdmin(request);
  if (response) return response;
  const now = new Date();

  try {
    let payments;
    if (isDevelopmentAuthEnabled()) {
      payments = listDevelopmentPayments(["pending", "expired"]);
      for (const payment of payments) {
        if (payment.status === "pending" && (!payment.transferDetails || payment.expiresAt <= now)) {
          updateDevelopmentPayment(payment.reference, "pending", { status: "expired" });
          payment.status = "expired";
        }
      }
      payments = payments.slice(0, 100).map((payment) =>
        serializeAdminPayment(payment, getDevelopmentUserById(payment.userId)),
      );
    } else {
      const database = await getDatabase();
      await database.collection("payments").updateMany(
        {
          purpose: "seller_onboarding",
          status: "pending",
          $or: [{ expiresAt: { $lte: now } }, { transferDetails: { $exists: false } }],
        },
        { $set: { status: "expired" } },
      );
      const records = await database.collection("payments")
        .find({ purpose: "seller_onboarding", status: { $in: ["pending", "expired"] } })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
      const userIds = [...new Map(records.map((record) => [record.userId.toString(), record.userId])).values()];
      const customers = await database.collection("users")
        .find({ _id: { $in: userIds } }, { projection: { name: 1, email: 1 } })
        .toArray();
      const customersById = new Map(customers.map((customer) => [customer._id.toString(), customer]));
      payments = records.map((payment) => serializeAdminPayment(
        payment,
        customersById.get(payment.userId.toString()),
      ));
    }
    return Response.json({ payments });
  } catch (error) {
    console.error("Could not load admin transfer queue:", error);
    return Response.json({ error: "Could not load transfers right now." }, { status: 503 });
  }
}

export async function PATCH(request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { user: admin, response } = await requireAdmin(request);
  if (response) return response;

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Enter a valid transfer code and action." }, { status: 400 });
  const { reference, action, reason = "" } = parsed.data;
  const now = new Date();

  try {
    let payment;
    if (isDevelopmentAuthEnabled()) {
      payment = getDevelopmentPayment(reference);
      if (payment?.status === "pending" && payment.expiresAt <= now) {
        updateDevelopmentPayment(reference, "pending", { status: "expired" });
        payment.status = "expired";
      }
      if (!payment || payment.status !== "pending") {
        return Response.json({ error: "This code is expired or has already been reviewed." }, { status: 409 });
      }
      if (payment.amount !== SELLER_FEE_KOBO || payment.currency !== "NGN" || payment.purpose !== "seller_onboarding") {
        return Response.json({ error: "This request is not a valid seller payment." }, { status: 409 });
      }
      const updates = action === "approve"
        ? { status: "paid", approvedAt: now, approvedByEmail: admin.email, approvedByUserId: admin._id }
        : { status: "rejected", rejectedAt: now, rejectedByEmail: admin.email, rejectionReason: reason || "Transfer not verified." };
      payment = updateDevelopmentPayment(reference, "pending", updates);
      if (action === "approve") updateDevelopmentUser(payment.userId, { sellerStatus: "paid", sellerPaidAt: now, sellerTestMode: false });
    } else {
      const database = await getDatabase();
      const payments = database.collection("payments");
      const current = await payments.findOne({ reference, purpose: "seller_onboarding" });
      if (!current) return Response.json({ error: "Transfer code not found." }, { status: 404 });
      if (current.status !== "pending" || current.expiresAt <= now) {
        if (current.status === "pending") await payments.updateOne({ _id: current._id, status: "pending" }, { $set: { status: "expired" } });
        return Response.json({ error: "This code is expired or has already been reviewed." }, { status: 409 });
      }
      if (current.amount !== SELLER_FEE_KOBO || current.currency !== "NGN") {
        return Response.json({ error: "This request is not a valid seller payment." }, { status: 409 });
      }
      const updates = action === "approve"
        ? { status: "paid", approvedAt: now, approvedByEmail: admin.email, approvedByUserId: admin._id }
        : { status: "rejected", rejectedAt: now, rejectedByEmail: admin.email, rejectionReason: reason || "Transfer not verified." };
      const result = await payments.updateOne({ _id: current._id, status: "pending", expiresAt: { $gt: now } }, { $set: updates });
      if (result.modifiedCount !== 1) return Response.json({ error: "This code is expired or has already been reviewed." }, { status: 409 });
      if (action === "approve") {
        await database.collection("users").updateOne(
          { _id: current.userId },
          { $set: { sellerStatus: "paid", sellerPaidAt: now, sellerTestMode: false } },
        );
      }
      payment = { ...current, ...updates };
    }
    return Response.json({ success: true, payment: serializeAdminPayment(payment, null) });
  } catch (error) {
    console.error("Could not review seller transfer:", error);
    return Response.json({ error: "Could not update this transfer right now." }, { status: 503 });
  }
}
