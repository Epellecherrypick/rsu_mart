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
      database.collection("products").createIndex(
        { shopId: 1, isActive: 1, createdAt: -1 },
        { name: "public_shop_products" },
      ),
      database.collection("products").createIndex(
        { ownerId: 1, createdAt: -1 },
        { name: "seller_products" },
      ),
      database
        .collection("rate_limits")
        .createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }),
      database.collection("password_reset_codes").createIndex(
        { email: 1 },
        { unique: true, name: "one_password_reset_code_per_email" },
      ),
      database.collection("password_reset_codes").createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: "password_reset_code_expiry" },
      ),
      database.collection("token_requests").createIndex(
        { reference: 1 },
        { unique: true, name: "unique_token_request_reference" },
      ),
      database.collection("token_requests").createIndex(
        { userId: 1, status: 1, createdAt: -1 },
        { name: "token_requests_by_user" },
      ),
      database.collection("token_ledger").createIndex(
        { reference: 1 },
        { unique: true, name: "unique_token_ledger_reference" },
      ),
      database.collection("token_ledger").createIndex(
        { userId: 1, createdAt: -1 },
        { name: "token_ledger_by_user" },
      ),
      database.collection("token_purchases").createIndex(
        { reference: 1 },
        { unique: true, name: "unique_token_purchase_reference" },
      ),
      database.collection("token_purchases").createIndex(
        { buyerId: 1, status: 1, createdAt: -1 },
        { name: "token_purchases_by_buyer" },
      ),
      database.collection("withdrawals").createIndex(
        { reference: 1 },
        { unique: true, name: "unique_token_withdrawal_reference" },
      ),
      database.collection("security_events").createIndex(
        { createdAt: -1 },
        { name: "security_events_recent" },
      ),
    ]).catch((error) => {
      global.mongoIndexesPromise = undefined;
      throw error;
    });
  }

  await global.mongoIndexesPromise;
  return database;
}
