import { getUserFromRequest, isAdminUser, isAllowlistedAdminEmail, isSameOrigin, publicUser, verifyAdminSetupToken } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { isDevelopmentAuthEnabled, updateDevelopmentUser } from "../../../../lib/dev-auth";

export async function POST(request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (!isAllowlistedAdminEmail(user.email)) return Response.json({ error: "This account is not allowlisted for admin access." }, { status: 403 });
  if (isAdminUser(user)) return Response.json({ user: publicUser(user) });

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!verifyAdminSetupToken(body?.setupToken)) {
    return Response.json({ error: "The private admin setup code is not valid." }, { status: 403 });
  }

  let updated;
  if (isDevelopmentAuthEnabled()) {
    updated = updateDevelopmentUser(user._id, { adminAccess: true });
  } else {
    const database = await getDatabase();
    await database.collection("users").updateOne({ _id: user._id }, { $set: { adminAccess: true } });
    updated = { ...user, adminAccess: true };
  }
  return Response.json({ user: publicUser(updated) });
}
