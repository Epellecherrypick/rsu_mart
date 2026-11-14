import { getProductsForShop, getShopById, publicProduct, publicShop } from "../../../../lib/shop-products";

export async function GET(_request, context) {
  const { shopId } = await context.params;
  try {
    const shop = await getShopById(shopId);
    if (!shop) return Response.json({ error: "Shop not found." }, { status: 404 });
    const products = await getProductsForShop(shop._id);
    return Response.json({
      shop: publicShop(shop),
      products: products.map(publicProduct),
    });
  } catch (error) {
    console.error("Failed to load public shop:", error);
    return Response.json({ error: "Could not load this shop right now." }, { status: 503 });
  }
}
