import assert from "node:assert/strict";
import test from "node:test";
import { productSchema } from "../lib/product-validation.js";

const validProduct = {
  name: "Campus backpack",
  description: "Durable everyday backpack.",
  priceKobo: 2500000,
  variants: [
    { color: "Forest green", imageUrl: "https://example.com/green.jpg", inventory: 4 },
    { color: "Black", imageUrl: "https://example.com/black.jpg", inventory: 2 },
  ],
  defaultVariantIndex: 1,
};

test("product schema accepts valid price, stock, and default variant", () => {
  assert.equal(productSchema.safeParse(validProduct).success, true);
});

test("product schema requires a unique color name and valid HTTPS image for every variant", () => {
  const duplicateColors = {
    ...validProduct,
    variants: [validProduct.variants[0], { ...validProduct.variants[1], color: "forest GREEN" }],
  };
  assert.equal(productSchema.safeParse(duplicateColors).success, false);

  const insecureImage = {
    ...validProduct,
    variants: [{ ...validProduct.variants[0], imageUrl: "http://example.com/green.jpg" }],
    defaultVariantIndex: 0,
  };
  assert.equal(productSchema.safeParse(insecureImage).success, false);
});

test("product schema rejects a default variant index that does not exist", () => {
  assert.equal(productSchema.safeParse({ ...validProduct, defaultVariantIndex: 2 }).success, false);
});
