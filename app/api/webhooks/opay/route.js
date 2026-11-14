import {
  confirmSellerPayment,
  hasValidOpayCallbackSignature,
} from "../../../../lib/opay";

export async function POST(request) {
  const secret = process.env.OPAY_SECRET_KEY;
  const body = await request.text();

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid webhook body." }, { status: 400 });
  }

  if (
    !event ||
    typeof event !== "object" ||
    event.type !== "transaction-status" ||
    !hasValidOpayCallbackSignature(event.payload, event.sha512, secret)
  ) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  if (
    event.payload.status !== "SUCCESS" ||
    typeof event.payload.reference !== "string"
  ) {
    return Response.json({ received: true });
  }

  try {
    const result = await confirmSellerPayment(event.payload.reference);
    if (result.state === "unconfirmed") {
      return Response.json(
        { error: "The transaction is not confirmed yet; OPay may retry this event." },
        { status: 503 },
      );
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("OPay webhook processing failed:", error);
    return Response.json(
      { error: "Webhook processing failed; OPay may retry this event." },
      { status: 503 },
    );
  }
}
