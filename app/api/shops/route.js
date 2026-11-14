import { getDatabase } from "../../../lib/mongodb";
import {
  isDevelopmentAuthEnabled,
  listDevelopmentShops,
} from "../../../lib/dev-auth";

function publicShop({ _id, ownerId, ...shop }) {
  const category = String(shop.category || "").trim().toLowerCase();
  const slug = ({
    "food & drinks": "food",
    fashion: "fashion",
    accessories: "accessories",
    gadgets: "gadgets",
    beauty: "beauty",
  }[category] || String(shop.category || "other")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, ""));

  return { id: _id.toString(), ...shop, slug };
}

export async function GET() {
  try {
    let shops;
    if (isDevelopmentAuthEnabled()) {
      shops = listDevelopmentShops()
        .filter((shop) => shop.isOpen)
        .sort((a, b) => (b.dailyOrders || 0) - (a.dailyOrders || 0))
        .slice(0, 50);
    } else {
      const database = await getDatabase();
      shops = await database
        .collection("shops")
        .find(
          { isOpen: true },
          {
            projection: {
              name: 1,
              category: 1,
              keywords: 1,
              description: 1,
              image: 1,
              bannerImage: 1,
              theme: 1,
              rating: 1,
              dailyOrders: 1,
              deliveryEstimate: 1,
              isOpen: 1,
            },
          },
        )
        .sort({ dailyOrders: -1 })
        .limit(50)
        .toArray();
    }

    return Response.json(shops.map(publicShop));
  } catch (error) {
    console.error("Failed to load shops:", error);
    return Response.json(
      { error: "Shops could not be loaded. Check the MongoDB connection." },
      { status: 503 },
    );
  }
}
