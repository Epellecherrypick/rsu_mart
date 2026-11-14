import { z } from "zod";
import { getUserFromRequest, isSameOrigin } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import {
  createDevelopmentShopForSeller,
  getDevelopmentShopForSeller,
  isDevelopmentAuthEnabled,
  updateDevelopmentShopForSeller,
} from "../../../../lib/dev-auth";

const serviceTypes = [
  "Food & drinks",
  "Fashion",
  "Accessories",
  "Gadgets",
  "Beauty",
  "Other services",
];
const hexColor = z.string().regex(/^#[\da-fA-F]{6}$/);
const imageUrl = z.string().trim().max(2048).refine((value) => {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Enter a valid image URL.");

const shopSchema = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.enum(serviceTypes),
  description: z.string().trim().min(10).max(500),
  bannerImage: imageUrl,
  theme: z.object({
    mode: z.enum(["solid", "gradient"]),
    accentColor: hexColor,
    gradientStart: hexColor,
    gradientEnd: hexColor,
    font: z.enum(["sans", "serif", "rounded", "mono"]),
  }),
});

function publicShop(shop) {
  if (!shop) return null;
  const { _id, ownerId, ...details } = shop;
  return { id: _id?.toString(), ...details };
}

async function getEligibleSeller(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { response: Response.json({ error: "Sign in to manage your shop." }, { status: 401 }) };
  }
  if (user.sellerStatus !== "paid") {
    return { response: Response.json({ error: "Activate seller access before setting up a shop." }, { status: 403 }) };
  }
  return { user };
}

async function findShop(sellerId) {
  if (isDevelopmentAuthEnabled()) return getDevelopmentShopForSeller(sellerId);
  const database = await getDatabase();
  return database.collection("shops").findOne({ ownerId: sellerId });
}

export async function GET(request) {
  const { user, response } = await getEligibleSeller(request);
  if (response) return response;

  try {
    return Response.json({ shop: publicShop(await findShop(user._id)) });
  } catch (error) {
    console.error("Failed to load seller shop:", error);
    return Response.json({ error: "Could not load your shop right now." }, { status: 503 });
  }
}

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const { user, response } = await getEligibleSeller(request);
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = shopSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Check your shop details." },
      { status: 400 },
    );
  }

  const now = new Date();
  const shop = {
    ...parsed.data,
    image: parsed.data.bannerImage || null,
    isOpen: true,
    dailyOrders: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    if (await findShop(user._id)) {
      return Response.json({ error: "You can create only one shop. Edit your existing shop instead." }, { status: 409 });
    }

    let created;
    if (isDevelopmentAuthEnabled()) {
      created = createDevelopmentShopForSeller(user._id, shop);
    } else {
      const database = await getDatabase();
      const result = await database.collection("shops").insertOne({ ...shop, ownerId: user._id });
      created = { ...shop, _id: result.insertedId };
    }

    if (!created) {
      return Response.json({ error: "You can create only one shop. Edit your existing shop instead." }, { status: 409 });
    }
    return Response.json({ shop: publicShop(created) }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json({ error: "You can create only one shop. Edit your existing shop instead." }, { status: 409 });
    }
    console.error("Failed to create seller shop:", error);
    return Response.json({ error: "Could not create your shop right now." }, { status: 503 });
  }
}

export async function PATCH(request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const { user, response } = await getEligibleSeller(request);
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = shopSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Check your shop details." },
      { status: 400 },
    );
  }

  const updates = {
    ...parsed.data,
    image: parsed.data.bannerImage || null,
    updatedAt: new Date(),
  };
  try {
    let updated;
    if (isDevelopmentAuthEnabled()) {
      updated = updateDevelopmentShopForSeller(user._id, updates);
    } else {
      const database = await getDatabase();
      const shops = database.collection("shops");
      const result = await shops.updateOne({ ownerId: user._id }, { $set: updates });
      if (result.matchedCount) updated = await shops.findOne({ ownerId: user._id });
    }
    if (!updated) {
      return Response.json({ error: "Create your shop before saving changes." }, { status: 404 });
    }
    return Response.json({ shop: publicShop(updated) });
  } catch (error) {
    console.error("Failed to update seller shop:", error);
    return Response.json({ error: "Could not save your shop right now." }, { status: 503 });
  }
}
