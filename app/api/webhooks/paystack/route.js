import { hasValidPaystackSignature, confirmSellerPayment } from "../../../../lib/paystack";

export async function POST(request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");
  const body = await request.text();

  if (!hasValidPaystackSignature(body, signature, secret)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid webhook body." }, { status: 400 });
  }

  if (event.event !== "charge.success" || typeof event.data?.reference !== "string") {
    return Response.json({ received: true });
  }

  try {
    const result = await confirmSellerPayment(event.data.reference);
    if (result.state === "unconfirmed") {
      return Response.json(
        { error: "The transaction is not confirmed yet; Paystack may retry this event." },
        { status: 503 },
      );
    }
    if (result.state === "not_found") {
      return Response.json({ received: true });
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook processing failed:", error);
    return Response.json(
      { error: "Webhook processing failed; Paystack may retry this event." },
      { status: 503 },
    );
  }
}
