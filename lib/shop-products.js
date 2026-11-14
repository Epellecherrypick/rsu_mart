import { ObjectId } from "mongodb";
import { getDatabase } from "./mongodb.js";
import {
  getDevelopmentShopForSeller,
  isDevelopmentAuthEnabled,
  listDevelopmentShops,
  listDevelopmentProductsForShop,
} from "./dev-auth.js";

export async function getSellerShop(sellerId) {
  if (isDevelopmentAuthEnabled()) return getDevelopmentShopForSeller(sellerId);
  const database = await getDatabase();
  return database.collection("shops").findOne({ ownerId: sellerId });
}

export async function getShopById(shopId) {
  if (isDevelopmentAuthEnabled()) {
    return listDevelopmentShops().find((shop) => shop._id === shopId && shop.isOpen) || null;
  }
  if (!ObjectId.isValid(shopId)) return null;
  const database = await getDatabase();
  return database.collection("shops").findOne({
    _id: new ObjectId(shopId),
    isOpen: true,
  });
}

export async function getProductsForShop(shopId) {
  if (isDevelopmentAuthEnabled()) return listDevelopmentProductsForShop(shopId);
  const database = await getDatabase();
  return database
    .collection("products")
    .find({ shopId, isActive: true })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
}

export function parseEntityId(value) {
  if (isDevelopmentAuthEnabled()) return value || null;
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export function publicProduct(product) {
  if (!product) return null;
  const { _id, shopId, ownerId, ...details } = product;
  return {
    id: _id.toString(),
    ...details,
  };
}

export function publicShop(shop) {
  if (!shop) return null;
  const { _id, ownerId, ...details } = shop;
  return { id: _id.toString(), ...details };
}
