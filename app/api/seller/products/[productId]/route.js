import { randomUUID } from "node:crypto";
import { getUserFromRequest, isSameOrigin } from "../../../../../lib/auth";
import { getDatabase } from "../../../../../lib/mongodb";
import { productSchema } from "../../../../../lib/product-validation";
import {
  deleteDevelopmentProduct,
  getDevelopmentProductForSeller,
  isDevelopmentAuthEnabled,
  updateDevelopmentProduct,
} from "../../../../../lib/dev-auth";
import {
  getSellerShop,
  parseEntityId,
  publicProduct,
} from "../../../../../lib/shop-products";

async function getSellerAndShop(request) {
  const user = await getUserFromRequest(request);
  if (!user) return { response: Response.json({ error: "Sign in to manage products." }, { status: 401 }) };
  if (user.sellerStatus !== "paid") {
    return { response: Response.json({ error: "Activate seller access before managing products." }, { status: 403 }) };
  }
  const shop = await getSellerShop(user._id);
  if (!shop) return { response: Response.json({ error: "Set up your shop before managing products." }, { status: 409 }) };
  return { user, shop };
}

export async function PATCH(request, context) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const { user, shop, response } = await getSellerAndShop(request);
  if (response) return response;

  const { productId } = await context.params;
  const id = parseEntityId(productId);
  if (!id) return Response.json({ error: "Product not found." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Check your product details." }, { status: 400 });
  }

  const variants = parsed.data.variants.map((variant) => ({ ...variant, id: randomUUID() }));
  const updates = {
    ...parsed.data,
    variants,
    defaultVariantId: variants[parsed.data.defaultVariantIndex].id,
    updatedAt: new Date(),
  };
  try {
    let updated;
    if (isDevelopmentAuthEnabled()) {
      const current = getDevelopmentProductForSeller(id, user._id);
      if (current?.shopId === shop._id) updated = updateDevelopmentProduct(id, user._id, updates);
    } else {
      const database = await getDatabase();
      const products = database.collection("products");
      const result = await products.updateOne(
        { _id: id, shopId: shop._id, ownerId: user._id },
        { $set: updates },
      );
      if (result.matchedCount) updated = await products.findOne({ _id: id });
    }
    if (!updated) return Response.json({ error: "Product not found." }, { status: 404 });
    return Response.json({ product: publicProduct(updated) });
  } catch (error) {
    console.error("Failed to update product:", error);
    return Response.json({ error: "Could not save this product right now." }, { status: 503 });
  }
}

export async function DELETE(request, context) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const { user, shop, response } = await getSellerAndShop(request);
  if (response) return response;

  const { productId } = await context.params;
  const id = parseEntityId(productId);
  if (!id) return Response.json({ error: "Product not found." }, { status: 404 });

  try {
    let deleted = false;
    if (isDevelopmentAuthEnabled()) {
      const product = getDevelopmentProductForSeller(id, user._id);
      if (product?.shopId === shop._id) deleted = deleteDevelopmentProduct(id, user._id);
    } else {
      const database = await getDatabase();
      const result = await database.collection("products").deleteOne({
        _id: id,
        shopId: shop._id,
        ownerId: user._id,
      });
      deleted = result.deletedCount === 1;
    }
    if (!deleted) return Response.json({ error: "Product not found." }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return Response.json({ error: "Could not remove this product right now." }, { status: 503 });
  }
}
