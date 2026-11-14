export async function POST(request) {
  await request.text();
  return Response.json({ received: true, ignored: true });
}
