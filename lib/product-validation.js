import { z } from "zod";

const imageUrl = z.string().trim().max(2048).refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Each product color needs a valid HTTPS image URL.");

export const productSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5).max(1000),
  priceKobo: z.number().int().min(1).max(100_000_000),
  variants: z.array(z.object({
    color: z.string().trim().min(1).max(40),
    imageUrl,
    inventory: z.number().int().min(0).max(1_000_000),
  })).min(1).max(12),
  defaultVariantIndex: z.number().int().min(0).max(11),
  discountPercent: z.number().int().min(0).max(90).optional().default(0),
  discountType: z.enum(["universal", "individual"]).optional().default("universal"),
  discountUserId: z.string().trim().max(100).optional().nullable().default(null),
  discountEndsAt: z.string().datetime({ offset: true }).optional().nullable().default(null),
}).superRefine((product, context) => {
  if (product.defaultVariantIndex >= product.variants.length) {
    context.addIssue({
      code: "custom",
      path: ["defaultVariantIndex"],
      message: "Choose a default color from the colors you added.",
    });
  }
  const colors = product.variants.map((variant) => variant.color.toLowerCase());
  if (new Set(colors).size !== colors.length) {
    context.addIssue({
      code: "custom",
      path: ["variants"],
      message: "Each product color must have a unique name.",
    });
  }
});
