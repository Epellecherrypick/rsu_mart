import { getUserFromRequest, publicUser } from "../../../../lib/auth";
import { isSameOrigin } from "../../../../lib/auth";
import { z } from "zod";
import { getDatabase } from "../../../../lib/mongodb";
import { isDevelopmentAuthEnabled, updateDevelopmentUser } from "../../../../lib/dev-auth";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  preferences: z.object({
    categories: z.array(z.enum(["Food & drinks", "Fashion", "Accessories", "Gadgets", "Beauty"])).max(5),
    campusLocation: z.string().trim().min(2).max(80),
  }),
});

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ user: null }, { status: 401 });
  }

  return Response.json({ user: publicUser(user) });
}

export async function PATCH(request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to update your profile." }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Check your profile details." }, { status: 400 });
  }
  const updates = { name: parsed.data.name, preferences: {
    categories: [...new Set(parsed.data.preferences.categories)],
    campusLocation: parsed.data.preferences.campusLocation,
  } };
  let updated;
  if (isDevelopmentAuthEnabled()) {
    updated = updateDevelopmentUser(user._id, updates);
  } else {
    const database = await getDatabase();
    await database.collection("users").updateOne({ _id: user._id }, { $set: updates });
    updated = { ...user, ...updates };
  }
  return Response.json({ user: publicUser(updated) });
}
