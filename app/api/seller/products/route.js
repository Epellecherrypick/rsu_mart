import { randomUUID } from "node:crypto";
import { getUserFromRequest, isSameOrigin } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { productSchema } from "../../../../lib/product-validation";
import {
  createDevelopmentProduct,
  isDevelopmentAuthEnabled,
  listDevelopmentProductsForShop,
} from "../../../../lib/dev-auth";
import {
  getSellerShop,
  parseEntityId,
  publicProduct,
} from "../../../../lib/shop-products";

async function getActiveSeller(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { response: Response.json({ error: "Sign in to manage products." }, { status: 401 }) };
  }
  if (user.sellerStatus !== "paid") {
    return { response: Response.json({ error: "Activate seller access before managing products." }, { status: 403 }) };
  }

  const shop = await getSellerShop(user._id);
  if (!shop) {
    return { response: Response.json({ error: "Set up your shop before adding products." }, { status: 409 }) };
  }
  return { user, shop };
}

export async function GET(request) {
  const { user, shop, response } = await getActiveSeller(request);
  if (response) return response;

  try {
    let products;
    if (isDevelopmentAuthEnabled()) {
      products = listDevelopmentProductsForShop(shop._id);
    } else {
      const database = await getDatabase();
      products = await database
        .collection("products")
        .find({ shopId: shop._id, ownerId: user._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
    }
    return Response.json({ products: products.map(publicProduct) });
  } catch (error) {
    console.error("Failed to load seller products:", error);
    return Response.json({ error: "Could not load your products right now." }, { status: 503 });
  }
}

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const { user, shop, response } = await getActiveSeller(request);
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Check your product details." },
      { status: 400 },
    );
  }

  const now = new Date();
  const product = {
    ...parsed.data,
    variants: parsed.data.variants.map((variant) => ({ ...variant, id: randomUUID() })),
    defaultVariantId: null,
    shopId: shop._id,
    ownerId: user._id,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  product.defaultVariantId = product.variants[parsed.data.defaultVariantIndex].id;

  try {
    let created;
    if (isDevelopmentAuthEnabled()) {
      created = createDevelopmentProduct(product);
    } else {
      const database = await getDatabase();
      const result = await database.collection("products").insertOne(product);
      created = { ...product, _id: result.insertedId };
    }
    return Response.json({ product: publicProduct(created) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return Response.json({ error: "Could not create this product right now." }, { status: 503 });
  }
}
