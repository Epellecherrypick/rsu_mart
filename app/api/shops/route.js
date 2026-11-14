import { getDatabase } from "../../../lib/mongodb";

export async function GET() {
  try {
    const database = await getDatabase();
    const shops = await database
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

    return Response.json(
      shops.map(({ _id, ...shop }) => ({
        id: _id.toString(),
        ...shop,
        slug: ({
          "food & drinks": "food",
          fashion: "fashion",
          accessories: "accessories",
          gadgets: "gadgets",
          beauty: "beauty",
        }[String(shop.category || "").trim().toLowerCase()] || String(shop.category || "other")
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")),
      })),
    );
  } catch (error) {
    console.error("Failed to load shops:", error);
    return Response.json(
      { error: "Shops could not be loaded. Check the MongoDB connection." },
      { status: 503 },
    );
  }
}
