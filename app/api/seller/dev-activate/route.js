import { getUserFromRequest, isSameOrigin, publicUser } from "../../../../lib/auth";
import {
  activateDevelopmentSeller,
  isDevelopmentAuthEnabled,
} from "../../../../lib/dev-auth";

export async function POST(request) {
  if (!isDevelopmentAuthEnabled()) {
    return new Response(null, { status: 404 });
  }
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Sign in to activate a test seller account." }, { status: 401 });
  }

  const updatedUser = activateDevelopmentSeller(user._id);
  if (!updatedUser) {
    return Response.json({ error: "Could not activate the test seller account." }, { status: 404 });
  }

  return Response.json({ user: publicUser(updatedUser) });
}
