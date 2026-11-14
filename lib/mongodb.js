import { MongoClient } from "mongodb";

export async function getDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please add MONGODB_URI to your environment.");
  }

  if (!global.mongoClientPromise) {
    const client = new MongoClient(uri);
    global.mongoClientPromise = client.connect();
  }

  const connectedClient = await global.mongoClientPromise;
  const database = connectedClient.db(process.env.MONGODB_DB || "rsu_mart");

  if (!global.mongoIndexesPromise) {
    global.mongoIndexesPromise = Promise.all([
      database.collection("users").createIndex({ email: 1 }, { unique: true }),
      database
        .collection("sessions")
        .createIndex({ tokenHash: 1 }, { unique: true }),
      database
        .collection("sessions")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      database
        .collection("payments")
        .createIndex({ reference: 1 }, { unique: true }),
      database.collection("payments").createIndex(
        { userId: 1 },
        {
          unique: true,
          partialFilterExpression: { status: "pending" },
          name: "one_pending_payment_per_user",
        },
      ),
      database.collection("shops").createIndex(
        { ownerId: 1 },
        {
          unique: true,
          partialFilterExpression: { ownerId: { $type: "objectId" } },
          name: "one_shop_per_seller",
        },
      ),
      database
        .collection("rate_limits")
        .createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch((error) => {
      global.mongoIndexesPromise = undefined;
      throw error;
    });
  }

  await global.mongoIndexesPromise;
  return database;
}
