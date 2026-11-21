import { getUserFromRequest } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { isDevelopmentAuthEnabled } from "../../../../lib/dev-auth";

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (isDevelopmentAuthEnabled()) return Response.json({ balance: Number(user.tokenBalance || 0) });
  const database = await getDatabase();
  const current = await database.collection("users").findOne({ _id: user._id }, { projection: { tokenBalance: 1 } });
  return Response.json({ balance: Number(current?.tokenBalance || 0) });
}
